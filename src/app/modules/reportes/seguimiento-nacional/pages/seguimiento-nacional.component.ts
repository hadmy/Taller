import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { BarChartComponent } from '../../../../shared/ui/bar-chart/bar-chart.component';
import { DonutChartComponent } from '../../../../shared/ui/donut-chart/donut-chart.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ChartSectionComponent } from '../../../../shared/ui/chart-section/chart-section.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { KpiCardComponent, KpiCardTone } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { LineChartComponent } from '../../../../shared/ui/line-chart/line-chart.component';
import { MessageBoxComponent } from '../../../../shared/ui/message-box/message-box.component';
import { StatusTagComponent, StatusTagTone } from '../../../../shared/ui/status-tag/status-tag.component';
import { TabItem, TabsComponent } from '../../../../shared/ui/tabs/tabs.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { SeguimientoNacionalApiService } from '../api/seguimiento-nacional-api.service';
import { SeguimientoEntidadComponent } from './seguimiento-entidad.component';
import { SEGUIMIENTO_NACIONAL_PROCESS_ID, SEGUIMIENTO_NACIONAL_ROUTE } from '../config/seguimiento-nacional.rutas';
import {
  DEPARTAMENTOS,
  ESTADOS_ANEXO_02,
  ESTADO_APROBADO,
  EntidadSeguimiento,
  EstadoAnexo02,
  NIVELES_GOBIERNO,
  ORDENES_PRELACION,
  PERIODOS_SEGUIMIENTO,
  SeguimientoNacional,
} from '../models/seguimiento-nacional.model';
import {
  ClaveSeleccion,
  FiltrosCombos,
  SeleccionVisual,
  ampliacionesPorEstado,
  aprobadosPorDepartamento,
  avanceAcumulado,
  contarEstados,
  diasEntre,
  estadosPorNivel,
  fechaFinEntidad,
  fechaVisible,
  filtrarEntidades,
  formatoEntero,
  formatoMonto,
  montoPorPrelacion,
  porcentaje,
  porcentajeVisible,
} from '../utils/seguimiento-nacional.util';

/** Valor de «Todos» en los combos. */
const TODOS = 'todos';
const TONO_ESTADO: StatusTagTone[] = ['default', 'info', 'warning', 'success'];

type ClaveOrden = 'codigo' | 'nombre' | 'nivel' | 'departamento' | 'estado' | 'avanceAnexos01' | 'monto' | 'fechaFin' | 'dias';

interface FilaDetalle {
  codigo: string;
  nombre: string;
  nivel: string;
  departamento: string;
  estado: EstadoAnexo02;
  anexos01: string;
  avanceAnexos01: number;
  monto: number;
  fechaFin: string;
  ampliada: boolean;
  /** Días que faltan para la fecha fin; con el Anexo N.º 02 aprobado no cuenta (va al final al ordenar). */
  dias: number;
}

interface Kpi {
  title: string;
  amount: string;
  progress: number;
  description: string;
  tone: KpiCardTone;
  icon: string;
}

/**
 * «Seguimiento nacional del CMN Programación» (consulta de la DPLAIP), en Reportes: cómo avanzan las Entidades del país
 * en la fase elegida. Arriba, los combos del Clasificador Institucional y del estado del Anexo N.º 02; debajo, cinco
 * KPI, el estado por nivel de gobierno, el avance acumulado, el monto por orden de prelación, las ampliaciones de
 * plazo, el % aprobado por departamento y el detalle por Entidad. Es interactivo: un clic en un tramo, una barra o una
 * fila filtra todo el informe, y los «Filtros por selección» lo muestran como chips que se quitan. La pestaña «Resumen
 * de la Entidad» muestra `siaf-seguimiento-entidad`: el mismo seguimiento dentro de una Entidad, por área usuaria.
 */
@Component({
  selector: 'siaf-seguimiento-nacional',
  standalone: true,
  imports: [
    BarChartComponent,
    ButtonComponent,
    ChartSectionComponent,
    DonutChartComponent,
    FormTableSearchComponent,
    IconComponent,
    KpiCardComponent,
    LineChartComponent,
    MessageBoxComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    SeguimientoEntidadComponent,
    StatusTagComponent,
    TabsComponent,
    TagComponent,
    TextFieldComponent,
  ],
  templateUrl: './seguimiento-nacional.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoNacionalComponent implements OnInit {
  private readonly api = inject(SeguimientoNacionalApiService);

  /** Pestañas: el tablero nacional (DPLAIP) y el de la Entidad (`siaf-seguimiento-entidad`). */
  readonly pestanas: TabItem[] = [
    { id: 'nacional', label: 'Resumen nacional' },
    { id: 'entidad', label: 'Resumen de la Entidad' },
  ];
  readonly pestana = signal('nacional');

  readonly breadcrumbs = buildProcessBreadcrumbs(SEGUIMIENTO_NACIONAL_PROCESS_ID, SEGUIMIENTO_NACIONAL_ROUTE);
  readonly estados = ESTADOS_ANEXO_02;
  readonly tonoEstado = TONO_ESTADO;
  readonly TODOS = TODOS;

  readonly datos = signal<SeguimientoNacional | null>(null);
  readonly cargando = signal(false);

  // ── Combos ──
  readonly periodo = signal<string>(PERIODOS_SEGUIMIENTO[0].valor);
  readonly fase = signal<number>(PERIODOS_SEGUIMIENTO[0].faseVigente);
  readonly combos = signal<FiltrosCombos>({ nivel: '', subgrupo: '', area: '', departamento: '', estado: '' });
  readonly seleccion = signal<SeleccionVisual>({});

  readonly opcionesPeriodo: TextFieldOption[] = PERIODOS_SEGUIMIENTO.map((p) => ({ label: p.etiqueta, value: p.valor }));
  readonly opcionesFase: TextFieldOption[] = [1, 2, 3].map((n) => ({
    label: `Fase ${n}: ${['Identificación', 'Clasificación y Priorización', 'Consolidación y Aprobación'][n - 1]}`,
    value: String(n),
  }));
  private readonly conTodos = (valores: readonly string[]): TextFieldOption[] => [
    { label: 'Todos', value: TODOS },
    ...valores.map((v) => ({ label: v, value: v })),
  ];
  readonly opcionesNivel = this.conTodos(NIVELES_GOBIERNO);
  readonly opcionesDepartamento = this.conTodos(DEPARTAMENTOS);
  readonly opcionesEstado: TextFieldOption[] = [{ label: 'Todos', value: TODOS }, ...ESTADOS_ANEXO_02.map((e, i) => ({ label: e, value: String(i) }))];
  readonly opcionesSubgrupo = computed(() => this.conTodos(unicos(this.datos()?.entidades.map((e) => e.subgrupo) ?? [])));
  readonly opcionesArea = computed(() => this.conTodos(unicos(this.datos()?.entidades.map((e) => e.area) ?? [])));

  /** Valor del combo: «Todos» cuando el filtro está vacío. */
  valorCombo(clave: keyof FiltrosCombos): string {
    return this.combos()[clave] || TODOS;
  }

  // ── Fase y fechas ──
  readonly faseRectora = computed(() => this.datos()?.fases.find((f) => f.numero === this.datos()!.fase) ?? null);
  readonly subtitulo = computed(() => {
    const datos = this.datos();
    const fase = this.faseRectora();
    if (!datos || !fase) return 'Consulta de la DPLAIP';
    return `Consulta de la DPLAIP · Fecha de corte de datos: ${fechaVisible(datos.fechaCorte)} · Fase ${fase.numero}: ${fechaVisible(fase.inicio)} al ${fechaVisible(fase.fin)}`;
  });

  private filtradas(ignorar: ClaveSeleccion[] = []): EntidadSeguimiento[] {
    return filtrarEntidades(this.datos()?.entidades ?? [], this.combos(), this.seleccion(), ignorar);
  }

  readonly entidades = computed(() => this.filtradas());

  // ── KPI ──
  readonly kpis = computed<Kpi[]>(() => {
    const todas = this.entidades();
    const datos = this.datos();
    const fase = this.faseRectora();
    if (!datos || !fase) return [];
    const n = todas.length;
    const [sinIniciar, enElaboracion, enEvaluacion, aprobadas] = contarEstados(todas);
    const conEtapas = Math.round(n * 0.978);
    const largo = diasEntre(fase.inicio, fase.fin);
    const transcurridos = Math.min(largo, Math.max(0, diasEntre(fase.inicio, datos.fechaCorte)));
    const iniciada = diasEntre(fase.inicio, datos.fechaCorte) >= 0;
    const restantes = Math.max(0, diasEntre(datos.fechaCorte, fase.fin));
    return [
      {
        title: 'Entidades que programan',
        amount: formatoEntero(n),
        progress: porcentaje(conEtapas, n),
        description: `Con fechas de etapas configuradas: ${formatoEntero(conEtapas)}`,
        tone: 'informative',
        icon: 'account_balance',
      },
      {
        title: 'Anexo N.º 02 aprobado',
        amount: formatoEntero(aprobadas),
        progress: porcentaje(aprobadas, n),
        description: `${porcentajeVisible(aprobadas, n)} de las Entidades`,
        tone: 'success',
        icon: 'task_alt',
      },
      {
        title: 'Anexo N.º 02 en evaluación',
        amount: formatoEntero(enEvaluacion),
        progress: porcentaje(enEvaluacion, n),
        description: 'Verificado o validado, sin aprobar',
        tone: 'informative',
        icon: 'pending_actions',
      },
      {
        title: 'Sin iniciar o en elaboración',
        amount: formatoEntero(sinIniciar + enElaboracion),
        progress: porcentaje(sinIniciar + enElaboracion, n),
        description: `${formatoEntero(sinIniciar)} sin iniciar · ${formatoEntero(enElaboracion)} en elaboración`,
        tone: 'warning',
        icon: 'hourglass_empty',
      },
      {
        title: 'Días para la fecha fin rectora',
        amount: !iniciada ? '–' : restantes > 0 ? formatoEntero(restantes) : 'Cerrada',
        progress: porcentaje(transcurridos, largo),
        description: `Fecha fin Fase ${fase.numero}: ${fechaVisible(fase.fin)}`,
        tone: 'danger',
        icon: 'event',
      },
    ];
  });

  // ── Estado por nivel de gobierno (barras apiladas) ──
  readonly porNivel = computed(() => estadosPorNivel(this.filtradas(['nivel', 'estado'])));
  readonly nivelCategorias = computed(() => this.porNivel().map((f) => f.nivel));
  readonly nivelSeries = computed(() => ESTADOS_ANEXO_02.map((estado, i) => ({ name: estado, values: this.porNivel().map((f) => f.conteo[i]) })));
  readonly nivelSeleccionado = computed(() => {
    const nivel = this.seleccion().nivel;
    return nivel ? this.nivelCategorias().indexOf(nivel) : null;
  });

  elegirTramoNivel(evento: { category: number; series: number } | null): void {
    const categoria = evento ? this.nivelCategorias()[evento.category] : undefined;
    const esTotal = categoria === 'Total';
    const actual = this.seleccion();
    const estado = evento?.series as EstadoAnexo02 | undefined;
    const igual = !!evento && actual.estado === estado && (esTotal ? !actual.nivel : actual.nivel === categoria);
    this.seleccion.update((s) => {
      const resto: SeleccionVisual = { ...s };
      delete resto.nivel;
      delete resto.estado;
      if (!evento || igual) return resto;
      return { ...resto, estado, ...(esTotal ? {} : { nivel: categoria }) };
    });
    this.pagina.set(1);
  }

  /** Enter con el teclado sobre una fila: filtra por ese nivel (o lo quita); «Total» quita el nivel. */
  elegirFilaNivel(indice: number | null): void {
    const categoria = indice === null ? undefined : this.nivelCategorias()[indice];
    this.cambiarSeleccion('nivel', categoria && categoria !== 'Total' ? categoria : undefined);
  }

  // ── Avance acumulado (línea) ──
  readonly avance = computed(() => {
    const datos = this.datos();
    const fase = this.faseRectora();
    return datos && fase ? avanceAcumulado(this.filtradas(['estado']), fase, datos.fechaCorte) : [];
  });
  readonly avanceCategorias = computed(() => this.avance().map((p) => p.dia));
  readonly avanceSeries = computed(() => [{ name: '% de Entidades con Anexo N.º 02 aprobado', values: this.avance().map((p) => p.valor) }]);

  // ── Orden de prelación ──
  readonly anioPrelacion = signal(0);
  readonly opcionesAnioPrelacion = computed<TextFieldOption[]>(() => {
    const inicio = Number(this.periodo()) + 1;
    return [0, 1, 2].map((k) => ({ label: `Año ${k + 1} (${inicio + k})`, value: String(k) }));
  });
  readonly prelacion = computed(() => montoPorPrelacion(this.entidades(), this.anioPrelacion()));
  readonly prelacionSeries = computed(() => [
    { name: 'Monto (millones de S/)', values: this.prelacion().porOrden.map((m) => Math.round(m / 1e5) / 10) },
  ]);
  readonly ordenesPrelacion = ORDENES_PRELACION;

  // ── Ampliaciones de plazo ──
  readonly ampliaciones = computed(() => ampliacionesPorEstado(this.filtradas(['ampliacion'])));
  readonly totalAmpliaciones = computed(() => this.ampliaciones().reduce((s, a) => s + a.cantidad, 0));
  readonly porcentajeVisible = porcentajeVisible;
  readonly formatoEntero = formatoEntero;

  readonly ampliacionCategorias = computed(() => this.ampliaciones().map((a) => a.estado));
  readonly ampliacionValores = computed(() => this.ampliaciones().map((a) => a.cantidad));
  /** Nombres de la leyenda de la dona, con el total de cada parte («Aprobada: 98»). */
  readonly ampliacionEtiquetas = computed(() => this.ampliaciones().map((a) => `${a.estado}: ${formatoEntero(a.cantidad)}`));
  readonly ampliacionSeleccionada = computed(() => {
    const estado = this.seleccion().ampliacion;
    return estado ? this.ampliacionCategorias().indexOf(estado) : null;
  });

  elegirAmpliacion(estado: string): void {
    this.cambiarSeleccion('ampliacion', this.seleccion().ampliacion === estado ? undefined : estado);
  }

  /** Clic en un tramo de la dona: filtra por esa parte (`null` quita el filtro). */
  elegirTramoAmpliacion(indice: number | null): void {
    this.cambiarSeleccion('ampliacion', indice === null ? undefined : this.ampliacionCategorias()[indice]);
  }

  // ── Departamentos ──
  readonly porDepartamento = computed(() => aprobadosPorDepartamento(this.filtradas(['departamento', 'estado'])));
  readonly departamentoSeries = computed(() => [{ name: '% con Anexo N.º 02 aprobado', values: this.porDepartamento().map((d) => d.valor) }]);
  readonly departamentoCategorias = computed(() => this.porDepartamento().map((d) => d.departamento));
  readonly departamentoSeleccionado = computed(() => {
    const dep = this.seleccion().departamento;
    const i = dep ? this.departamentoCategorias().indexOf(dep) : -1;
    return i >= 0 ? i : null;
  });

  elegirDepartamento(indice: number | null): void {
    this.cambiarSeleccion('departamento', indice === null ? undefined : this.departamentoCategorias()[indice]);
  }

  // ── Chips «Filtros por selección» ──
  readonly chips = computed(() => {
    const s = this.seleccion();
    const lista: { clave: ClaveSeleccion; texto: string }[] = [];
    if (s.nivel) lista.push({ clave: 'nivel', texto: `Nivel: ${s.nivel}` });
    if (s.estado !== undefined) lista.push({ clave: 'estado', texto: `Estado: ${ESTADOS_ANEXO_02[s.estado]}` });
    if (s.departamento) lista.push({ clave: 'departamento', texto: `Departamento: ${s.departamento}` });
    if (s.ampliacion) lista.push({ clave: 'ampliacion', texto: `Ampliación: ${s.ampliacion}` });
    return lista;
  });

  cambiarSeleccion(clave: ClaveSeleccion, valor: string | EstadoAnexo02 | undefined): void {
    this.seleccion.update((s) => {
      const copia: SeleccionVisual = { ...s };
      if (valor === undefined) delete copia[clave];
      else (copia as Record<string, unknown>)[clave] = valor;
      return copia;
    });
    this.pagina.set(1);
  }

  // ── Detalle por Entidad ──
  readonly busqueda = signal('');
  readonly orden = signal<{ clave: ClaveOrden; dir: 1 | -1 }>({ clave: 'dias', dir: 1 });
  readonly pagina = signal(1);
  readonly tamanoPagina = signal(10);
  readonly opcionesTamano = [10, 25, 50];

  readonly columnas: { clave: ClaveOrden; titulo: string; numero?: boolean }[] = [
    { clave: 'codigo', titulo: 'Código' },
    { clave: 'nombre', titulo: 'Entidad' },
    { clave: 'nivel', titulo: 'Nivel de gobierno' },
    { clave: 'departamento', titulo: 'Departamento' },
    { clave: 'estado', titulo: 'Estado del Anexo N.º 02' },
    { clave: 'avanceAnexos01', titulo: 'Anexos N.º 01 aprobados', numero: true },
    { clave: 'monto', titulo: 'Monto Año 1 (S/)', numero: true },
    { clave: 'fechaFin', titulo: 'Fecha fin de fase' },
    { clave: 'dias', titulo: 'Días restantes', numero: true },
  ];

  readonly filasDetalle = computed<FilaDetalle[]>(() => {
    const fase = this.faseRectora();
    const datos = this.datos();
    if (!fase || !datos) return [];
    const q = this.busqueda().trim().toLowerCase();
    const filas = this.entidades()
      .filter((e) => !q || e.nombre.toLowerCase().includes(q) || e.codigo.includes(q))
      .map((e) => {
        const fin = fechaFinEntidad(e, fase);
        return {
          codigo: e.codigo,
          nombre: e.nombre,
          nivel: e.nivel,
          departamento: e.departamento,
          estado: e.estado,
          anexos01: `${e.anexos01Aprobados} / ${e.areasUsuarias}`,
          avanceAnexos01: e.anexos01Aprobados / e.areasUsuarias,
          monto: e.montos[0],
          fechaFin: fin,
          ampliada: e.ampliacion === 'Aprobada',
          dias: e.estado === ESTADO_APROBADO ? 9999 : diasEntre(datos.fechaCorte, fin),
        };
      });
    const { clave, dir } = this.orden();
    return filas.sort((a, b) => ((a[clave] > b[clave] ? 1 : a[clave] < b[clave] ? -1 : 0) || a.estado - b.estado) * dir);
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filasDetalle().length / this.tamanoPagina())));
  readonly filasPagina = computed(() => {
    const pagina = Math.min(this.pagina(), this.totalPaginas());
    return this.filasDetalle().slice((pagina - 1) * this.tamanoPagina(), pagina * this.tamanoPagina());
  });

  ordenarPor(clave: ClaveOrden): void {
    this.orden.update((o) => (o.clave === clave ? { clave, dir: o.dir === 1 ? -1 : 1 } : { clave, dir: 1 }));
    this.pagina.set(1);
  }

  ariaOrden(clave: ClaveOrden): 'ascending' | 'descending' | null {
    const o = this.orden();
    return o.clave === clave ? (o.dir === 1 ? 'ascending' : 'descending') : null;
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  readonly fechaVisible = fechaVisible;
  readonly formatoMonto = formatoMonto;

  // ── Carga y combos ──
  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.obtener(this.periodo(), this.fase()).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cambiarPeriodo(periodo: string): void {
    if (periodo === this.periodo()) return;
    this.periodo.set(periodo);
    this.fase.set(PERIODOS_SEGUIMIENTO.find((p) => p.valor === periodo)?.faseVigente ?? 1);
    this.pagina.set(1);
    this.cargar();
  }

  cambiarFase(fase: string): void {
    if (Number(fase) === this.fase()) return;
    this.fase.set(Number(fase));
    this.pagina.set(1);
    this.cargar();
  }

  cambiarCombo(clave: keyof FiltrosCombos, valor: string): void {
    this.combos.update((c) => ({ ...c, [clave]: valor === TODOS ? '' : valor }));
    this.pagina.set(1);
  }

  borrarFiltros(): void {
    this.combos.set({ nivel: '', subgrupo: '', area: '', departamento: '', estado: '' });
    this.seleccion.set({});
    this.busqueda.set('');
    this.pagina.set(1);
  }

  /** CSV de las Entidades del detalle (con los filtros y la búsqueda), con BOM para que Excel respete las tildes. */
  exportar(): void {
    const encabezado = ['Código', 'Entidad', 'Nivel de gobierno', 'Departamento', 'Estado del Anexo N.º 02', 'Anexos N.º 01 aprobados', 'Monto Año 1 (S/)', 'Fecha fin de fase', 'Ampliación'];
    const celda = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const lineas = [
      encabezado.map(celda).join(';'),
      ...this.filasDetalle().map((f) =>
        [f.codigo, f.nombre, f.nivel, f.departamento, ESTADOS_ANEXO_02[f.estado], f.anexos01, f.monto.toFixed(2), fechaVisible(f.fechaFin), f.ampliada ? 'Aprobada' : '']
          .map(celda)
          .join(';'),
      ),
    ];
    const url = URL.createObjectURL(new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'Seguimiento_nacional_CMN.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

function unicos(valores: readonly string[]): string[] {
  return [...new Set(valores)];
}

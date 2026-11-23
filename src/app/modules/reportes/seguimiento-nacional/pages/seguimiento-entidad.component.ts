import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { BarChartComponent } from '../../../../shared/ui/bar-chart/bar-chart.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ChartSectionComponent } from '../../../../shared/ui/chart-section/chart-section.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { KpiCardComponent, KpiCardTone } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { LoadingProgressComponent } from '../../../../shared/ui/loading-progress/loading-progress.component';
import { StatusTagComponent, StatusTagTone } from '../../../../shared/ui/status-tag/status-tag.component';
import { StepItem, StepsComponent } from '../../../../shared/ui/steps/steps.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { SeguimientoNacionalApiService } from '../api/seguimiento-nacional-api.service';
import {
  ANEXO_01_APROBADO,
  ESTADOS_ANEXO_01,
  ESTADOS_REMISION,
  GENERICAS_ENTIDAD,
  NOMBRES_ETAPA,
  REVISIONES_OA,
  SIN_ANEXO_01,
  SeguimientoEntidad,
} from '../models/seguimiento-entidad.model';
import { ORDENES_PRELACION } from '../models/seguimiento-nacional.model';
import {
  ClaveSeleccionEntidad,
  FilaAvanceArea,
  FiltrosEntidad,
  PENDIENTES_OA,
  SeleccionEntidad,
  VistaEntidad,
  areasFiltradas,
  avancePorArea,
  esAprobado,
  montoPorOrden,
  necesidadesProgramadas,
  necesidadesRemitidas,
  situacionDe,
  tienePendiente,
  usoDelTecho,
} from '../utils/seguimiento-entidad.util';
import { diasEntre, fechaVisible, formatoEntero, formatoMonto, porcentaje, porcentajeVisible, sumarDias } from '../utils/seguimiento-nacional.util';

const TODAS = 'todas';
/** Tono de la etiqueta de cada estado del Anexo N.º 01 (Elaborado … Aprobado). */
const TONO_ANEXO_01: StatusTagTone[] = ['default', 'info', 'info', 'warning', 'success'];

type ClaveOrdenArea = 'nombre' | 'estado' | 'necesidades' | 'monto' | 'uso';

interface Kpi {
  title: string;
  amount: string;
  progress: number;
  description: string;
  tone: KpiCardTone;
  icon: string;
}

/**
 * Pestaña «Resumen de la Entidad» del seguimiento del CMN: cómo programa el Ministerio de Educación en la fase elegida,
 * vista por la Oficina de Abastecimiento (toda la Entidad) o por un área usuaria (solo lo suyo). Combos de fase, área
 * usuaria, ATE, genérica y año; cinco KPI; la línea de tiempo de las etapas; el uso del techo por genérica; el estado de los
 * Anexos N.º 01; el avance por área usuaria; las necesidades remitidas a las ATE; el monto por orden de prelación y los
 * pendientes de la OA. Un clic en un tramo, una barra o una fila filtra todo el resumen (chips «Filtros por
 * selección»).
 */
@Component({
  selector: 'siaf-seguimiento-entidad',
  standalone: true,
  imports: [
    BarChartComponent,
    ButtonComponent,
    ChartSectionComponent,
    IconComponent,
    KpiCardComponent,
    LoadingProgressComponent,
    StatusTagComponent,
    StepsComponent,
    TagComponent,
    TextFieldComponent,
  ],
  templateUrl: './seguimiento-entidad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoEntidadComponent implements OnInit {
  private readonly api = inject(SeguimientoNacionalApiService);

  readonly datos = signal<SeguimientoEntidad | null>(null);
  readonly filtros = signal<FiltrosEntidad>({ fase: 2, vista: 'OA', areaVista: '0040', area: '', ate: '', generica: '', anio: 0 });
  readonly seleccion = signal<SeleccionEntidad>({});

  readonly TODAS = TODAS;
  readonly estadosAnexo01 = ESTADOS_ANEXO_01;
  readonly tonoAnexo01 = TONO_ANEXO_01;
  readonly revisiones = REVISIONES_OA;
  readonly nombresEtapa = NOMBRES_ETAPA;
  readonly ordenes = ORDENES_PRELACION;
  readonly fechaVisible = fechaVisible;
  readonly formatoMonto = formatoMonto;
  readonly formatoEntero = formatoEntero;
  readonly porcentajeVisible = porcentajeVisible;
  readonly ANEXO_01_APROBADO = ANEXO_01_APROBADO;
  readonly SIN_ANEXO_01 = SIN_ANEXO_01;

  ngOnInit(): void {
    this.api.obtenerEntidad().subscribe((datos) => this.datos.set(datos));
  }

  // ── Combos ──
  readonly opcionesVista: TextFieldOption[] = [
    { label: 'Oficina de Abastecimiento (toda la Entidad)', value: 'OA' },
    { label: 'Área usuaria (solo su información)', value: 'AU' },
  ];
  readonly opcionesFase = computed<TextFieldOption[]>(() => (this.datos()?.fases ?? []).map((f) => ({ label: f.nombre, value: String(f.numero) })));
  private readonly opcionesAreas = computed<TextFieldOption[]>(() =>
    (this.datos()?.areas ?? []).map((a) => ({ label: `${a.codigo} ${a.nombre}`, value: a.codigo })),
  );
  readonly opcionesAreaVista = this.opcionesAreas;
  readonly opcionesArea = computed<TextFieldOption[]>(() => [{ label: 'Todas', value: TODAS }, ...this.opcionesAreas()]);
  readonly opcionesAte = computed<TextFieldOption[]>(() => [
    { label: 'Todas', value: TODAS },
    ...(this.datos()?.areas ?? []).filter((a) => a.esAte).map((a) => ({ label: `${a.codigo} ${a.nombre}`, value: a.codigo })),
  ]);
  readonly opcionesGenerica: TextFieldOption[] = [{ label: 'Todas', value: TODAS }, ...GENERICAS_ENTIDAD.map((g) => ({ label: g.nombre, value: g.codigo }))];
  readonly opcionesPeriodo: TextFieldOption[] = [{ label: '2026 (programa 2027 - 2029)', value: '2026' }];
  /** Categoría única de la barra 100 % del estado de los Anexos N.º 01. */
  readonly categoriasEstado = [...ESTADOS_ANEXO_01];
  readonly opcionesAnio: TextFieldOption[] = [0, 1, 2].map((k) => ({ label: `Año ${k + 1} (${2027 + k})`, value: String(k) }));

  valor(clave: 'area' | 'ate' | 'generica'): string {
    return this.filtros()[clave] || TODAS;
  }

  cambiarCombo(clave: 'area' | 'ate' | 'generica', valor: string): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor === TODAS ? '' : valor }));
  }

  cambiarFase(fase: string): void {
    this.filtros.update((f) => ({ ...f, fase: Number(fase) }));
    this.seleccion.set({});
  }

  cambiarAnio(anio: string): void {
    this.filtros.update((f) => ({ ...f, anio: Number(anio) }));
  }

  cambiarVista(vista: string): void {
    this.filtros.update((f) => ({ ...f, vista: vista as VistaEntidad, area: '' }));
    this.seleccion.set({});
  }

  cambiarAreaVista(area: string): void {
    this.filtros.update((f) => ({ ...f, areaVista: area }));
  }

  borrarFiltros(): void {
    this.filtros.update((f) => ({ ...f, area: '', ate: '', generica: '' }));
    this.seleccion.set({});
  }

  cambiarSeleccion(clave: ClaveSeleccionEntidad, valor: string | number | undefined): void {
    this.seleccion.update((s) => {
      const copia: SeleccionEntidad = { ...s };
      if (valor === undefined) delete copia[clave];
      else (copia as Record<string, unknown>)[clave] = valor;
      return copia;
    });
  }

  private nombreArea(codigo: string): string {
    const area = this.datos()?.areas.find((a) => a.codigo === codigo);
    return area ? `${area.codigo} ${area.nombre}` : codigo;
  }

  readonly subtitulo = computed(() => {
    const datos = this.datos();
    if (!datos) return '';
    const f = this.filtros();
    const vista = f.vista === 'OA' ? 'vista de la Oficina de Abastecimiento' : `vista del Área usuaria ${this.nombreArea(f.areaVista)}`;
    return `${datos.entidad} · ${vista} · fecha de corte ${fechaVisible(datos.fechaCorte)}`;
  });

  readonly fase = computed(() => this.datos()?.fases.find((f) => f.numero === this.filtros().fase) ?? null);
  readonly areas = computed(() => (this.datos() ? areasFiltradas(this.datos()!, this.filtros(), this.seleccion()) : []));

  // ── KPI ──
  readonly kpis = computed<Kpi[]>(() => {
    const datos = this.datos();
    if (!datos) return [];
    const f = this.filtros();
    const s = this.seleccion();
    const areas = this.areas();
    const situaciones = areas.map((a) => situacionDe(datos, f.fase, a.codigo));
    const aprobados = situaciones.filter(esAprobado).length;
    const remitidas = necesidadesRemitidas(datos, f, s).filter((n) => !s.ate || n.ate === s.ate);
    const porEstado = [0, 0, 0];
    remitidas.forEach((n) => porEstado[n.remision ?? 0]++);
    const ajustados = situaciones.filter((x) => x.ajustado).length;
    const conNuevaVersion = situaciones.filter((x) => x.ajustado && x.version > 1).length;
    const ampliaciones = situaciones.filter((x) => x.ampliacion === 'Pendiente').length;
    const aprobadas = situaciones.filter(esAprobado);
    const revisados = aprobadas.filter((x) => (x.revision ?? 0) > 0).length;
    const kpis: Kpi[] = [
      {
        title: 'Anexos N.º 01 aprobados',
        amount: `${aprobados} / ${areas.length}`,
        progress: porcentaje(aprobados, areas.length),
        description: `${porcentajeVisible(aprobados, areas.length)} de las Áreas usuarias`,
        tone: 'success',
        icon: 'task_alt',
      },
      {
        title: 'Anexos N.º 01 con ajustes notificados',
        amount: formatoEntero(ajustados),
        progress: porcentaje(conNuevaVersion, ajustados),
        description: `${conNuevaVersion} con nueva versión aprobada`,
        tone: 'warning',
        icon: 'edit_note',
      },
      {
        title: 'Necesidades remitidas a las ATE',
        amount: formatoEntero(remitidas.length),
        progress: porcentaje(porEstado[1], remitidas.length),
        description: `${porEstado[0]} pendientes · ${porEstado[1]} aceptadas · ${porEstado[2]} rechazadas`,
        tone: 'informative',
        icon: 'forward_to_inbox',
      },
      {
        title: 'Ampliaciones de plazo de etapa',
        amount: formatoEntero(ampliaciones),
        progress: porcentaje(ampliaciones, areas.length),
        description: 'Pendientes de evaluación por la OA',
        tone: 'danger',
        icon: 'schedule',
      },
    ];
    if (f.vista === 'OA') {
      kpis.push({
        title: 'Anexo N.º 02',
        amount: f.fase === 1 ? 'Aprobado' : f.fase === 2 ? 'Elaborado' : 'No creado',
        progress: porcentaje(revisados, aprobadas.length),
        description: `${revisados} Anexos N.º 01 revisados de ${aprobadas.length}`,
        tone: 'informative',
        icon: 'description',
      });
    } else {
      const propia = situacionDe(datos, f.fase, f.areaVista);
      kpis.push({
        title: 'Mi Anexo N.º 01',
        amount: propia.estado < 0 ? 'Sin registrar' : ESTADOS_ANEXO_01[propia.estado],
        progress: propia.estado < 0 ? 0 : porcentaje(propia.estado + 1, ESTADOS_ANEXO_01.length),
        description: propia.revision !== null && esAprobado(propia) ? `Revisión OA: ${REVISIONES_OA[propia.revision]}` : 'Sin revisión de la OA',
        tone: 'informative',
        icon: 'description',
      });
    }
    return kpis;
  });

  // ── Calendario de etapas ──
  /**
   * Línea de tiempo de la fase: un hito por inicio o fin de etapa, en orden de fecha (los del mismo día van juntos,
   * como «Inicio de las Etapas 1 y 3»). El hito activo es el último ya alcanzado a la fecha de corte.
   */
  readonly lineaDeTiempo = computed(() => {
    const datos = this.datos();
    const fase = this.fase();
    if (!datos || !fase) return null;
    const f = this.filtros();
    const elegida = f.vista === 'AU' ? f.areaVista : f.area || this.seleccion().area;
    const ampliada = !!elegida && situacionDe(datos, f.fase, elegida).ampliacion === 'Aceptada';
    const eventos: { fecha: string; tipo: 'Inicio' | 'Fin'; etapa: number; nota: string }[] = [];
    fase.etapas.forEach((e, i) => {
      eventos.push({ fecha: e.inicio, tipo: 'Inicio', etapa: i + 1, nota: '' });
      const fin = i === 1 && ampliada ? sumarDias(e.fin, 7) : e.fin;
      eventos.push({ fecha: fin, tipo: 'Fin', etapa: i + 1, nota: fin !== e.fin ? ' (con ampliación)' : '' });
    });
    const grupos = new Map<string, typeof eventos>();
    for (const ev of eventos.sort((a, b) => diasEntre(b.fecha, a.fecha) || a.etapa - b.etapa)) {
      const clave = `${ev.fecha}|${ev.tipo}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), ev]);
    }
    const hitos: StepItem[] = [...grupos.values()].map((grupo) => {
      const etapas = grupo.map((ev) => ev.etapa);
      const nombre = etapas.length > 1 ? `${grupo[0].tipo} de las Etapas ${etapas.slice(0, -1).join(', ')} y ${etapas.at(-1)}` : `${grupo[0].tipo} de la Etapa ${etapas[0]}`;
      return { label: nombre, description: fechaVisible(grupo[0].fecha) + grupo.map((ev) => ev.nota).join('') };
    });
    const fechas = [...grupos.values()].map((grupo) => grupo[0].fecha);
    return {
      hitos,
      activo: fechas.filter((fecha) => diasEntre(fecha, datos.fechaCorte) >= 0).length,
      hoyTexto: fechaVisible(datos.fechaCorte),
    };
  });

  // ── Uso del techo por genérica ──
  readonly techo = computed(() => (this.datos() ? usoDelTecho(this.datos()!, this.filtros(), this.seleccion()) : []));
  readonly techoCategorias = computed(() => this.techo().map((t) => t.corto));
  readonly techoSeries = computed(() => [
    { name: 'Programado', values: this.techo().map((t) => Math.round(t.programado / 1000)) },
    { name: 'Techo de la fase', values: this.techo().map((t) => Math.round(t.techo / 1000)) },
  ]);
  readonly techoSeleccionado = computed(() => {
    const i = this.techo().findIndex((t) => t.codigo === this.seleccion().generica);
    return i >= 0 ? i : null;
  });
  elegirGenerica(indice: number | null): void {
    this.cambiarSeleccion('generica', indice === null ? undefined : this.techo()[indice]?.codigo);
  }

  // ── Estado de los Anexos N.º 01 (barra 100 %) ──
  readonly estadoAnexos = computed(() => {
    const datos = this.datos();
    if (!datos) return { conteo: [0, 0, 0, 0, 0], sinAnexo: 0 };
    const f = this.filtros();
    const conteo = [0, 0, 0, 0, 0];
    let sinAnexo = 0;
    for (const a of areasFiltradas(datos, f, this.seleccion(), ['estado'])) {
      const estado = situacionDe(datos, f.fase, a.codigo).estado;
      if (estado < 0) sinAnexo++;
      else conteo[estado]++;
    }
    return { conteo, sinAnexo };
  });
  readonly estadoSeries = computed(() => [{ name: 'Áreas usuarias', values: [...this.estadoAnexos().conteo] }]);
  /** Clic en la barra de un estado: filtra las áreas usuarias por él (`null` quita el filtro). */
  elegirEstado(indice: number | null): void {
    this.cambiarSeleccion('estado', indice === null ? undefined : indice);
  }

  // ── Avance por área usuaria ──
  readonly ordenArea = signal<{ clave: ClaveOrdenArea; dir: 1 | -1 }>({ clave: 'monto', dir: -1 });
  readonly columnasArea: { clave: ClaveOrdenArea | null; titulo: string; numero?: boolean }[] = [
    { clave: 'nombre', titulo: 'Área usuaria' },
    { clave: null, titulo: 'ATE' },
    { clave: 'estado', titulo: 'Estado del Anexo N.º 01' },
    { clave: null, titulo: 'Revisión OA' },
    { clave: 'necesidades', titulo: 'Necesidades', numero: true },
    { clave: 'monto', titulo: 'Monto a su cargo (S/)', numero: true },
    { clave: 'uso', titulo: 'Uso de su techo' },
  ];
  readonly filasArea = computed<FilaAvanceArea[]>(() => {
    const datos = this.datos();
    if (!datos) return [];
    const { clave, dir } = this.ordenArea();
    const valor = (f: FilaAvanceArea): string | number =>
      clave === 'nombre' ? f.area.nombre : clave === 'estado' ? f.situacion.estado : f[clave];
    return avancePorArea(datos, this.filtros(), this.seleccion()).sort((a, b) => (valor(a) > valor(b) ? 1 : valor(a) < valor(b) ? -1 : 0) * dir);
  });
  ordenarArea(clave: ClaveOrdenArea | null): void {
    if (!clave) return;
    this.ordenArea.update((o) => (o.clave === clave ? { clave, dir: o.dir === 1 ? -1 : 1 } : { clave, dir: 1 }));
  }
  ariaOrdenArea(clave: ClaveOrdenArea | null): 'ascending' | 'descending' | null {
    const o = this.ordenArea();
    return clave && o.clave === clave ? (o.dir === 1 ? 'ascending' : 'descending') : null;
  }
  elegirArea(codigo: string): void {
    this.cambiarSeleccion('area', this.seleccion().area === codigo ? undefined : codigo);
  }
  readonly porcentajeUso = (uso: number): number => Math.min(100, Math.round(uso * 100));

  // ── Necesidades remitidas por ATE ──
  private readonly ates = computed(() => (this.datos()?.areas ?? []).filter((a) => a.esAte));
  readonly remitidasCategorias = computed(() => this.ates().map((a) => `${a.codigo} ${a.nombre}`));
  readonly remitidasSeries = computed(() => {
    const datos = this.datos();
    const remitidas = datos ? necesidadesRemitidas(datos, this.filtros(), this.seleccion()) : [];
    return ESTADOS_REMISION.map((nombre, i) => ({
      name: nombre,
      values: this.ates().map((ate) => remitidas.filter((n) => n.ate === ate.codigo && n.remision === i).length),
    }));
  });
  readonly ateSeleccionada = computed(() => {
    const i = this.ates().findIndex((a) => a.codigo === this.seleccion().ate);
    return i >= 0 ? i : null;
  });
  elegirAte(indice: number | null): void {
    this.cambiarSeleccion('ate', indice === null ? undefined : this.ates()[indice]?.codigo);
  }

  // ── Orden de prelación ──
  readonly montoOrden = computed(() => (this.datos() ? montoPorOrden(this.datos()!, this.filtros(), this.seleccion()) : []));
  readonly ordenSeries = computed(() => [{ name: 'Monto (miles de S/)', values: this.montoOrden().map((m) => Math.round(m / 1000)) }]);
  readonly totalOrden = computed(() => formatoMonto(this.montoOrden().reduce((a, b) => a + b, 0)));
  elegirOrden(indice: number | null): void {
    this.cambiarSeleccion('orden', indice === null ? undefined : indice);
  }

  // ── Pendientes de la OA ──
  readonly pendientes = computed(() => {
    const datos = this.datos();
    const fase = this.fase();
    if (!datos || !fase) return [];
    const f = this.filtros();
    // El gráfico ignora su propia selección, para poder elegir otro pendiente.
    const situaciones = areasFiltradas(datos, f, this.seleccion(), ['pendiente']).map((a) => situacionDe(datos, f.fase, a.codigo));
    const cuantas = (i: number): number => situaciones.filter((x) => tienePendiente(x, i)).length;
    const sinAprobar = cuantas(2);
    return [
      { texto: 'Anexos N.º 01 aprobados por revisar', cantidad: cuantas(0), plazo: `Hasta ${fechaVisible(fase.etapas[2].fin)} (Etapa 3)`, alerta: false },
      { texto: 'Ampliaciones de plazo de etapa por evaluar', cantidad: cuantas(1), plazo: `Etapa 2 vence ${fechaVisible(fase.etapas[1].fin)}`, alerta: false },
      { texto: 'Áreas usuarias sin Anexo N.º 01 aprobado', cantidad: sinAprobar, plazo: `Etapa 2 vence ${fechaVisible(fase.etapas[1].fin)}`, alerta: sinAprobar > 0 },
      { texto: 'Solicitudes de necesidades estratégicas por aprobar', cantidad: f.fase === 2 ? 1 : 0, plazo: '–', alerta: false },
    ];
  });
  /** Barras de los pendientes: nombre corto de cada uno y su cantidad. */
  readonly pendientesCategorias = [...PENDIENTES_OA];
  readonly pendienteSeleccionado = computed(() => this.seleccion().pendiente ?? null);
  /**
   * Clic en un pendiente: deja en el resumen y en «Avance por Área usuaria» solo las áreas usuarias que lo tienen (el de
   * necesidades estratégicas no depende de un área y no filtra).
   */
  elegirPendiente(indice: number | null): void {
    this.cambiarSeleccion('pendiente', indice === null || indice > 2 ? undefined : indice);
  }
  readonly pendientesSeries = computed(() => [{ name: 'Pendientes', values: this.pendientes().map((p) => p.cantidad) }]);
  /** Pendientes urgentes: van en rojo en el gráfico. */
  readonly pendientesUrgentes = computed(() => this.pendientes().flatMap((p, i) => (p.alerta ? [i] : [])));
  /** Vencimientos de las etapas que cierran los pendientes. */
  readonly pendientesPlazos = computed(() => {
    const fase = this.fase();
    return fase ? `Etapa 2 vence ${fechaVisible(fase.etapas[1].fin)} · Etapa 3 vence ${fechaVisible(fase.etapas[2].fin)}` : '';
  });

  // ── Chips ──
  readonly chips = computed(() => {
    const s = this.seleccion();
    const lista: { clave: ClaveSeleccionEntidad; texto: string }[] = [];
    if (s.area) lista.push({ clave: 'area', texto: `Área usuaria: ${this.nombreArea(s.area)}` });
    if (s.estado !== undefined) lista.push({ clave: 'estado', texto: `Estado: ${ESTADOS_ANEXO_01[s.estado]}` });
    if (s.pendiente !== undefined) lista.push({ clave: 'pendiente', texto: `Pendiente: ${PENDIENTES_OA[s.pendiente]}` });
    if (s.generica) lista.push({ clave: 'generica', texto: `Genérica: ${s.generica}` });
    if (s.ate) lista.push({ clave: 'ate', texto: `ATE: ${this.nombreArea(s.ate)}` });
    if (s.orden !== undefined) lista.push({ clave: 'orden', texto: ORDENES_PRELACION[s.orden] });
    return lista;
  });

  /** CSV de las necesidades que entran, con BOM para que Excel respete las tildes. */
  exportar(): void {
    const datos = this.datos();
    if (!datos) return;
    const filas = necesidadesProgramadas(datos, this.filtros(), this.seleccion());
    const celda = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const lineas = [
      ['Área usuaria', 'Código del ítem', 'Tipo', 'Descripción', 'Genérica', 'Orden de prelación', 'ATE', 'Remisión', 'Año 1', 'Año 2', 'Año 3'].map(celda).join(';'),
      ...filas.map((n) =>
        [n.area, n.item, n.tipo, n.descripcion, n.generica, ORDENES_PRELACION[n.orden], n.ate ?? '', n.ate ? ESTADOS_REMISION[n.remision ?? 0] : '', ...n.montos.map((m) => m.toFixed(2))]
          .map(celda)
          .join(';'),
      ),
    ];
    const url = URL.createObjectURL(new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'Necesidades_CMN_Entidad.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

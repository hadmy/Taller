import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BarChartComponent } from '../../../../shared/ui/bar-chart/bar-chart.component';
import { ChartSectionComponent } from '../../../../shared/ui/chart-section/chart-section.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { LineChartComponent } from '../../../../shared/ui/line-chart/line-chart.component';
import { MessageBoxComponent } from '../../../../shared/ui/message-box/message-box.component';
import { EntidadSeguimiento, NIVELES_GOBIERNO, ORDENES_PRELACION, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import {
  aprobadosPorDepartamento,
  contarEstados,
  estadosPorNivel,
  formatoEntero,
  montoPorPrelacion,
  porcentaje,
  porcentajeVisible,
} from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';
import {
  COLORES_ESTADO,
  ESTADOS_AMPLIACION_REPORTE,
  ESTADOS_REPORTE,
  SeleccionReporte,
  aplicarSeleccion,
  contarAmpliaciones,
  etiquetaAnio,
  avanceDeLaFase,
  faseDe,
} from '../utils/seguimiento-dplaip.util';
import { fechaVisible } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';
import { BarraHorizontal, BarrasHorizontalesComponent } from '../../graficos/barras-horizontales.component';
import { COLOR } from '../../graficos/estados-anexo';

/** Vista gráfica del reporte DPLAIP (Figma C.1-RQ-004 y 005): KPI y cinco gráficos; un clic filtra todo el informe. */
@Component({
  selector: 'siaf-graficas-dplaip',
  standalone: true,
  imports: [BarChartComponent, BarrasHorizontalesComponent, ChartSectionComponent, KpiCardComponent, LineChartComponent, MessageBoxComponent],
  template: `
    <div class="flex flex-col gap-siaf-lg">
      <div class="grid gap-siaf-lg sm:grid-cols-2 xl:grid-cols-4" data-kpis>
        @for (kpi of kpis(); track kpi.title) {
          <siaf-kpi-card [title]="kpi.title" [amount]="kpi.amount" [progress]="kpi.progress" [showIcon]="false" />
        }
      </div>

      <div class="grid gap-siaf-lg lg:grid-cols-2">
        <siaf-chart-section class="min-w-0" [title]="'Estado del Anexo N° ' + anexo() + ' por nivel de gobierno'" description="Clic en un segmento para filtrar el informe" data-grafico="estado">
          <siaf-bar-chart
            orientation="horizontal"
            [stacked]="true"
            [categories]="niveles()"
            [series]="seriesEstado()"
            [max]="100"
            valueSuffix="%"
            [ariaLabel]="'Estado del Anexo N° ' + anexo() + ' por nivel de gobierno'"
            categoryLabel="Nivel de gobierno"
            [height]="220"
            [selectable]="true"
            [selectedIndex]="nivelElegido()"
            [selectedSeries]="estadoElegido()"
            (segmentSelected)="elegirSegmento($event)"
            (categorySelected)="elegirNivel($event)"
          />
        </siaf-chart-section>

        <siaf-chart-section class="min-w-0" [title]="'Avance acumulado de Anexos N° ' + anexo() + ' aprobados'" [description]="'% de Entidades con Anexo N° ' + anexo() + ' aprobado por día de la fase'" data-grafico="avance">
          @if (avance().length > 1) {
            <siaf-line-chart
              [categories]="avanceDias()"
              [series]="avanceSeries()"
              valueSuffix="%"
              [min]="0"
              [max]="100"
              [ariaLabel]="'Avance acumulado de Anexos N° ' + anexo() + ' aprobados'"
              categoryLabel="Día"
              [height]="220"
            />
            <p class="m-0 text-xs font-bold text-[var(--sys-color-text-neutral-high)]" data-corte>{{ textoCorte() }}</p>
          } @else {
            <message-box text="La fase aún no inicia." />
          }
        </siaf-chart-section>

        <siaf-chart-section class="min-w-0" title="Monto programado por orden de prelación" [description]="'Millones de S/ · ' + anio(0)" data-grafico="prelacion">
          <siaf-barras-horizontales [barras]="prelacion()" ariaLabel="Monto programado por orden de prelación" />
          <p class="m-0 text-xs font-bold text-[var(--sys-color-text-neutral-high)]">{{ totalPrelacion() }}</p>
        </siaf-chart-section>

        <siaf-chart-section class="min-w-0" title="Solicitudes de ampliación de plazo de fase" [description]="'Fase ' + datos().fase + ' · por estado de la solicitud · clic para filtrar'" data-grafico="ampliaciones">
          <siaf-barras-horizontales
            [barras]="ampliaciones()"
            ariaLabel="Solicitudes de ampliación de plazo de fase"
            [selectable]="true"
            [elegida]="ampliacionElegida()"
            (elegir)="elegirAmpliacion($event)"
          />
          <p class="m-0 text-xs font-bold text-[var(--sys-color-text-neutral-high)]">{{ totalAmpliaciones() }}</p>
        </siaf-chart-section>
      </div>

      <siaf-chart-section
        class="min-w-0"
        [title]="'% de Entidades con Anexo N° ' + anexo() + ' aprobado por departamento'"
        [description]="departamentos().length + ' departamentos ordenados de mayor a menor · % de Entidades con Anexo N° ' + anexo() + ' aprobado'"
        data-grafico="departamentos"
      >
        <siaf-bar-chart
          [categories]="nombresDepartamento()"
          [series]="seriesDepartamento()"
          valueSuffix="%"
          [max]="100"
          [showValues]="true"
          [ariaLabel]="'% de Entidades con Anexo N° ' + anexo() + ' aprobado por departamento'"
          categoryLabel="Departamento"
          [height]="340"
          [selectable]="true"
          [selectedIndex]="departamentoElegido()"
          (categorySelected)="elegirDepartamento($event)"
        />
      </siaf-chart-section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficasDplaipComponent {
  readonly datos = input.required<SeguimientoNacional>();
  /** «01» o «02»: el anexo consultado. */
  readonly anexo = input.required<string>();
  /** Entidades de los parámetros aplicados, sin la selección. */
  readonly entidades = input.required<EntidadSeguimiento[]>();
  readonly seleccion = input.required<SeleccionReporte>();
  readonly seleccionCambio = output<SeleccionReporte>();

  private filtradas(...ignorar: (keyof SeleccionReporte)[]): EntidadSeguimiento[] {
    return aplicarSeleccion(this.entidades(), this.seleccion(), ignorar);
  }

  readonly kpis = computed(() => {
    const lista = this.filtradas();
    const n = lista.length;
    const [pendientes, elaborados, enEvaluacion, aprobados] = contarEstados(lista);
    // Sin filtros, la barra dice cuántas tienen sus fechas de etapas configuradas; con filtros, qué parte del total son.
    const todas = this.datos().entidades.length;
    const kpi = (title: string, valor: number) => ({ title, amount: formatoEntero(valor), progress: porcentaje(valor, n) });
    return [
      { title: 'Entidades que programan', amount: formatoEntero(n), progress: n === todas ? 98 : porcentaje(n, todas) },
      kpi('Aprobado', aprobados),
      kpi('Verificado / Validado', enEvaluacion),
      kpi('Pendiente / Elaborado', pendientes + elaborados),
    ];
  });

  // ── Estado por nivel ──
  private readonly porNivel = computed(() => estadosPorNivel(this.filtradas('nivel', 'estado')));
  readonly niveles = computed(() => this.porNivel().map((f) => f.nivel));
  readonly seriesEstado = computed(() =>
    ESTADOS_REPORTE.map((name, i) => ({
      name,
      token: COLORES_ESTADO[i],
      values: this.porNivel().map((f) => porcentaje(f.conteo[i], f.conteo.reduce((a, b) => a + b, 0))),
    })),
  );
  readonly nivelElegido = computed(() => this.indice(this.niveles(), this.seleccion().nivel));
  readonly estadoElegido = computed(() => this.indice(ESTADOS_REPORTE, this.seleccion().estado));

  elegirSegmento(evento: { category: number; series: number } | null): void {
    if (!evento) {
      this.cambiar({ nivel: undefined, estado: undefined });
      return;
    }
    const nivel = NIVELES_GOBIERNO.find((n) => n === this.niveles()[evento.category]);
    const estado = ESTADOS_REPORTE[evento.series];
    const s = this.seleccion();
    const igual = s.estado === estado && s.nivel === nivel;
    this.cambiar(igual ? { nivel: undefined, estado: undefined } : { nivel, estado });
  }

  elegirNivel(indice: number | null): void {
    this.cambiar({ nivel: NIVELES_GOBIERNO.find((n) => indice !== null && n === this.niveles()[indice]) });
  }

  // ── Avance ──
  readonly avance = computed(() => avanceDeLaFase(this.filtradas('estado'), this.datos()));
  readonly avanceDias = computed(() => this.avance().map((p) => p.dia));
  readonly avanceSeries = computed(() => [{ name: '% aprobado', values: this.avance().map((p) => p.valor) }]);

  readonly textoCorte = computed(() => {
    const ultimo = this.avance().filter((p) => !Number.isNaN(p.valor)).at(-1);
    return ultimo ? `Corte ${ultimo.dia}: ${ultimo.valor.toFixed(1)} % · Fecha fin rectora ${fechaVisible(faseDe(this.datos()).fin).slice(0, 5)}` : '';
  });

  // ── Prelación ──
  readonly anio = (k: number): string => etiquetaAnio(this.datos().periodo, k);
  private readonly montos = computed(() => montoPorPrelacion(this.filtradas(), 0));
  readonly prelacion = computed<BarraHorizontal[]>(() =>
    ORDENES_PRELACION.map((label, i) => ({ label, valor: this.montos().porOrden[i], texto: formatoEntero(this.montos().porOrden[i] / 1e6), color: COLOR.primario })),
  );
  readonly totalPrelacion = computed(() => {
    const [a, b, c] = this.montos().porAnio.map((m) => formatoEntero(m / 1e6));
    return `Total ${this.anio(0)}: S/ ${a} millones · Año 2: ${b} · Año 3: ${c}`;
  });

  // ── Ampliaciones ──
  private readonly conteoAmpliaciones = computed(() => contarAmpliaciones(this.filtradas('ampliacion')));
  readonly ampliaciones = computed<BarraHorizontal[]>(() => {
    const { total, cantidades } = this.conteoAmpliaciones();
    return ESTADOS_AMPLIACION_REPORTE.map((a, i) => ({
      label: a.etiqueta,
      valor: cantidades[i],
      texto: total ? `${formatoEntero(cantidades[i])} (${porcentajeVisible(cantidades[i], total)})` : '0',
      color: a.color,
    }));
  });
  readonly totalAmpliaciones = computed(
    () => `Total: ${formatoEntero(this.conteoAmpliaciones().total)} solicitudes · Fase ${this.datos().fase} al ${fechaVisible(this.datos().fechaCorte)}`,
  );
  readonly ampliacionElegida = computed(() => ESTADOS_AMPLIACION_REPORTE.find((a) => a.estado === this.seleccion().ampliacion)?.etiqueta ?? '');

  elegirAmpliacion(etiqueta: string): void {
    const estado = ESTADOS_AMPLIACION_REPORTE.find((a) => a.etiqueta === etiqueta)?.estado;
    this.cambiar({ ampliacion: this.seleccion().ampliacion === estado ? undefined : estado });
  }

  // ── Departamentos ──
  readonly departamentos = computed(() => aprobadosPorDepartamento(this.filtradas('departamento', 'estado')));
  readonly nombresDepartamento = computed(() => this.departamentos().map((d) => d.departamento));
  readonly seriesDepartamento = computed(() => [{ name: `% de Entidades con Anexo N° ${this.anexo()} aprobado`, values: this.departamentos().map((d) => Math.round(d.valor)) }]);
  readonly departamentoElegido = computed(() => this.indice(this.nombresDepartamento(), this.seleccion().departamento));

  elegirDepartamento(indice: number | null): void {
    this.cambiar({ departamento: indice === null ? undefined : this.nombresDepartamento()[indice] });
  }

  private indice(lista: readonly string[], valor: string | undefined): number | null {
    const i = valor ? lista.indexOf(valor) : -1;
    return i >= 0 ? i : null;
  }

  private cambiar(parte: SeleccionReporte): void {
    this.seleccionCambio.emit({ ...this.seleccion(), ...parte });
  }
}

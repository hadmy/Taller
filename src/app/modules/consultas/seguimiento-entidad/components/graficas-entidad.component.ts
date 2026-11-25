import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BarChartComponent } from '../../../../shared/ui/bar-chart/bar-chart.component';
import { ChartSectionComponent } from '../../../../shared/ui/chart-section/chart-section.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { MessageBoxComponent } from '../../../../shared/ui/message-box/message-box.component';
import { ESTADOS_ANEXO_01, SeguimientoEntidad } from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import { ORDENES_PRELACION } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { FiltrosEntidad, SeleccionEntidad, areasFiltradas, montoPorOrden, necesidadesRemitidas, situacionDe, usoDelTecho } from '../../../reportes/seguimiento-nacional/utils/seguimiento-entidad.util';
import { formatoEntero, formatoMonto, porcentaje } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';
import { BarraHorizontal, BarrasHorizontalesComponent } from '../../graficos/barras-horizontales.component';
import { COLOR } from '../../graficos/estados-anexo';
import { calendarioDeFase, etiquetaAnioEntidad, faseEntidad, kpisEntidad, nombreArea } from '../utils/consulta-entidad.util';
import { CalendarioEtapasComponent } from './calendario-etapas.component';

const COLORES_ANEXO_01 = [COLOR.neutro, COLOR.info, COLOR.info, COLOR.advertencia, COLOR.exito];

/** Vista gráfica del reporte de la Entidad (Figma C.2-RQ-020 y 025): KPI, calendario de etapas y gráficos que filtran. */
@Component({
  selector: 'siaf-graficas-entidad',
  standalone: true,
  imports: [BarChartComponent, BarrasHorizontalesComponent, CalendarioEtapasComponent, ChartSectionComponent, KpiCardComponent, MessageBoxComponent],
  template: `
    <div class="flex flex-col gap-siaf-lg">
      <div class="grid gap-siaf-lg sm:grid-cols-2 xl:grid-cols-4" data-kpis>
        @for (kpi of kpis(); track kpi.title) {
          <siaf-kpi-card [title]="kpi.title" [amount]="kpi.amount" [progress]="kpi.progress ?? 0" [showProgress]="kpi.progress !== null" [showIcon]="false" />
        }
      </div>

      <siaf-chart-section title="Calendario de etapas de la fase" description="Fechas configuradas por la Entidad dentro del periodo rector · la Etapa 3 inicia junto con la Etapa 1" data-grafico="calendario">
        <siaf-calendario-etapas [calendario]="calendario()" />
      </siaf-chart-section>

      <div class="grid gap-siaf-lg lg:grid-cols-2">
        <siaf-chart-section
          class="min-w-0"
          title="Uso del techo presupuestario por Genérica"
          description="Miles de S/ · necesidades a cargo de cada Área usuaria (propias y aceptadas como ATE) · clic para filtrar"
          data-grafico="techo"
        >
          <siaf-barras-horizontales [barras]="techo()" anchoValor="140px" ariaLabel="Uso del techo presupuestario por Genérica" [selectable]="true" [elegida]="genericaElegida()" (elegir)="elegirGenerica($event)" />
          <p class="m-0 flex gap-siaf-md text-xs text-[var(--sys-color-text-neutral-medium)]" aria-hidden="true">
            <span class="flex items-center gap-siaf-xxs"><span class="size-3 rounded-full bg-[var(--sys-color-bg-brand-primary)]"></span>Programado</span>
            <span class="flex items-center gap-siaf-xxs"><span class="size-3 rounded-full bg-[var(--sys-color-text-neutral-high)]"></span>Techo de la fase</span>
          </p>
        </siaf-chart-section>

        @if (filtros().vista === 'OA') {
          <siaf-chart-section class="min-w-0" title="Estado de los Anexos N° 01" description="Clic en un segmento para filtrar las Áreas usuarias" data-grafico="estado">
            @if (conAnexo()) {
              <siaf-bar-chart
                [stacked]="true"
                [categories]="['Anexos N° 01']"
                [series]="seriesEstado()"
                ariaLabel="Estado de los Anexos N° 01"
                categoryLabel="Anexos"
                [height]="90"
                [selectable]="true"
                [selectedIndex]="seleccion().estado === undefined ? null : 0"
                [selectedSeries]="seleccion().estado ?? null"
                (segmentSelected)="elegirEstado($event)"
              />
            } @else {
              <message-box text="Ninguna Área usuaria registró su Anexo N° 01." />
            }
            <p class="m-0 text-xs text-[var(--sys-color-text-neutral-medium)]">Áreas usuarias habilitadas sin Anexo N° 01 registrado: {{ sinAnexo() }}</p>
          </siaf-chart-section>

          <siaf-chart-section class="min-w-0" title="Necesidades remitidas por ATE" description="Remitidas en la Etapa 1 · clic para filtrar" data-grafico="ate">
            @if (ates().length) {
              <siaf-bar-chart
                orientation="horizontal"
                [stacked]="true"
                [categories]="nombresAte()"
                [series]="seriesAte()"
                [max]="100"
                valueSuffix="%"
                ariaLabel="Necesidades remitidas por ATE"
                categoryLabel="ATE"
                [height]="150"
                [selectable]="true"
                [selectedIndex]="ateElegida()"
                (categorySelected)="elegirAte($event)"
              />
            } @else {
              <message-box text="No hay necesidades remitidas a una ATE." />
            }
          </siaf-chart-section>
        }

        <siaf-chart-section class="min-w-0" title="Monto programado por orden de prelación" [description]="'S/ · ' + anio() + ' · clic para filtrar'" data-grafico="prelacion">
          <siaf-barras-horizontales [barras]="prelacion()" ariaLabel="Monto programado por orden de prelación" [selectable]="true" [elegida]="ordenElegida()" (elegir)="elegirOrden($event)" />
          <p class="m-0 text-xs font-bold text-[var(--sys-color-text-neutral-high)]">{{ totalPrelacion() }}</p>
        </siaf-chart-section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficasEntidadComponent {
  readonly datos = input.required<SeguimientoEntidad>();
  readonly filtros = input.required<FiltrosEntidad>();
  readonly seleccion = input.required<SeleccionEntidad>();
  readonly anexo = input.required<string>();
  readonly seleccionCambio = output<SeleccionEntidad>();

  readonly kpis = computed(() => kpisEntidad(this.datos(), this.filtros(), this.seleccion(), this.anexo()));
  readonly calendario = computed(() => calendarioDeFase(faseEntidad(this.datos(), this.filtros().fase), this.datos().fechaCorte));
  readonly anio = computed(() => etiquetaAnioEntidad(this.filtros().anio));

  // ── Techo ──
  private readonly genericas = computed(() => usoDelTecho(this.datos(), this.filtros(), this.seleccion()));
  readonly techo = computed<BarraHorizontal[]>(() =>
    this.genericas().map((g) => ({
      label: g.nombre,
      valor: g.programado,
      marca: g.techo,
      color: COLOR.primario,
      texto: `${formatoEntero(g.programado / 1000)} / ${formatoEntero(g.techo / 1000)} (${Math.round(porcentaje(g.programado, g.techo))} %)`,
    })),
  );
  readonly genericaElegida = computed(() => this.genericas().find((g) => g.codigo === this.seleccion().generica)?.nombre ?? '');

  elegirGenerica(nombre: string): void {
    const codigo = this.genericas().find((g) => g.nombre === nombre)?.codigo;
    this.cambiar({ generica: this.seleccion().generica === codigo ? undefined : codigo });
  }

  // ── Estado de los Anexos N° 01 ──
  private readonly conteo = computed(() => {
    const { fase } = this.filtros();
    const estados = areasFiltradas(this.datos(), this.filtros(), this.seleccion(), ['estado']).map((a) => situacionDe(this.datos(), fase, a.codigo).estado);
    return { porEstado: ESTADOS_ANEXO_01.map((_, i) => estados.filter((e) => e === i).length), sin: estados.filter((e) => e < 0).length };
  });
  readonly conAnexo = computed(() => this.conteo().porEstado.some((n) => n > 0));
  readonly sinAnexo = computed(() => this.conteo().sin);
  readonly seriesEstado = computed(() =>
    ESTADOS_ANEXO_01.map((e, i) => ({ name: `${e}: ${this.conteo().porEstado[i]}`, token: COLORES_ANEXO_01[i], values: [this.conteo().porEstado[i]] })),
  );

  elegirEstado(evento: { category: number; series: number } | null): void {
    this.cambiar({ estado: evento && evento.series !== this.seleccion().estado ? evento.series : undefined });
  }

  // ── ATE ──
  private readonly remitidas = computed(() => necesidadesRemitidas(this.datos(), this.filtros(), this.seleccion()));
  readonly ates = computed(() => [...new Set(this.remitidas().map((n) => n.ate!))].sort());
  readonly nombresAte = computed(() => this.ates().map((a) => `${nombreArea(this.datos(), a)} (${this.remitidas().filter((n) => n.ate === a).length})`));
  readonly seriesAte = computed(() =>
    ['Pendiente', 'Aceptado', 'Rechazado'].map((name, i) => ({
      name,
      token: [COLOR.advertencia, COLOR.exito, COLOR.peligro][i],
      values: this.ates().map((a) => {
        const suyas = this.remitidas().filter((n) => n.ate === a);
        return porcentaje(suyas.filter((n) => n.remision === i).length, suyas.length);
      }),
    })),
  );
  readonly ateElegida = computed(() => {
    const i = this.ates().indexOf(this.seleccion().ate ?? '');
    return i >= 0 ? i : null;
  });

  elegirAte(indice: number | null): void {
    this.cambiar({ ate: indice === null ? undefined : this.ates()[indice] });
  }

  // ── Prelación ──
  private readonly montos = computed(() => montoPorOrden(this.datos(), this.filtros(), this.seleccion()));
  readonly prelacion = computed<BarraHorizontal[]>(() =>
    ORDENES_PRELACION.map((label, i) => ({ label, valor: this.montos()[i], texto: formatoEntero(this.montos()[i]), color: COLOR.primario })),
  );
  readonly totalPrelacion = computed(() => `Total: S/ ${formatoMonto(this.montos().reduce((a, b) => a + b, 0))}`);
  readonly ordenElegida = computed(() => {
    const orden = this.seleccion().orden;
    return orden === undefined ? '' : ORDENES_PRELACION[orden];
  });

  elegirOrden(label: string): void {
    const i = ORDENES_PRELACION.findIndex((o) => o === label);
    this.cambiar({ orden: this.seleccion().orden === i ? undefined : i });
  }

  private cambiar(parte: SeleccionEntidad): void {
    this.seleccionCambio.emit({ ...this.seleccion(), ...parte });
  }
}

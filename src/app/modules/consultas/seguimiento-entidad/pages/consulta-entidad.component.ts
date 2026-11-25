import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { FilterPillComponent } from '../../../../shared/components/filter-pill/filter-pill.component';
import { QueryReportExportEvent, QueryReportPageComponent } from '../../../../shared/components/query-report-page/query-report-page.component';
import type { QueryReportConfig, QueryReportResult } from '../../../../shared/types/query-report.types';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { SeguimientoNacionalApiService } from '../../../reportes/seguimiento-nacional/api/seguimiento-nacional-api.service';
import { ESTADOS_ANEXO_01, GENERICAS_ENTIDAD, SeguimientoEntidad } from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import { ORDENES_PRELACION } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { SeleccionEntidad } from '../../../reportes/seguimiento-nacional/utils/seguimiento-entidad.util';
import { cumpleCondiciones } from '../../favoritos/favorito-reporte.model';
import { FavoritosPanelComponent } from '../../favoritos/favoritos-panel.component';
import { FiltrosAvanzadosPanelComponent } from '../../favoritos/filtros-avanzados-panel.component';
import { ReporteConFavoritos } from '../../favoritos/reporte-con-favoritos';
import { GraficasEntidadComponent } from '../components/graficas-entidad.component';
import { CAMPOS_ENTIDAD, configEntidad, parametrosEntidad } from '../config/consulta-entidad.config';
import { conEstado, filasAreas, leerFiltros, notaEntidad, opcionesDeAreas, pendientesOa } from '../utils/consulta-entidad.util';

/**
 * Reporte de la Entidad «Seguimiento de la programación del CMN» (Figma «C.2 Reporte Entidad»), con
 * `siaf-query-report-page`: abre sin consultar (o con el favorito predeterminado). Sin área usuaria en los parámetros es la
 * vista de la Oficina de Abastecimiento; con una, la de esa área. El backend trae la Entidad completa una vez: los
 * parámetros y la selección en los gráficos solo recalculan.
 */
@Component({
  selector: 'siaf-consulta-entidad',
  standalone: true,
  imports: [ButtonComponent, FavoritosPanelComponent, FilterPillComponent, FiltrosAvanzadosPanelComponent, GraficasEntidadComponent, QueryReportPageComponent, TagComponent],
  template: `
    <siaf-query-report-page
      [config]="config()"
      [parameters]="parametros()"
      initialView="graficas"
      [result]="resultado()"
      [loading]="cargando()"
      (queried)="consultar($event)"
      (viewChanged)="vista.set($event)"
      (favoritesRequested)="panelFavoritos.set(true)"
      (advancedFiltersRequested)="panelFiltros.set(true)"
      (exported)="exportar($event)"
    >
      @if (pildoras().length) {
        <div reportFilters class="flex flex-wrap items-center gap-siaf-xs" data-filtros-seleccion>
          <span class="text-xs text-[var(--sys-color-text-neutral-medium)]">Filtros por selección:</span>
          @for (p of pildoras(); track p.clave) {
            <siaf-filter-pill [label]="p.label" [options]="p.options" [selectedValue]="p.valor" (selectedValueChange)="cambiarSeleccion(p.clave, $event)" />
          }
          <siaf-button variant="text" size="sm" (click)="seleccion.set({})">Quitar filtros</siaf-button>
        </div>
      }

      <div reportCharts class="contents">
        @if (vista() === 'graficas' && datosConsulta(); as d) {
          @defer (on immediate) {
            <siaf-graficas-entidad [datos]="d" [filtros]="filtros()" [anexo]="anexo()" [seleccion]="seleccion()" (seleccionCambio)="seleccion.set($event)" />
          }
        }
      </div>

      <div reportSummary class="contents">
        @if (pendientes(); as p) {
          <section class="flex flex-wrap items-start gap-x-siaf-xl gap-y-siaf-sm rounded-siaf-md border border-[var(--sys-color-divider-strong)] bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm" aria-label="Pendientes de la Oficina de Abastecimiento" data-pendientes-oa>
            <div class="flex flex-col">
              <span class="text-[11px] uppercase leading-normal text-[var(--sys-color-text-neutral-medium)]">Pendientes de la Oficina de Abastecimiento</span>
              <strong class="text-base leading-normal text-[var(--sys-color-text-neutral-high)]">{{ p.total }} pendientes</strong>
              <span class="text-[11px] leading-normal text-[var(--sys-color-text-neutral-medium)]">{{ p.vence }}</span>
            </div>
            @for (x of p.partes; track x.texto) {
              <div class="flex flex-col">
                <span class="text-[11px] leading-normal text-[var(--sys-color-text-neutral-medium)]">{{ x.texto }}</span>
                <strong class="text-base leading-normal text-[var(--sys-color-text-neutral-high)]">{{ x.cantidad }}</strong>
              </div>
            }
          </section>
        }
      </div>

      <div reportPills class="contents">
        @for (texto of textosCondicion(); track $index; let i = $index) {
          <siaf-tag variant="input" [selected]="true" [removable]="true" [removeLabel]="'Quitar el filtro ' + texto" (removed)="quitarCondicion(i)">{{ texto }}</siaf-tag>
        }
      </div>
    </siaf-query-report-page>

    <siaf-filtros-avanzados-panel
      [campos]="campos()"
      [condiciones]="condiciones()"
      [abierto]="panelFiltros()"
      mensaje="Agregue una o más condiciones para refinar las Áreas usuarias de la tabla."
      (aplicado)="aplicarCondiciones($event)"
      (cerrado)="panelFiltros.set(false)"
    />
    <siaf-favoritos-panel
      [abierto]="panelFavoritos()"
      [favoritos]="favoritos()"
      [aplicadoId]="favorito()?.id ?? ''"
      [totalParametros]="7"
      [parametros]="parametrosFavorito()"
      [condiciones]="textosCondicion()"
      (aplicado)="aplicarFavorito($event)"
      (guardado)="guardarFavorito($event)"
      (eliminado)="eliminarFavorito($event)"
      (cerrado)="panelFavoritos.set(false)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaEntidadComponent extends ReporteConFavoritos implements OnInit {
  private readonly api = inject(SeguimientoNacionalApiService);

  protected readonly reporte = 'seguimiento-entidad-cmn';
  readonly campos = () => CAMPOS_ENTIDAD;
  protected readonly camposParametro = () => parametrosEntidad(this.opcionesAreas());
  protected override readonly textoVacio = 'Todas';

  readonly datos = signal<SeguimientoEntidad | null>(null);
  readonly cargando = signal(false);
  readonly seleccion = signal<SeleccionEntidad>({});

  readonly anexo = computed(() => String(this.parametros()?.['anexo'] ?? '01'));
  readonly filtros = computed(() => leerFiltros(this.parametros() ?? {}));
  /** Los datos con solo las áreas del «Estado del anexo» pedido; `null` sin consulta. */
  readonly datosConsulta = computed(() => {
    const datos = this.datos();
    const p = this.parametros();
    return datos && p ? conEstado(datos, p) : null;
  });

  readonly opcionesAreas = computed(() => opcionesDeAreas(this.datos()));
  private readonly baseConfig = computed(() => configEntidad(this.opcionesAreas()));
  readonly config = computed<QueryReportConfig>(() => {
    const datos = this.datos();
    return { ...this.baseConfig(), subtitle: this.subtitulo(), resultNote: datos ? notaEntidad(datos, this.filtros()) : undefined };
  });

  readonly resultado = computed<QueryReportResult | null>(() => {
    const datos = this.datosConsulta();
    return datos ? { rows: filasAreas(datos, this.filtros(), this.seleccion()).filter((f) => cumpleCondiciones(f, this.condiciones())) } : null;
  });

  readonly pendientes = computed(() => {
    const datos = this.datosConsulta();
    return datos && this.filtros().vista === 'OA' ? pendientesOa(datos, this.filtros(), this.seleccion()) : null;
  });

  readonly pildoras = computed(() => {
    const s = this.seleccion();
    const indices = (lista: readonly string[]) => lista.map((label, i) => ({ label, value: String(i) }));
    const todas: { clave: 'estado' | 'generica' | 'ate' | 'orden'; label: string; valor: string; options: { label: string; value: string }[] }[] = [
      { clave: 'estado', label: 'Estado', valor: s.estado === undefined ? '' : String(s.estado), options: indices(ESTADOS_ANEXO_01) },
      { clave: 'generica', label: 'Genérica', valor: s.generica ?? '', options: GENERICAS_ENTIDAD.map((g) => ({ label: g.nombre, value: g.codigo })) },
      { clave: 'ate', label: 'ATE', valor: s.ate ?? '', options: this.opcionesAreas().ates.slice(1).map((o) => ({ label: o.label, value: String(o.value) })) },
      { clave: 'orden', label: 'Prelación', valor: s.orden === undefined ? '' : String(s.orden), options: indices(ORDENES_PRELACION) },
    ];
    return todas.filter((p) => p.valor !== '');
  });

  ngOnInit(): void {
    this.cargando.set(true);
    this.api.obtenerEntidad().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.cargarFavoritos();
  }

  protected alCambiarParametros(): void {
    this.seleccion.set({});
  }

  cambiarSeleccion(clave: 'estado' | 'generica' | 'ate' | 'orden', valor: string): void {
    const nuevo = valor === '' ? undefined : clave === 'estado' || clave === 'orden' ? Number(valor) : valor;
    this.seleccion.update((s) => ({ ...s, [clave]: nuevo }));
  }

  exportar(evento: QueryReportExportEvent): void {
    this.exportarCsv(evento, this.config().columns);
  }
}

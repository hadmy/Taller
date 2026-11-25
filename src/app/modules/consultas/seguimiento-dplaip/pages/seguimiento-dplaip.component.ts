import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { FilterPillComponent } from '../../../../shared/components/filter-pill/filter-pill.component';
import { QueryReportExportEvent, QueryReportPageComponent } from '../../../../shared/components/query-report-page/query-report-page.component';
import type { QueryReportConfig, QueryReportParameters, QueryReportResult } from '../../../../shared/types/query-report.types';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { SeguimientoNacionalApiService } from '../../../reportes/seguimiento-nacional/api/seguimiento-nacional-api.service';
import { DEPARTAMENTOS, NIVELES_GOBIERNO, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { cumpleCondiciones } from '../../favoritos/favorito-reporte.model';
import { FavoritosPanelComponent } from '../../favoritos/favoritos-panel.component';
import { FiltrosAvanzadosPanelComponent } from '../../favoritos/filtros-avanzados-panel.component';
import { ReporteConFavoritos } from '../../favoritos/reporte-con-favoritos';
import { FichaEntidadComponent } from '../components/ficha-entidad.component';
import { GraficasDplaipComponent } from '../components/graficas-dplaip.component';
import { ResumenAmpliacionesComponent } from '../components/resumen-ampliaciones.component';
import { PARAMETROS_DPLAIP, camposCondicion, configDplaip } from '../config/seguimiento-dplaip.config';
import { ESTADOS_AMPLIACION_REPORTE, ESTADOS_REPORTE, SeleccionReporte, aplicarSeleccion, entidadesDeParametros, filasDetalle, notaDeCorte } from '../utils/seguimiento-dplaip.util';

const opciones = (valores: readonly string[]) => valores.map((v) => ({ label: v, value: v }));

/**
 * Reporte DPLAIP «Seguimiento nacional del CMN Programación» (Figma «C.1 Reporte DPLAIP»), con `siaf-query-report-page`:
 * abre sin consultar (o con el favorito predeterminado); con los parámetros aplicados muestra la vista gráfica —un clic en
 * los gráficos filtra todo el informe— y el detalle por Entidad, con filtros avanzados y la ficha de cada Entidad. Los
 * textos siguen al anexo consultado. «Favoritos» guarda los parámetros y los filtros avanzados.
 */
@Component({
  selector: 'siaf-seguimiento-dplaip',
  standalone: true,
  imports: [
    ButtonComponent,
    FavoritosPanelComponent,
    FichaEntidadComponent,
    FilterPillComponent,
    FiltrosAvanzadosPanelComponent,
    GraficasDplaipComponent,
    QueryReportPageComponent,
    ResumenAmpliacionesComponent,
    TagComponent,
  ],
  template: `
    @if (ficha() && datos(); as d) {
      <siaf-ficha-entidad [codigo]="ficha()" [anexo]="anexo()" [datos]="d" (volver)="ficha.set('')" />
    }

    <!-- Se oculta, no se quita: al volver de la ficha siguen la página, la búsqueda y los filtros. -->
    <div [class.hidden]="!!ficha()">
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
        (linkClicked)="ficha.set($event.row['codigo'])"
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
          @if (vista() === 'graficas' && !cargando() && !ficha() && datos(); as d) {
            @defer (on immediate) {
              <siaf-graficas-dplaip [datos]="d" [anexo]="anexo()" [entidades]="entidades()" [seleccion]="seleccion()" (seleccionCambio)="seleccion.set($event)" />
            }
          }
        </div>

        <div reportSummary class="contents">
          @if (datos(); as d) {
            <siaf-resumen-ampliaciones [datos]="d" [entidades]="seleccionadas()" />
          }
        </div>

        <div reportPills class="contents">
          @for (texto of textosCondicion(); track $index; let i = $index) {
            <siaf-tag variant="input" [selected]="true" [removable]="true" [removeLabel]="'Quitar el filtro ' + texto" (removed)="quitarCondicion(i)">{{ texto }}</siaf-tag>
          }
        </div>
      </siaf-query-report-page>
    </div>

    <siaf-filtros-avanzados-panel
      [campos]="campos()"
      [condiciones]="condiciones()"
      [abierto]="panelFiltros()"
      mensaje="Agregue una o más condiciones para refinar las Entidades de la tabla."
      (aplicado)="aplicarCondiciones($event)"
      (cerrado)="panelFiltros.set(false)"
    />
    <siaf-favoritos-panel
      [abierto]="panelFavoritos()"
      [favoritos]="favoritos()"
      [aplicadoId]="favorito()?.id ?? ''"
      [totalParametros]="8"
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
export class SeguimientoDplaipComponent extends ReporteConFavoritos implements OnInit {
  private readonly api = inject(SeguimientoNacionalApiService);

  protected readonly reporte = 'seguimiento-nacional-cmn';
  readonly anexo = computed(() => String(this.parametros()?.['anexo'] ?? '01'));
  readonly campos = computed(() => camposCondicion(this.anexo()));
  protected readonly camposParametro = () => PARAMETROS_DPLAIP;

  readonly datos = signal<SeguimientoNacional | null>(null);
  readonly cargando = signal(false);
  /** Código de la Entidad con la ficha abierta. */
  readonly ficha = signal('');
  readonly seleccion = signal<SeleccionReporte>({});

  private readonly baseConfig = computed(() => configDplaip(this.anexo()));
  readonly config = computed<QueryReportConfig>(() => {
    const datos = this.datos();
    return {
      ...this.baseConfig(),
      subtitle: this.subtitulo(),
      resultNote: datos && !this.cargando() ? notaDeCorte(datos, this.vista() === 'graficas') : undefined,
    };
  });

  /** Entidades de los parámetros, y de ellas las de la selección en los gráficos. */
  readonly entidades = computed(() => {
    const datos = this.datos();
    return datos ? entidadesDeParametros(datos, this.parametros() ?? {}) : [];
  });
  readonly seleccionadas = computed(() => aplicarSeleccion(this.entidades(), this.seleccion()));

  readonly resultado = computed<QueryReportResult | null>(() => {
    const datos = this.datos();
    if (!datos) return null;
    return { rows: filasDetalle(this.seleccionadas(), datos).filter((f) => cumpleCondiciones(f, this.condiciones())) };
  });

  readonly pildoras = computed(() => {
    const s = this.seleccion();
    const todas: { clave: keyof SeleccionReporte; label: string; options: { label: string; value: string }[] }[] = [
      { clave: 'nivel', label: 'Nivel', options: opciones(NIVELES_GOBIERNO) },
      { clave: 'estado', label: 'Estado', options: opciones(ESTADOS_REPORTE) },
      { clave: 'departamento', label: 'Departamento', options: opciones(DEPARTAMENTOS) },
      { clave: 'ampliacion', label: 'Ampliación', options: opciones(ESTADOS_AMPLIACION_REPORTE.map((a) => a.estado)) },
    ];
    return todas.filter((p) => s[p.clave]).map((p) => ({ ...p, valor: s[p.clave] ?? '' }));
  });

  ngOnInit(): void {
    this.cargarFavoritos();
  }

  protected alCambiarParametros(parametros: QueryReportParameters, antes: QueryReportParameters | null): void {
    this.seleccion.set({});
    if (parametros['periodo'] !== antes?.['periodo'] || parametros['fase'] !== antes?.['fase'] || !this.datos()) this.cargar();
  }

  private cargar(): void {
    const p = this.parametros() ?? {};
    this.cargando.set(true);
    this.api.obtener(String(p['periodo']), Number(p['fase'])).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.datos.set(null);
        this.cargando.set(false);
      },
    });
  }

  cambiarSeleccion(clave: keyof SeleccionReporte, valor: string): void {
    this.seleccion.update((s) => ({ ...s, [clave]: valor || undefined }));
  }

  exportar(evento: QueryReportExportEvent): void {
    this.exportarCsv(evento, this.config().columns);
  }
}

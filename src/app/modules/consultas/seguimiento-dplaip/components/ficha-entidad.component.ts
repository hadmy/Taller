import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { SeguimientoNacionalApiService } from '../../../reportes/seguimiento-nacional/api/seguimiento-nacional-api.service';
import { ESTADO_APROBADO, ORDENES_PRELACION, PERIODOS_SEGUIMIENTO, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { diasEntre, fechaFinEntidad, fechaVisible, formatoMonto, porcentaje, sumarDias } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';
import { MIGAS_DPLAIP } from '../config/seguimiento-dplaip.config';
import { estadoAmpliacion, estadoAnexo, etiquetaAnio, faseDe } from '../utils/seguimiento-dplaip.util';

/** Ficha de una Entidad del reporte DPLAIP (Figma C.1-RQ-007): datos, avance por fase, monto por prelación y plazo. */
@Component({
  selector: 'siaf-ficha-entidad',
  standalone: true,
  imports: [ButtonComponent, KpiCardComponent, PageShellComponent],
  template: `
    <siaf-page-shell [breadcrumbs]="migas">
      <header pageHeader class="flex items-center gap-siaf-xs bg-surface px-siaf-md py-siaf-md">
        <siaf-button class="-ml-siaf-xs" variant="text" icon="arrow_back" [iconOnly]="true" ariaLabel="Volver al reporte" (click)="volver.emit()" />
        <h1 class="m-0 min-w-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">{{ entidad().codigo }} · {{ entidad().nombre }}</h1>
      </header>

      <div class="flex flex-col gap-siaf-sm" data-ficha-entidad>
        <section [class]="tarjeta" aria-labelledby="ficha-datos">
          <h2 id="ficha-datos" [class]="titulo">Datos de la Entidad</h2>
          <dl class="m-0 grid gap-siaf-md sm:grid-cols-2 xl:grid-cols-4">
            @for (d of datosEntidad(); track d.label) {
              <div>
                <dt [class]="etiqueta">{{ d.label }}</dt>
                <dd [class]="valor">{{ d.value }}</dd>
              </div>
            }
          </dl>
        </section>

        <section [class]="tarjeta" aria-labelledby="ficha-avance">
          <h2 id="ficha-avance" [class]="titulo">Avance por fase · Periodo {{ programa() }}</h2>
          <div class="grid gap-siaf-lg lg:grid-cols-3">
            @for (f of fases(); track f.titulo) {
              <div class="flex flex-col gap-siaf-xs">
                <siaf-kpi-card [title]="f.titulo" [amount]="f.estado" [progress]="f.avance" [showIcon]="false" />
                <p class="m-0 text-xs leading-normal text-[var(--sys-color-text-neutral-medium)]">{{ f.detalle }}</p>
              </div>
            } @empty {
              <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">Cargando el avance por fase…</p>
            }
          </div>
        </section>

        <div class="grid gap-siaf-sm lg:grid-cols-2">
          <section [class]="tarjeta" aria-labelledby="ficha-monto">
            <h2 id="ficha-monto" [class]="titulo">Monto programado por orden de prelación · Fase {{ datos().fase }}</h2>
            <div class="siaf-table-scroll">
              <table class="w-full border-collapse text-xs text-[var(--sys-color-text-neutral-medium)]" aria-labelledby="ficha-monto">
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="px-siaf-sm py-siaf-sm text-left" scope="col">Orden de prelación</th>
                    @for (k of anios; track k) {
                      <th class="whitespace-nowrap px-siaf-sm py-siaf-sm text-right" scope="col">{{ anio(k) }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (fila of montos().filas; track fila.orden) {
                    <tr class="border-b border-[var(--sys-color-divider-default)]">
                      <td class="px-siaf-sm py-siaf-xs">{{ fila.orden }}</td>
                      @for (m of fila.montos; track $index) {
                        <td class="px-siaf-sm py-siaf-xs text-right">{{ m }}</td>
                      }
                    </tr>
                  }
                  <tr class="border-b border-[var(--sys-color-divider-default)] font-bold text-[var(--sys-color-text-neutral-high)]">
                    <td class="px-siaf-sm py-siaf-xs">Total</td>
                    @for (m of montos().total; track $index) {
                      <td class="px-siaf-sm py-siaf-xs text-right">{{ m }}</td>
                    }
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section [class]="tarjeta" aria-labelledby="ficha-plazo">
            <h2 id="ficha-plazo" [class]="titulo">Situación frente al plazo · Fase {{ datos().fase }}</h2>
            <dl class="m-0 flex flex-col gap-siaf-md">
              @for (d of plazo(); track d.label) {
                <div>
                  <dt [class]="etiqueta">{{ d.label }}</dt>
                  <dd [class]="valor">{{ d.value }}</dd>
                </div>
              }
            </dl>
          </section>
        </div>
      </div>
    </siaf-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaEntidadComponent {
  private readonly api = inject(SeguimientoNacionalApiService);

  readonly codigo = input.required<string>();
  /** «01» o «02»: el anexo consultado. */
  readonly anexo = input.required<string>();
  readonly datos = input.required<SeguimientoNacional>();
  readonly volver = output<void>();

  readonly migas = MIGAS_DPLAIP;
  readonly tarjeta = 'flex min-w-0 flex-col gap-siaf-md rounded-siaf-md bg-surface p-siaf-lg';
  readonly titulo = 'm-0 text-sm font-bold uppercase leading-normal text-[var(--sys-color-text-neutral-high)]';
  readonly etiqueta = 'text-xs leading-normal text-[var(--sys-color-text-neutral-low)]';
  readonly valor = 'm-0 text-sm font-bold leading-normal text-[var(--sys-color-text-neutral-high)]';
  readonly anios = [0, 1, 2];
  readonly anio = (k: number): string => etiquetaAnio(this.datos().periodo, k);

  /** El seguimiento de las tres fases del periodo. */
  private readonly porFase = signal<SeguimientoNacional[]>([]);

  constructor() {
    effect((onCleanup) => {
      const periodo = this.datos().periodo;
      const consulta = forkJoin([1, 2, 3].map((fase) => this.api.obtener(periodo, fase))).subscribe((fases) => this.porFase.set(fases));
      onCleanup(() => consulta.unsubscribe());
    });
  }

  readonly entidad = computed(() => this.datos().entidades.find((e) => e.codigo === this.codigo())!);
  readonly programa = computed(() => PERIODOS_SEGUIMIENTO.find((p) => p.valor === this.datos().periodo)?.etiqueta ?? this.datos().periodo);

  readonly datosEntidad = computed(() => {
    const e = this.entidad();
    return [
      { label: 'Nivel de gobierno (Grupo)', value: e.nivel },
      { label: 'Área (Clasificador Institucional)', value: e.area },
      { label: 'Departamento (ubigeo)', value: e.departamento },
      { label: 'Áreas usuarias habilitadas', value: String(e.areasUsuarias) },
    ];
  });

  readonly fases = computed(() =>
    this.porFase().flatMap((datos) => {
      const e = datos.entidades.find((x) => x.codigo === this.codigo());
      if (!e) return [];
      const fase = faseDe(datos);
      const aprobado = e.diaAprobacion !== null ? ` · último Anexo N° ${this.anexo()} aprobado el ${fechaVisible(sumarDias(fase.inicio, e.diaAprobacion))}` : '';
      return [
        {
          titulo: `Fase ${fase.numero} · ${fase.nombre}`,
          estado: estadoAnexo(e),
          avance: e.estado === ESTADO_APROBADO ? 100 : porcentaje(e.anexos01Aprobados, e.areasUsuarias),
          detalle: `Anexos N° 01 aprobados: ${e.anexos01Aprobados} / ${e.areasUsuarias}${aprobado} · Periodo rector: ${fechaVisible(fase.inicio)} al ${fechaVisible(fase.fin)}`,
        },
      ];
    }),
  );

  readonly montos = computed(() => {
    const e = this.entidad();
    return {
      filas: ORDENES_PRELACION.map((orden, i) => ({ orden, montos: e.montos.map((m) => formatoMonto(m * (e.prelacion[i] ?? 0))) })),
      total: e.montos.map(formatoMonto),
    };
  });

  readonly plazo = computed(() => {
    const e = this.entidad();
    const datos = this.datos();
    const fin = fechaFinEntidad(e, faseDe(datos));
    return [
      { label: 'Fecha de corte', value: fechaVisible(datos.fechaCorte) },
      { label: 'Fecha fin de la fase', value: fechaVisible(fin) },
      { label: 'Días restantes', value: String(Math.max(0, diasEntre(datos.fechaCorte, fin))) },
      { label: `Estado del Anexo N° ${this.anexo()}`, value: estadoAnexo(e) },
      { label: 'Solicitud de ampliación de plazo de fase', value: estadoAmpliacion(e.ampliacion) },
    ];
  });
}

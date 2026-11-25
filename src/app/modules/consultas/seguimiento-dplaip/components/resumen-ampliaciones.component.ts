import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EntidadSeguimiento, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { fechaVisible, formatoEntero, porcentajeVisible } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';
import { ESTADOS_AMPLIACION_REPORTE, contarAmpliaciones } from '../utils/seguimiento-dplaip.util';

/** Franja «Solicitudes de ampliación de plazo de fase» sobre el detalle por Entidad (Figma C.1-RQ-006). */
@Component({
  selector: 'siaf-resumen-ampliaciones',
  standalone: true,
  template: `
    <section class="flex flex-wrap items-start gap-x-siaf-xl gap-y-siaf-sm rounded-siaf-md border border-[var(--sys-color-divider-strong)] bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm" aria-label="Solicitudes de ampliación de plazo de fase" data-resumen-ampliaciones>
      <div class="flex flex-col">
        <span class="text-[11px] uppercase leading-normal text-[var(--sys-color-text-neutral-medium)]">Solicitudes de ampliación de plazo de fase</span>
        <strong class="text-base leading-normal text-[var(--sys-color-text-neutral-high)]">{{ entero(conteo().total) }} solicitudes</strong>
        <span class="text-[11px] leading-normal text-[var(--sys-color-text-neutral-medium)]">Fase {{ datos().fase }} · al {{ corte() }}</span>
      </div>
      @for (a of estados; track a.valor; let i = $index) {
        <div class="flex flex-col">
          <span class="flex items-center gap-siaf-xxs text-[11px] leading-normal text-[var(--sys-color-text-neutral-medium)]">
            <span class="size-2 shrink-0 rounded-full" [style.background-color]="'var(' + a.color + ')'" aria-hidden="true"></span>{{ a.estado }}
          </span>
          <strong class="text-sm leading-normal text-[var(--sys-color-text-neutral-high)]">{{ entero(conteo().cantidades[i]) }} · {{ parte(conteo().cantidades[i], conteo().total) }}</strong>
          <span class="text-[11px] leading-normal text-[var(--sys-color-text-neutral-medium)]">{{ a.detalle }}</span>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenAmpliacionesComponent {
  readonly datos = input.required<SeguimientoNacional>();
  readonly entidades = input.required<EntidadSeguimiento[]>();

  readonly estados = ESTADOS_AMPLIACION_REPORTE;
  readonly entero = formatoEntero;
  readonly parte = porcentajeVisible;
  readonly conteo = computed(() => contarAmpliaciones(this.entidades()));
  readonly corte = computed(() => fechaVisible(this.datos().fechaCorte));
}

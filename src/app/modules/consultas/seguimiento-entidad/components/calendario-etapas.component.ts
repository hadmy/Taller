import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CalendarioFase, EtapaCalendario } from '../utils/consulta-entidad.util';

/** «Calendario de etapas de la fase» (Figma C.2-RQ-020): cada etapa sobre el periodo rector y la fecha de corte. */
@Component({
  selector: 'siaf-calendario-etapas',
  standalone: true,
  template: `
    <div class="flex flex-col gap-siaf-xs" data-calendario-etapas>
      <p class="m-0 text-right text-xs text-[var(--sys-color-text-neutral-medium)]">{{ calendario().rango }}</p>
      <div class="grid grid-cols-1 gap-siaf-sm md:grid-cols-[310px_minmax(0,1fr)] md:gap-x-siaf-md">
        <ul class="m-0 flex list-none flex-col gap-siaf-md p-0 pt-siaf-lg">
          @for (e of calendario().etapas; track e.nombre) {
            <li class="flex h-10 flex-col justify-center">
              <span class="text-sm leading-tight text-[var(--sys-color-text-neutral-high)]">{{ e.nombre }}</span>
              <span class="text-xs text-[var(--sys-color-text-neutral-low)]">{{ e.detalle }}<span class="sr-only">, {{ e.texto }}</span></span>
            </li>
          }
        </ul>
        <div class="relative pb-siaf-lg pt-siaf-lg" aria-hidden="true">
          @for (m of calendario().marcas; track m.texto) {
            <span class="absolute bottom-siaf-lg top-siaf-lg w-px bg-[var(--sys-color-divider-default)]" [style.left.%]="m.en"></span>
            <span class="absolute bottom-0 -translate-x-1/2 text-xs text-[var(--sys-color-text-neutral-low)]" [style.left.%]="m.en">{{ m.texto }}</span>
          }
          <div class="relative flex flex-col gap-siaf-md">
            @for (e of calendario().etapas; track e.nombre) {
              <div class="relative h-10">
                <span
                  class="absolute top-1/2 block h-6 -translate-y-1/2 truncate rounded-siaf-xs px-siaf-xs text-xs font-bold leading-6"
                  [class]="clase(e)"
                  [style.left.%]="e.desde"
                  [style.width.%]="e.ancho"
                  >{{ e.texto }}</span
                >
              </div>
            }
          </div>
          @if (calendario().hoy; as hoy) {
            <span class="absolute bottom-siaf-lg top-siaf-md border-l-2 border-dashed border-[var(--sys-color-text-neutral-high)]" [style.left.%]="hoy.en"></span>
            <span class="absolute top-0 whitespace-nowrap pl-siaf-xxs text-xs font-bold text-[var(--sys-color-text-neutral-high)]" [style.left.%]="hoy.en">{{ hoy.texto }}</span>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioEtapasComponent {
  readonly calendario = input.required<CalendarioFase>();

  clase(e: EtapaCalendario): string {
    if (e.situacion === 'por-iniciar') return 'bg-[var(--sys-color-bg-surfaces-surface-high)] text-[var(--sys-color-text-neutral-high)]';
    if (e.situacion === 'concluida') return 'bg-[var(--sys-color-bg-feedback-light-info)] text-[var(--sys-color-text-neutral-high)]';
    return e.consolidacion
      ? 'bg-[var(--sys-color-bg-feedback-dark-default)] text-[var(--sys-color-text-brand-white)]'
      : 'bg-[var(--sys-color-bg-brand-primary)] text-[var(--sys-color-text-brand-white)]';
  }
}

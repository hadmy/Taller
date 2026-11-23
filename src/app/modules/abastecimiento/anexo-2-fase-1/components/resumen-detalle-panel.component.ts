import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { AreaUsuariaAnexo1 } from '../models/anexo-2-fase-1.model';
import { ESTILO_EVALUACION_ANEXO_1 } from '../utils/evaluacion-anexo-1.util';
import { formatearSoles } from '../utils/formato.util';

/** Lo que muestra el panel: la tarjeta del resumen que se pulsó y sus áreas usuarias. */
export interface DetalleResumen {
  titulo: string;
  descripcion: string;
  areas: AreaUsuariaAnexo1[];
}

/**
 * Detalle de una tarjeta de «Resumen del proceso de consolidación» de la Solicitud de CMN - Anexo N.º 02: panel
 * lateral de solo lectura (`siaf-side-panel`, sin pie) con las áreas usuarias que cuenta la tarjeta, su número de
 * necesidades, monto programado, estado de la evaluación y observación, y una fila de totales. Las áreas las filtra la
 * solicitud desde su lista actual, así que el panel refleja lo último que se agregó, quitó o evaluó.
 */
@Component({
  selector: 'siaf-resumen-detalle-panel',
  standalone: true,
  imports: [SidePanelComponent, StatusTagComponent],
  template: `
    <siaf-side-panel [open]="!!datos()" [title]="datos()?.titulo ?? ''" [showFooter]="false" (closed)="closed.emit()">
      @if (datos(); as d) {
        <p class="m-0 mb-siaf-md text-sm text-[var(--sys-color-text-neutral-medium)]">{{ d.descripcion }}</p>
        @if (d.areas.length === 0) {
          <p class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-[var(--sys-color-text-neutral-medium)]">
            Aún no hay Anexos N.º 01 en esta categoría.
          </p>
        } @else {
          <div class="overflow-auto rounded-siaf-sm border border-[var(--sys-color-divider-default)]">
            <table class="w-full min-w-[560px] border-collapse text-sm text-[var(--sys-color-text-neutral-high)]">
              <thead class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase">
                <tr>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Área usuaria</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-right">Necesidades</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-right">Monto programado A01</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Estado</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Observación</th>
                </tr>
              </thead>
              <tbody>
                @for (area of d.areas; track area.id) {
                  <tr class="border-b border-[var(--sys-color-divider-default)]">
                    <td class="px-siaf-md py-siaf-sm">{{ area.nombre }}</td>
                    <td class="px-siaf-md py-siaf-sm text-right">{{ area.items }}</td>
                    <td class="whitespace-nowrap px-siaf-md py-siaf-sm text-right">{{ soles(area.montoProgramado) }}</td>
                    <td class="px-siaf-md py-siaf-sm">
                      <siaf-status-tag appearance="soft" size="small" [tone]="estilo[area.estadoEvaluacion].tone">
                        {{ estilo[area.estadoEvaluacion].texto }}
                      </siaf-status-tag>
                    </td>
                    <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ area.comentarioEvaluacion || '-' }}</td>
                  </tr>
                }
              </tbody>
              <tfoot class="bg-[var(--sys-color-bg-surfaces-surface-low)] font-bold">
                <tr>
                  <td class="px-siaf-md py-siaf-sm">Total ({{ d.areas.length }})</td>
                  <td class="px-siaf-md py-siaf-sm text-right">{{ totalNecesidades() }}</td>
                  <td class="whitespace-nowrap px-siaf-md py-siaf-sm text-right">{{ soles(totalMonto()) }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      }
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenDetallePanelComponent {
  readonly datos = signal<DetalleResumen | null>(null);

  /** Tarjeta pulsada con sus áreas (`null` cierra el panel). */
  @Input() set detalle(valor: DetalleResumen | null) {
    this.datos.set(valor);
  }
  @Output() closed = new EventEmitter<void>();

  readonly estilo = ESTILO_EVALUACION_ANEXO_1;
  readonly totalNecesidades = computed(() => (this.datos()?.areas ?? []).reduce((suma, a) => suma + a.items, 0));
  readonly totalMonto = computed(() => (this.datos()?.areas ?? []).reduce((suma, a) => suma + a.montoProgramado, 0));

  soles(monto: number): string {
    return formatearSoles(monto);
  }
}

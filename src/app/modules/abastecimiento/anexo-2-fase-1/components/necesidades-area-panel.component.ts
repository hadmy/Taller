import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../shared/ui/summary-card/summary-card.component';
import { TextFieldComponent } from '../../../../shared/ui/text-field/text-field.component';
import { AreaModificacion, ItemModificacion } from '../models/anexo-2-fase-1.model';
import { fechaCorta, formatearSoles } from '../utils/formato.util';
import { cantidadDe, itemCambiado, montoDeEntrada, montoNuevo, montoVigente } from '../utils/modificacion-anexo-2.util';

/**
 * «Modificar necesidades del área» de la Modificación del Anexo 02 (Figma «B.1-RC-005»): panel lateral con las necesidades
 * vigentes del área usuaria. En un bien se cambia la cantidad (el monto sale del precio unitario) y en un servicio, el monto.
 *
 * «Aceptar» se habilita con algún cambio y todos los montos mayores que cero, y entrega el área con sus montos nuevos; se
 * graba con la solicitud. En solo lectura (fuera del plazo o sin editar) muestra lo vigente y lo modificado, sin pie.
 */
@Component({
  selector: 'siaf-necesidades-area-panel',
  standalone: true,
  imports: [FormTableSearchComponent, TextFieldComponent, SidePanelComponent, SummaryCardComponent],
  template: `
    <siaf-side-panel
      [open]="!!area()"
      [title]="editable ? 'Modificar necesidades del área' : 'Necesidades del área'"
      [showFooter]="editable"
      [confirmDisabled]="!puedeAceptar()"
      (closed)="closed.emit()"
      (canceled)="closed.emit()"
      (confirmed)="aceptar()"
    >
      @if (area(); as a) {
        <div class="flex flex-col gap-siaf-md">
          <siaf-summary-card [fields]="campos()" [bordered]="true" [showClose]="false" />
          <siaf-form-table-search
            [value]="busqueda()"
            placeholder="Buscar"
            ariaLabel="Buscar necesidades del área"
            [showActions]="false"
            (typing)="busqueda.set($event)"
            (valueChange)="busqueda.set($event)"
          />
          <div class="overflow-auto">
            <table class="w-full min-w-[960px] border-collapse text-sm text-[var(--sys-color-text-neutral-medium)]">
              <thead>
                <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Ítem</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Unidad de medida</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-right">Precio unitario</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-right">Monto vigente</th>
                  <th class="w-48 border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Cantidad o monto</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-right">Monto nuevo</th>
                </tr>
              </thead>
              <tbody>
                @for (item of itemsFiltrados(); track item.id) {
                  <tr class="border-b border-[var(--sys-color-divider-default)]" [class.bg-[var(--sys-color-bg-states-light-selected)]]="cambiado(item)" [attr.data-necesidad]="item.id">
                    <td class="px-siaf-md py-siaf-sm">{{ item.item }}</td>
                    <td class="px-siaf-md py-siaf-sm">{{ item.descripcion }}</td>
                    <td class="px-siaf-md py-siaf-sm">{{ item.unidadMedida }}</td>
                    <td class="whitespace-nowrap px-siaf-md py-siaf-sm text-right">{{ item.precioUnitario ? soles(item.precioUnitario) : '-' }}</td>
                    <td class="whitespace-nowrap px-siaf-md py-siaf-sm text-right">{{ soles(item.montoVigente) }}</td>
                    <td class="px-siaf-md py-siaf-xs">
                      @if (editable) {
                        <siaf-input
                          type="decimal"
                          [label]="(item.tipo === 'Bien' ? 'Cantidad de ' : 'Monto de ') + item.descripcion"
                          [hideLabel]="true"
                          [decimals]="item.tipo === 'Bien' ? 0 : 2"
                          [autoSuccess]="false"
                          [value]="item.tipo === 'Bien' ? (cantidad(item) ?? '') : item.monto"
                          [error]="item.monto > 0 ? '' : 'Debe ser mayor que cero'"
                          (valueChange)="cambiar(item.id, $event)"
                        />
                      } @else {
                        {{ item.tipo === 'Bien' ? cantidad(item) : soles(item.monto) }}
                      }
                    </td>
                    <td class="whitespace-nowrap px-siaf-md py-siaf-sm text-right font-medium text-[var(--sys-color-text-neutral-high)]">{{ soles(item.monto) }}</td>
                  </tr>
                } @empty {
                  <tr><td class="px-siaf-md py-siaf-sm" colspan="7">No hay necesidades que coincidan con la búsqueda.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NecesidadesAreaPanelComponent {
  readonly soles = formatearSoles;
  readonly cantidad = cantidadDe;
  readonly cambiado = itemCambiado;

  /** Copia de trabajo del área: cancelar la descarta. */
  readonly area = signal<AreaModificacion | null>(null);
  readonly busqueda = signal('');
  private readonly foto = signal('');

  @Input() set abierta(area: AreaModificacion | null) {
    this.area.set(area ? { ...area, items: area.items.map((i) => ({ ...i })) } : null);
    this.foto.set(JSON.stringify(area?.items.map((i) => i.monto) ?? []));
    this.busqueda.set('');
  }
  /** Se pueden cambiar los montos (creador, en edición y dentro del plazo). */
  @Input() editable = false;
  @Output() aceptada = new EventEmitter<AreaModificacion>();
  @Output() closed = new EventEmitter<void>();

  readonly campos = computed<SummaryCardField[]>(() => {
    const a = this.area();
    if (!a) return [];
    return [
      { label: 'Área usuaria', value: a.nombre },
      { label: 'Monto vigente', value: formatearSoles(montoVigente(a)) },
      { label: 'Monto nuevo', value: formatearSoles(montoNuevo(a)) },
      { label: 'Plazo para modificación', value: `Hasta ${fechaCorta(a.plazoModificacion)}` },
    ];
  });

  readonly itemsFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const items = this.area()?.items ?? [];
    return texto ? items.filter((i) => i.item.includes(texto) || i.descripcion.toLowerCase().includes(texto)) : items;
  });

  readonly puedeAceptar = computed(() => {
    const items = this.area()?.items ?? [];
    return items.every((i) => i.monto > 0) && JSON.stringify(items.map((i) => i.monto)) !== this.foto();
  });

  cambiar(itemId: string, valor: unknown): void {
    this.area.update((a) =>
      a ? { ...a, items: a.items.map((i): ItemModificacion => (i.id === itemId ? { ...i, monto: montoDeEntrada(i, valor) } : i)) } : a,
    );
  }

  aceptar(): void {
    const area = this.area();
    if (area && this.puedeAceptar()) this.aceptada.emit(area);
  }
}

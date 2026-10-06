import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { FocoDirective } from '../../../../shared/ui/foco/foco.directive';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { CatalogoItem } from '../models/area-usuaria.model';

/**
 * Diálogo «Buscar commodities u ítems» del detalle de un área usuaria (Figma «Conf-Areas usuarias-06»): buscador y
 * tabla del catálogo con una casilla por fila; «Aceptar» emite los ítems marcados y «Cancelar» (o la ✕ o Escape) cierra
 * sin cambios. Es más ancho que `siaf-modal` (que mide 500 px y centra el título), por eso lleva su propio armazón.
 */
@Component({
  selector: 'siaf-buscar-items-dialog',
  standalone: true,
  imports: [ButtonComponent, FocoDirective, FormTableSearchComponent, IconComponent],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-siaf-md" role="presentation">
        <section
          class="relative flex max-h-[calc(100vh-32px)] w-full max-w-[1000px] flex-col rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-highest)] shadow-siaf-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="buscar-items-titulo"
          tabindex="-1"
          [siafFoco]="open"
          (siafFocoEscape)="cancelar()"
        >
          <header class="flex items-center justify-between px-siaf-lg py-siaf-md">
            <h2 id="buscar-items-titulo" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
              Buscar commodities u ítems
            </h2>
            <button
              class="grid size-6 place-items-center rounded-siaf-sm text-[var(--sys-color-text-neutral-medium)] hover:bg-surface-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
              type="button"
              (click)="cancelar()"
            >
              <siaf-icon name="close" [size]="20" label="Cerrar" [decorative]="false" />
            </button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col gap-siaf-md overflow-hidden px-siaf-lg pb-siaf-md">
            <siaf-form-table-search [value]="busqueda()" placeholder="Buscar" ariaLabel="Buscar commodity o ítem" (valueChange)="busqueda.set($event)" />

            <div class="min-h-0 flex-1 overflow-auto rounded-siaf-md border border-[var(--sys-color-divider-default)]">
              <table class="w-full min-w-[720px] border-collapse text-sm">
                <thead
                  class="[&_th]:sticky [&_th]:top-0 [&_th]:z-[2] [&_th]:bg-surface [&_th]:bg-[linear-gradient(var(--sys-color-bg-surfaces-surface-high),var(--sys-color-bg-surfaces-surface-high))] [&_th]:shadow-[inset_0_-1px_0_var(--sys-color-divider-strong)]"
                >
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-12 border-b border-[var(--sys-color-divider-strong)] p-siaf-sm"></th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-center">Commodity</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción commodity</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Item</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción item</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fila of filasFiltradas(); track fila.id) {
                    <tr
                      class="border-b border-[var(--sys-color-divider-default)] last:border-b-0"
                      [class.bg-[var(--sys-color-bg-states-light-selected)]]="seleccionados().has(fila.id)"
                    >
                      <td class="p-siaf-sm">
                        <input
                          class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                          type="checkbox"
                          [attr.aria-label]="'Seleccionar ' + fila.descripcionItem"
                          [checked]="seleccionados().has(fila.id)"
                          (change)="alternar(fila.id, $any($event.target).checked)"
                        />
                      </td>
                      <td class="px-siaf-md py-siaf-sm text-center text-[var(--sys-color-text-neutral-medium)]">{{ fila.commodity }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.descripcionCommodity }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.item }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.descripcionItem }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="5">
                        {{ catalogo.length ? 'No se encontraron commodities ni ítems.' : 'Cargando commodities e ítems…' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <footer class="flex justify-end gap-siaf-sm border-t border-[var(--sys-color-divider-default)] px-siaf-lg py-siaf-md">
            <siaf-button variant="outline" (click)="cancelar()">Cancelar</siaf-button>
            <siaf-button variant="filled" [disabled]="seleccionados().size === 0" (click)="aceptar()">Aceptar</siaf-button>
          </footer>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscarItemsDialogComponent {
  /** Filas del catálogo que se ofrecen (el padre ya quitó las que el área tiene en la pestaña). */
  @Input() set catalogo(valor: CatalogoItem[]) {
    this.catalogoSig.set(valor ?? []);
  }
  get catalogo(): CatalogoItem[] {
    return this.catalogoSig();
  }
  /** Texto con el que arranca el buscador (lo que se escribió en el detalle). */
  @Input() set textoInicial(valor: string) {
    this.busqueda.set(valor ?? '');
  }
  @Input() set open(valor: boolean) {
    this.abierto.set(valor);
    if (valor) this.seleccionados.set(new Set());
  }
  get open(): boolean {
    return this.abierto();
  }

  @Output() readonly confirmed = new EventEmitter<CatalogoItem[]>();
  @Output() readonly canceled = new EventEmitter<void>();

  private readonly abierto = signal(false);
  private readonly catalogoSig = signal<CatalogoItem[]>([]);
  readonly busqueda = signal('');
  readonly seleccionados = signal<Set<string>>(new Set());

  readonly filasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.catalogo;
    return this.catalogo.filter((f) =>
      [f.commodity, f.descripcionCommodity, f.item, f.descripcionItem].some((valor) => valor.toLowerCase().includes(texto)),
    );
  });

  alternar(id: string, marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      if (marcado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  aceptar(): void {
    const elegidos = this.catalogo.filter((f) => this.seleccionados().has(f.id));
    if (elegidos.length) this.confirmed.emit(elegidos);
  }

  cancelar(): void {
    this.canceled.emit();
  }
}

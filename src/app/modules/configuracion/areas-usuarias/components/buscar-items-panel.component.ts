import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { CatalogoItem } from '../models/area-usuaria.model';

/**
 * Panel lateral «Buscar commodities u ítems» del detalle de un área usuaria (Figma «Conf-Areas usuarias-04 2», nodo 5056:124676), armado
 * con `siaf-side-panel`: buscador y tabla del catálogo con una casilla por fila; «Aceptar» emite los ítems marcados y
 * «Cancelar» (o la ✕ o Escape) cierra sin cambios. Se abre con la lupa de la sección «Comodities» del detalle.
 */
@Component({
  selector: 'siaf-buscar-items-panel',
  standalone: true,
  imports: [FormTableSearchComponent, SidePanelComponent],
  template: `
    <siaf-side-panel
      [open]="abierto()"
      title="Buscar commodities u ítems"
      [confirmDisabled]="seleccionados().size === 0"
      (closed)="canceled.emit()"
      (confirmed)="aceptar()"
    >
      <div class="flex flex-col gap-siaf-md">
        <siaf-form-table-search [value]="busqueda()" placeholder="Buscar" ariaLabel="Buscar commodity o ítem" (valueChange)="buscar($event)" />

        <div class="flex h-10 items-center pl-siaf-sm">
          <input
            class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
            type="checkbox"
            aria-label="Seleccionar todos los ítems"
            [checked]="todasVisiblesSeleccionadas()"
            [indeterminate]="algunasVisiblesSeleccionadas()"
            [disabled]="filasFiltradas().length === 0"
            (change)="alternarVisibles($any($event.target).checked)"
          />
        </div>

        <div class="overflow-auto">
          <table class="w-full min-w-[1000px] table-fixed border-collapse text-sm">
            <thead
              class="[&_th]:sticky [&_th]:top-0 [&_th]:z-[2] [&_th]:bg-surface [&_th]:bg-[linear-gradient(var(--sys-color-bg-surfaces-surface-high),var(--sys-color-bg-surfaces-surface-high))] [&_th]:shadow-[inset_0_-1px_0_var(--sys-color-divider-strong)]"
            >
              <tr class="text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                <th class="w-12 border-b border-[var(--sys-color-divider-strong)] p-siaf-sm"></th>
                <th class="w-[210px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-center">Commodity</th>
                <th class="w-[370px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción commodity</th>
                <th class="w-[210px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Item</th>
                <th class="w-[370px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción item</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of filasFiltradas(); track fila.id) {
                <tr
                  class="h-12 border-b border-[var(--sys-color-divider-default)]"
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
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscarItemsPanelComponent {
  /** Filas del catálogo que se ofrecen (el padre ya quitó las que el área tiene en la pestaña). */
  @Input() set catalogo(valor: CatalogoItem[]) {
    this.catalogoSig.set(valor ?? []);
  }
  get catalogo(): CatalogoItem[] {
    return this.catalogoSig();
  }

  @Input() set open(valor: boolean) {
    this.abierto.set(valor);
    if (valor) {
      this.seleccionados.set(new Set());
      this.busqueda.set('');
    }
  }

  @Output() readonly confirmed =new EventEmitter<CatalogoItem[]>();
  @Output() readonly canceled = new EventEmitter<void>();

  private readonly catalogoSig = signal<CatalogoItem[]>([]);
  readonly abierto = signal(false);
  readonly busqueda = signal('');
  readonly seleccionados = signal<Set<string>>(new Set());

  readonly filasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.catalogoSig();
    return this.catalogoSig().filter((f) =>
      [f.commodity, f.descripcionCommodity, f.item, f.descripcionItem].some((valor) => valor.toLowerCase().includes(texto)),
    );
  });

  readonly todasVisiblesSeleccionadas = computed(() => {
    const visibles = this.filasFiltradas();
    return visibles.length > 0 && visibles.every((f) => this.seleccionados().has(f.id));
  });

  readonly algunasVisiblesSeleccionadas = computed(
    () => this.filasFiltradas().some((f) => this.seleccionados().has(f.id)) && !this.todasVisiblesSeleccionadas(),
  );

  buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  /** Check de la cabecera: marca o desmarca todos los ítems visibles. */
  alternarVisibles(marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      for (const f of this.filasFiltradas()) {
        if (marcado) next.add(f.id);
        else next.delete(f.id);
      }
      return next;
    });
  }

  alternar(id: string, marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      if (marcado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  aceptar(): void {
    const elegidos = this.catalogoSig().filter((f) => this.seleccionados().has(f.id));
    if (elegidos.length) this.confirmed.emit(elegidos);
  }
}


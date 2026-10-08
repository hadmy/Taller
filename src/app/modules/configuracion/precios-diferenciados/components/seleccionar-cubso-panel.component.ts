import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CatalogoCubso } from '../models/precio-diferenciado.model';

/**
 * Panel lateral «Seleccionar ítems» de la configuración de precios diferenciados (Figma «CMN Programación ·
 * Configuración», nodos 5531:59959, 5531:59740, 4683:867558 y 4683:867570), armado con `siaf-side-panel`.
 * Hasta que se busca (Enter o la lupa) muestra el aviso «No se ha seleccionado ningún tipo…»; con la búsqueda, la
 * tabla de CUBSO del catálogo con una casilla por fila. «Aceptar» emite los marcados y «Cancelar» (o la ✕ o Escape)
 * cierra sin cambios. Se abre con el «+» de la pantalla.
 */
@Component({
  selector: 'siaf-seleccionar-cubso-panel',
  standalone: true,
  imports: [FormTableSearchComponent, PaginationComponent, SidePanelComponent],
  template: `
    <siaf-side-panel
      [open]="abierto()"
      title="Seleccionar ítems"
      [confirmDisabled]="seleccionados().size === 0"
      (closed)="canceled.emit()"
      (confirmed)="aceptar()"
    >
      <div class="flex flex-col gap-siaf-lg">
        <siaf-form-table-search [value]="busqueda() ?? ''" placeholder="Buscar" ariaLabel="Buscar CUBSO" (valueChange)="buscar($event)" />

        @if (busqueda() === null) {
          <p class="m-0 rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] p-siaf-md text-sm text-[var(--sys-color-text-neutral-medium)]">
            No se ha seleccionado ningún tipo. Realice una búsqueda para realizar una selección.
          </p>
        } @else {
          <div class="flex flex-col gap-siaf-md">
            <div class="flex items-center px-siaf-sm">
              <input
                class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                type="checkbox"
                aria-label="Seleccionar todos los CUBSO"
                [checked]="todasVisiblesSeleccionadas()"
                [indeterminate]="algunasVisiblesSeleccionadas()"
                [disabled]="filasPaginadas().length === 0"
                (change)="alternarVisibles($any($event.target).checked)"
              />
            </div>

            <div class="overflow-auto">
              <table class="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-12 border-b border-[var(--sys-color-divider-strong)] p-siaf-sm"></th>
                    <th class="w-56 border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Código CUBSO</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fila of filasPaginadas(); track fila.id) {
                    <tr
                      class="border-b border-[var(--sys-color-divider-default)]"
                      [class.bg-[var(--sys-color-bg-states-light-selected)]]="seleccionados().has(fila.id)"
                    >
                      <td class="p-siaf-sm">
                        <input
                          class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                          type="checkbox"
                          [attr.aria-label]="'Seleccionar CUBSO ' + fila.codigoCubso"
                          [checked]="seleccionados().has(fila.id)"
                          (change)="alternar(fila.id, $any($event.target).checked)"
                        />
                      </td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.codigoCubso }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.descripcion }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="3">No se encontraron CUBSO.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <siaf-pagination
          navigation="Activate"
          position="Bottom"
          [rowPage]="true"
          [page]="page()"
          [pageSize]="rowsPerPage()"
          [totalItems]="filasFiltradas().length"
          [totalPages]="totalPages()"
          [rowsPerPage]="rowsPerPage()"
          [rowsPerPageOptions]="rowsPerPageOptions"
          (previous)="paginaAnterior()"
          (next)="paginaSiguiente()"
          (rowsPerPageChange)="cambiarFilasPorPagina($event)"
        />
      </div>
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeleccionarCubsoPanelComponent {
  /** CUBSO que se ofrecen (el padre ya quitó los que están en la pantalla). */
  @Input() set catalogo(valor: CatalogoCubso[]) {
    this.catalogoSig.set(valor ?? []);
  }

  @Input() set open(valor: boolean) {
    this.abierto.set(valor);
    if (valor) {
      this.seleccionados.set(new Set());
      this.busqueda.set(null);
      this.page.set(1);
    }
  }

  @Output() readonly confirmed = new EventEmitter<CatalogoCubso[]>();
  @Output() readonly canceled = new EventEmitter<void>();

  private readonly catalogoSig = signal<CatalogoCubso[]>([]);
  readonly abierto = signal(false);
  /** `null` hasta la primera búsqueda: se muestra el aviso en lugar de la tabla. */
  readonly busqueda = signal<string | null>(null);
  readonly seleccionados = signal<Set<string>>(new Set());

  readonly filasFiltradas = computed(() => {
    const busqueda = this.busqueda();
    if (busqueda === null) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return this.catalogoSig();
    return this.catalogoSig().filter((f) => f.codigoCubso.toLowerCase().includes(texto) || f.descripcion.toLowerCase().includes(texto));
  });

  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filasFiltradas().length / this.rowsPerPage())));

  readonly filasPaginadas = computed(() => {
    const inicio = (this.page() - 1) * this.rowsPerPage();
    return this.filasFiltradas().slice(inicio, inicio + this.rowsPerPage());
  });

  readonly todasVisiblesSeleccionadas = computed(() => {
    const visibles = this.filasPaginadas();
    return visibles.length > 0 && visibles.every((f) => this.seleccionados().has(f.id));
  });

  readonly algunasVisiblesSeleccionadas = computed(
    () => this.filasPaginadas().some((f) => this.seleccionados().has(f.id)) && !this.todasVisiblesSeleccionadas(),
  );

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.page.set(1);
  }

  alternar(id: string, marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      if (marcado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  alternarVisibles(marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      for (const f of this.filasPaginadas()) {
        if (marcado) next.add(f.id);
        else next.delete(f.id);
      }
      return next;
    });
  }

  paginaAnterior(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  paginaSiguiente(): void {
    this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }

  cambiarFilasPorPagina(valor: number): void {
    this.rowsPerPage.set(valor);
    this.page.set(1);
  }

  aceptar(): void {
    const ids = this.seleccionados();
    this.confirmed.emit(this.catalogoSig().filter((f) => ids.has(f.id)));
  }
}

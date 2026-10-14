import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { RadioComponent } from '../../../../shared/ui/radio/radio.component';
import { SideNavComponent } from '../../../../shared/ui/side-nav/side-nav.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CatalogoCubso } from '../models/precio-diferenciado.model';

/** Sin modo elegido (estado inicial del Figma) no hay radio marcado y los cinco selects están activos. */
type ModoFiltro = '' | 'commodity' | 'items';
type CampoFiltro = 'segmento' | 'familia' | 'clase' | 'commodity' | 'item';

interface Filtros {
  modo: ModoFiltro;
  segmento: string;
  familia: string;
  clase: string;
  commodity: string;
  item: string;
}

const FILTROS_VACIOS: Filtros = { modo: '', segmento: '', familia: '', clase: '', commodity: '', item: '' };
const TODOS = '__todos__';
/** Cada campo depende de los anteriores: al cambiar uno se limpian los que le siguen. */
const CAMPOS_FILTRO: CampoFiltro[] = ['segmento', 'familia', 'clase', 'commodity', 'item'];
const ETIQUETA_CAMPO: Record<CampoFiltro, string> = {
  segmento: 'Segmento',
  familia: 'Familia',
  clase: 'Clase',
  commodity: 'Commodity',
  item: 'Ítem',
};

/** Niveles del código CUBSO: 2 dígitos de segmento, familia, clase y commodity, y el resto es el ítem. */
function nivelesDe(codigo: string): Record<CampoFiltro, string> {
  return {
    segmento: codigo.slice(0, 2),
    familia: codigo.slice(2, 4),
    clase: codigo.slice(4, 6),
    commodity: codigo.slice(6, 8),
    item: codigo.slice(8),
  };
}

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
  imports: [FormTableSearchComponent, PaginationComponent, RadioComponent, SideNavComponent, SidePanelComponent, TagComponent, TextFieldComponent],
  template: `
    <siaf-side-panel
      [open]="abierto()"
      title="Seleccionar ítems"
      [confirmDisabled]="seleccionados().size === 0"
      (closed)="canceled.emit()"
      (confirmed)="aceptar()"
    >
      <div class="flex flex-col gap-siaf-lg">
        <siaf-form-table-search [value]="busqueda() ?? ''" placeholder="Buscar" ariaLabel="Buscar CUBSO" (valueChange)="buscar($event)" (filter)="abrirFiltro()" />

        @if (chips().length) {
          <div class="flex flex-wrap gap-siaf-xs">
            @for (chip of chips(); track chip.campo) {
              <siaf-tag variant="filter" [selected]="true" [removable]="true" [removeLabel]="'Quitar filtro ' + chip.texto" (removed)="quitarChip(chip.campo)">{{ chip.texto }}</siaf-tag>
            }
          </div>
        }

        @if (!hayCriterio()) {
          <p class="m-0 rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] p-siaf-md text-sm text-[var(--sys-color-text-neutral-medium)]">
            No se ha seleccionado ningún tipo. Realice una búsqueda para realizar una selección.
          </p>
        } @else {
          <div class="flex flex-col gap-siaf-md">
            <div class="flex items-center justify-between px-siaf-sm">
              <input
                class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                type="checkbox"
                aria-label="Seleccionar todos los CUBSO"
                [checked]="todasVisiblesSeleccionadas()"
                [indeterminate]="algunasVisiblesSeleccionadas()"
                [disabled]="filasPaginadas().length === 0"
                (change)="alternarVisibles($any($event.target).checked)"
              />
              <!-- Figma 5733:145862: el rango y las flechas también van arriba, junto a «seleccionar todos». -->
              <siaf-pagination
                navigation="Activate"
                position="Top"
                [page]="page()"
                [pageSize]="rowsPerPage()"
                [totalItems]="filasFiltradas().length"
                [totalPages]="totalPages()"
                (previous)="paginaAnterior()"
                (next)="paginaSiguiente()"
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

    <!-- «Sidenav - filtro» (Figma 5733:145862): Commodity / Ítems y los cinco selects encadenados, derivados del código CUBSO. -->
    <siaf-side-nav
      [open]="filtroAbierto()"
      title="Filtrar"
      confirmLabel="Aplicar"
      (closed)="cerrarFiltro()"
      (canceled)="cerrarFiltro()"
      (confirmed)="aplicarFiltro()"
    >
      <div class="flex flex-col gap-siaf-md">
        <siaf-radio-group
          name="modo-filtro-cubso"
          [inline]="true"
          [options]="opcionesModo"
          [value]="borrador().modo"
          (valueChange)="cambiarModo($any($event))"
        />
        @for (campo of campos; track campo) {
          <siaf-input
            type="select"
            [label]="etiqueta[campo]"
            [placeholder]="etiqueta[campo]"
            [options]="opcionesDe(campo)"
            [value]="borrador()[campo]"
            [disabled]="campo === 'item' && borrador().modo === 'commodity'"
            (valueChange)="elegir(campo, $any($event).toString())"
          />
        }
      </div>
    </siaf-side-nav>
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
      this.filtros.set(FILTROS_VACIOS);
      this.filtroAbierto.set(false);
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

  // ─── Filtro (Figma 5733:145862): los cinco niveles salen del código CUBSO (2+2+2+2 dígitos y el resto, el ítem). ───

  protected readonly campos = CAMPOS_FILTRO;
  protected readonly etiqueta = ETIQUETA_CAMPO;
  protected readonly opcionesModo = [
    { label: 'Commodity', value: 'commodity' },
    { label: 'Ítems', value: 'items' },
  ];

  readonly filtros = signal<Filtros>(FILTROS_VACIOS);
  readonly borrador = signal<Filtros>(FILTROS_VACIOS);
  readonly filtroAbierto = signal(false);

  /** Chips de los filtros aplicados: «Segmento 53», «Familia: 11»… */
  readonly chips = computed(() => {
    const f = this.filtros();
    return CAMPOS_FILTRO.filter((c) => f[c] && f[c] !== TODOS).map((campo) => ({
      campo,
      texto: campo === 'segmento' ? `Segmento ${f[campo]}` : `${ETIQUETA_CAMPO[campo]}: ${f[campo]}`,
    }));
  });

  /** La tabla no aparece hasta que se busca algo o se aplica un filtro. */
  readonly hayCriterio = computed(() => this.busqueda() !== null || this.chips().length > 0 || this.filtros().modo !== '');

  readonly filasFiltradas = computed(() => {
    if (!this.hayCriterio()) return [];
    const texto = (this.busqueda() ?? '').trim().toLowerCase();
    const f = this.filtros();
    return this.catalogoSig().filter((r) => {
      const niveles = nivelesDe(r.codigoCubso);
      return (
        CAMPOS_FILTRO.every((c) => !f[c] || f[c] === TODOS || niveles[c] === f[c]) &&
        (!texto || r.codigoCubso.toLowerCase().includes(texto) || r.descripcion.toLowerCase().includes(texto))
      );
    });
  });

  abrirFiltro(): void {
    this.borrador.set(this.filtros());
    this.filtroAbierto.set(true);
  }

  cerrarFiltro(): void {
    this.filtroAbierto.set(false);
  }

  aplicarFiltro(): void {
    this.filtros.set(this.borrador());
    this.page.set(1);
    this.filtroAbierto.set(false);
  }

  cambiarModo(modo: ModoFiltro): void {
    // «Commodity» no baja hasta el ítem: se limpia al cambiar a ese modo.
    this.borrador.update((b) => ({ ...b, modo, item: modo === 'commodity' ? '' : b.item }));
  }

  /** Opciones de un campo: los valores del catálogo que cuadran con lo elegido en los campos anteriores. */
  opcionesDe(campo: CampoFiltro): TextFieldOption[] {
    const b = this.borrador();
    const previos = CAMPOS_FILTRO.slice(0, CAMPOS_FILTRO.indexOf(campo));
    const valores = new Set<string>();
    for (const r of this.catalogoSig()) {
      const niveles = nivelesDe(r.codigoCubso);
      if (previos.every((p) => !b[p] || b[p] === TODOS || niveles[p] === b[p])) valores.add(niveles[campo]);
    }
    const opciones = [...valores].sort().map((v) => ({ label: v, value: v }));
    return campo === 'commodity' || campo === 'item' ? [{ label: 'Todos', value: TODOS }, ...opciones] : opciones;
  }

  /** Elegir un campo limpia los que dependen de él. */
  elegir(campo: CampoFiltro, valor: string): void {
    const siguientes = CAMPOS_FILTRO.slice(CAMPOS_FILTRO.indexOf(campo) + 1);
    this.borrador.update((b) => {
      const next = { ...b, [campo]: valor } as Filtros;
      for (const s of siguientes) next[s] = '';
      return next;
    });
  }

  quitarChip(campo: CampoFiltro): void {
    const desde = CAMPOS_FILTRO.slice(CAMPOS_FILTRO.indexOf(campo));
    this.filtros.update((f) => {
      const next = { ...f };
      for (const s of desde) next[s] = '';
      return next;
    });
    this.page.set(1);
  }

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

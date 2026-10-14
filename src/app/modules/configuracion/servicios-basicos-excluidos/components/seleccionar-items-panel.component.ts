import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { RadioComponent } from '../../../../shared/ui/radio/radio.component';
import { SideNavComponent } from '../../../../shared/ui/side-nav/side-nav.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ServicioBasico } from '../models/servicio-basico.model';

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
const ORDEN_CAMPOS: CampoFiltro[] = ['segmento', 'familia', 'clase', 'commodity', 'item'];
const ETIQUETA_CAMPO: Record<CampoFiltro, string> = {
  segmento: 'Segmento',
  familia: 'Familia',
  clase: 'Clase',
  commodity: 'Commodity',
  item: 'Ítem',
};

/**
 * Panel lateral «Seleccionar ítems» de la configuración de servicios básicos excluidos de la ley (Figma
 * «A.2-RC-008»): buscador y, solo después de buscar o filtrar, tabla SEG · FAM · CLA · COM · ITEM · TIPO · DESCRIPCIÓN
 * con una casilla por fila. El embudo del buscador abre el «Sidenav - filtro» (Commodity / Ítems, Segmento, Familia,
 * Clase, Commodity e Ítem encadenados) y los filtros aplicados quedan como chips. «Aceptar» emite los ítems marcados;
 * «Cancelar» (o la ✕ o Escape) cierra sin cambios.
 */
@Component({
  selector: 'siaf-seleccionar-items-panel',
  standalone: true,
  imports: [
    FormTableSearchComponent,
    PaginationComponent,
    RadioComponent,
    SideNavComponent,
    SidePanelComponent,
    TagComponent,
    TextFieldComponent,
  ],
  template: `
    <siaf-side-panel
      [open]="abierto()"
      title="Seleccionar ítems"
      [confirmDisabled]="seleccionados().size === 0"
      (closed)="canceled.emit()"
      (confirmed)="aceptar()"
    >
      <div class="flex flex-col gap-siaf-md">
        <siaf-form-table-search
          [value]="busqueda()"
          placeholder="Buscar"
          ariaLabel="Buscar ítem"
          (valueChange)="buscar($event)"
          (filter)="abrirFiltro()"
        />

        @if (chips().length) {
          <div class="flex flex-wrap gap-siaf-xs">
            @for (chip of chips(); track chip.campo) {
              <siaf-tag variant="filter" [selected]="true" [removable]="true" [removeLabel]="'Quitar filtro ' + chip.texto" (removed)="quitarChip(chip.campo)">{{ chip.texto }}</siaf-tag>
            }
          </div>
        }

        @if (!hayCriterio()) {
          <div class="rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-lowest)] px-siaf-md py-siaf-md text-sm text-[var(--sys-color-text-neutral-medium)]">
            No se ha seleccionado ningún tipo. Realice una búsqueda para realizar una selección.
          </div>
        } @else {
          <div class="overflow-auto rounded-siaf-md border border-[var(--sys-color-divider-default)]">
            <table class="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                  <th class="w-12 border-b border-[var(--sys-color-divider-strong)] p-siaf-sm">
                    <input
                      class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                      type="checkbox"
                      aria-label="Seleccionar todos los ítems"
                      [checked]="todasVisiblesSeleccionadas()"
                      [indeterminate]="algunasVisiblesSeleccionadas()"
                      [disabled]="filasPaginadas().length === 0"
                      (change)="alternarVisibles($any($event.target).checked)"
                    />
                  </th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Seg</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Fam</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Cla</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Com</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Item</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Tipo</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Descripción</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-sm py-siaf-sm text-left">Vigencia</th>
                </tr>
              </thead>
              <tbody>
                @for (fila of filasPaginadas(); track fila.id) {
                  <tr
                    class="border-b border-[var(--sys-color-divider-default)] last:border-b-0"
                    [class.bg-[var(--sys-color-bg-states-light-selected)]]="seleccionados().has(fila.id)"
                  >
                    <td class="p-siaf-sm">
                      <input
                        class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                        type="checkbox"
                        [attr.aria-label]="'Seleccionar ' + fila.descripcion"
                        [checked]="seleccionados().has(fila.id)"
                        (change)="alternar(fila.id, $any($event.target).checked)"
                      />
                    </td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.segmento }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.familia }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.clase }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.commodity }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.item }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.tipo }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.descripcion }}</td>
                    <td class="px-siaf-sm py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fila.vigente ? 'Sí' : 'No' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="9">No se encontraron ítems.</td>
                  </tr>
                }
              </tbody>
            </table>
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
          (previous)="page.set(Math.max(1, page() - 1))"
          (next)="page.set(Math.min(totalPages(), page() + 1))"
          (rowsPerPageChange)="cambiarFilasPorPagina($event)"
        />
      </div>
    </siaf-side-panel>

    <!-- «Sidenav - filtro» (Figma): Commodity / Ítems y los cinco selects encadenados. -->
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
          name="modo-filtro-servicios"
          [inline]="true"
          [options]="opcionesModo"
          [value]="borrador().modo"
          (valueChange)="cambiarModo($any($event))"
        />
        @for (campo of camposVisibles(); track campo) {
          <siaf-input
            type="select"
            [label]="etiqueta[campo]"
            [placeholder]="etiqueta[campo]"
            [options]="opcionesDe(campo)"
            [value]="valorBorrador(campo)"
            [disabled]="campoDeshabilitado(campo)"
            (valueChange)="elegir(campo, $any($event).toString())"
          />
        }
      </div>
    </siaf-side-nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeleccionarItemsPanelComponent {
  protected readonly Math = Math;
  protected readonly etiqueta = ETIQUETA_CAMPO;
  protected readonly opcionesModo = [
    { label: 'Commodity', value: 'commodity' },
    { label: 'Ítems', value: 'items' },
  ];
  protected readonly camposVisibles = signal<CampoFiltro[]>(ORDEN_CAMPOS);

  /** Catálogo que se ofrece (el padre ya quitó lo vinculado). */
  @Input() set catalogo(valor: ServicioBasico[]) {
    this.catalogoSig.set(valor ?? []);
  }

  @Input() set open(valor: boolean) {
    this.abierto.set(valor);
    if (valor) {
      this.seleccionados.set(new Set());
      this.busqueda.set('');
      this.filtros.set(FILTROS_VACIOS);
      this.filtroAbierto.set(false);
      this.page.set(1);
    }
  }

  @Output() readonly confirmed = new EventEmitter<ServicioBasico[]>();
  @Output() readonly canceled = new EventEmitter<void>();

  private readonly catalogoSig = signal<ServicioBasico[]>([]);
  readonly abierto = signal(false);
  readonly busqueda = signal('');
  readonly seleccionados = signal<Set<string>>(new Set());
  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  /** Filtros ya aplicados y borrador del panel de filtros. */
  readonly filtros = signal<Filtros>(FILTROS_VACIOS);
  readonly borrador = signal<Filtros>(FILTROS_VACIOS);
  readonly filtroAbierto = signal(false);

  private valor(f: Filtros, campo: CampoFiltro): string {
    return f[campo];
  }

  /** Chips de los filtros aplicados: «Segmento 51», «Familia: 20»… */
  readonly chips = computed(() => {
    const f = this.filtros();
    return ORDEN_CAMPOS.filter((c) => f[c] && f[c] !== TODOS).map((campo) => ({
      campo,
      texto: campo === 'segmento' ? `Segmento ${f[campo]}` : `${ETIQUETA_CAMPO[campo]}: ${f[campo]}`,
    }));
  });

  /** La tabla no aparece hasta que se busca algo o se aplica un filtro. */
  readonly hayCriterio = computed(
    () => this.busqueda().trim().length > 0 || this.chips().length > 0 || this.filtros().modo !== '',
  );

  readonly filasFiltradas = computed(() => {
    if (!this.hayCriterio()) return [];
    const texto = this.busqueda().trim().toLowerCase();
    const f = this.filtros();
    return this.catalogoSig().filter(
      (r) =>
        ORDEN_CAMPOS.every((c) => !f[c] || f[c] === TODOS || r[c] === f[c]) &&
        (!texto ||
          [r.segmento, r.familia, r.clase, r.commodity, r.item, r.tipo, r.descripcion].some((v) => v.toLowerCase().includes(texto))),
    );
  });

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

  cambiarFilasPorPagina(valor: number): void {
    this.rowsPerPage.set(valor);
    this.page.set(1);
  }

  // ─── Panel de filtros ────────────────────────────────────────────

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

  valorBorrador(campo: CampoFiltro): string {
    return this.valor(this.borrador(), campo);
  }

  campoDeshabilitado(campo: CampoFiltro): boolean {
    return campo === 'item' && this.borrador().modo === 'commodity';
  }

  /** Opciones de un campo: los valores del catálogo que cuadran con lo elegido en los campos anteriores. */
  opcionesDe(campo: CampoFiltro): TextFieldOption[] {
    const b = this.borrador();
    const previos = ORDEN_CAMPOS.slice(0, ORDEN_CAMPOS.indexOf(campo));
    const valores = new Set<string>();
    for (const r of this.catalogoSig()) {
      if (previos.every((p) => !b[p] || b[p] === TODOS || r[p] === b[p])) valores.add(r[campo]);
    }
    const opciones = [...valores].sort().map((v) => ({ label: v, value: v }));
    return campo === 'commodity' || campo === 'item' ? [{ label: 'Todos', value: TODOS }, ...opciones] : opciones;
  }

  /** Elegir un campo limpia los que dependen de él. */
  elegir(campo: CampoFiltro, valor: string): void {
    const siguientes = ORDEN_CAMPOS.slice(ORDEN_CAMPOS.indexOf(campo) + 1);
    this.borrador.update((b) => {
      const next = { ...b, [campo]: valor } as Filtros;
      for (const s of siguientes) next[s] = '';
      return next;
    });
  }

  quitarChip(campo: CampoFiltro): void {
    const siguientes = ORDEN_CAMPOS.slice(ORDEN_CAMPOS.indexOf(campo));
    this.filtros.update((f) => {
      const next = { ...f };
      for (const s of siguientes) next[s] = '';
      return next;
    });
    this.page.set(1);
  }

  // ─── Selección ───────────────────────────────────────────────────

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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import {
  SelectionColumn,
  SelectionSideNavComponent,
} from '../../../../shared/components/selection-side-nav/selection-side-nav.component';
import { EntidadServicioBasico, ServicioBasico, codigoServicioBasico } from '../models/servicio-basico.model';

/**
 * Panel «Editar servicio básico» de la configuración de servicios básicos excluidos de la ley: se abre con el lápiz de
 * una fila y edita solo las entidades de ese servicio. Muestra el ítem y la tabla CÓDIGO · ENTIDAD con la papelera para
 * quitar cada una; «Agregar entidades» abre la selección de municipalidades que aún no tiene, con una casilla para
 * marcar todas (indeterminada con algunas). «Aceptar» (con cambios)
 * emite la lista final; «Cancelar», la X o Escape cierran sin cambios.
 */
@Component({
  selector: 'siaf-editar-servicio-basico-panel',
  standalone: true,
  imports: [ButtonComponent, SelectionSideNavComponent, SidePanelComponent, TooltipDirective],
  template: `
    <siaf-side-panel
      [open]="!!servicio"
      [title]="'Editar servicio básico'"
      [confirmDisabled]="!huboCambios()"
      (closed)="closed.emit()"
      (confirmed)="confirmed.emit(asignadas())"
    >
      @if (servicio; as s) {
        <div class="flex flex-col gap-siaf-lg text-sm">
          <dl class="m-0 grid grid-cols-[max-content_1fr] gap-x-siaf-lg gap-y-siaf-xs">
            <dt class="font-bold text-[var(--sys-color-text-neutral-high)]">Ítem</dt>
            <dd class="m-0 text-[var(--sys-color-text-neutral-medium)]">{{ codigo(s) }}</dd>
            <dt class="font-bold text-[var(--sys-color-text-neutral-high)]">Descripción</dt>
            <dd class="m-0 text-[var(--sys-color-text-neutral-medium)]">{{ s.descripcion }}</dd>
          </dl>

          <section class="flex flex-col gap-siaf-md">
            <header class="flex items-center justify-between">
              <h3 class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Entidades asignadas</h3>
              <siaf-button
                variant="outline"
                size="sm"
                icon="domain_add"
                [disabled]="disponibles().length === 0"
                (click)="abrirAgregar()"
              >
                Agregar entidades
              </siaf-button>
            </header>

            <div class="overflow-auto rounded-siaf-md border border-[var(--sys-color-divider-default)]">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-32 border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Código</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Entidad</th>
                    <th class="w-16 border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm"><span class="sr-only">Quitar</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (entidad of entidadesAsignadas(); track entidad.id) {
                    <tr class="border-b border-[var(--sys-color-divider-default)] last:border-b-0">
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ entidad.codigo }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-high)]">{{ entidad.nombre }}</td>
                      <td class="px-siaf-md py-siaf-xs text-center">
                        <siaf-button
                          variant="text"
                          size="sm"
                          icon="delete"
                          [iconOnly]="true"
                          [ariaLabel]="'Quitar ' + entidad.nombre"
                          siafTooltip="Quitar"
                          (click)="quitar(entidad.id)"
                        />
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="3">
                        Sin entidades asignadas. Use «Agregar entidades» para asignarlas.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }
    </siaf-side-panel>

    <siaf-selection-side-nav
      [open]="agregarAbierto()"
      [title]="'Agregar entidades'"
      mode="multiple"
      [rows]="disponiblesFiltradas()"
      [columns]="columnas"
      [searchValue]="busqueda()"
      searchPlaceholder="Buscar entidad"
      [selectedIds]="elegidas()"
      [showSelectAll]="true"
      selectAllLabel="Seleccionar todas las entidades"
      [selectAllChecked]="todasElegidas()"
      [selectAllIndeterminate]="algunasElegidas()"
      emptyMessage="No se encontraron entidades."
      (searchChange)="busqueda.set($event)"
      (selectionChange)="elegidas.set($event)"
      (selectAllChange)="elegirVisibles($event)"
      (closed)="agregarAbierto.set(false)"
      (accepted)="agregar($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarServicioBasicoPanelComponent {
  /** Servicio a editar; `null` lo cierra. Al abrirse, toma sus entidades como punto de partida. */
  @Input() set servicio(valor: ServicioBasico | null) {
    this._servicio = valor;
    this.inicial.set([...(valor?.entidades ?? [])]);
    this.asignadas.set([...(valor?.entidades ?? [])]);
    this.agregarAbierto.set(false);
  }
  get servicio(): ServicioBasico | null {
    return this._servicio;
  }
  private _servicio: ServicioBasico | null = null;

  /** Municipalidades asignables. */
  @Input() set entidades(valor: EntidadServicioBasico[]) {
    this.catalogo.set(valor);
  }

  /** Ids de las entidades que quedaron al aceptar. */
  @Output() confirmed = new EventEmitter<string[]>();
  @Output() closed = new EventEmitter<void>();

  readonly codigo = codigoServicioBasico;
  readonly columnas: SelectionColumn<EntidadServicioBasico>[] = [
    { key: 'codigo', label: 'Código', widthClass: 'w-[96px]' },
    { key: 'nombre', label: 'Entidad' },
  ];

  private readonly catalogo = signal<EntidadServicioBasico[]>([]);
  private readonly inicial = signal<string[]>([]);
  readonly asignadas = signal<string[]>([]);
  readonly agregarAbierto = signal(false);
  readonly elegidas = signal<string[]>([]);
  readonly busqueda = signal('');

  /** Asignadas, en el orden del catálogo y con su nombre. */
  readonly entidadesAsignadas = computed(() => {
    const ids = new Set(this.asignadas());
    return this.catalogo().filter((e) => ids.has(e.id));
  });

  /** Las que aún no tiene: las que ofrece «Agregar entidades». */
  readonly disponibles = computed(() => {
    const ids = new Set(this.asignadas());
    return this.catalogo().filter((e) => !ids.has(e.id));
  });

  readonly disponiblesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.disponibles();
    return this.disponibles().filter((e) => `${e.codigo} ${e.nombre}`.toLowerCase().includes(texto));
  });

  /** Casilla bajo el buscador: marcada con todas las visibles elegidas; indeterminada con solo algunas. */
  readonly todasElegidas = computed(() => {
    const visibles = this.disponiblesFiltradas();
    const ids = new Set(this.elegidas());
    return visibles.length > 0 && visibles.every((e) => ids.has(e.id));
  });
  readonly algunasElegidas = computed(() => this.elegidas().length > 0 && !this.todasElegidas());

  readonly huboCambios = computed(() => {
    const antes = [...this.inicial()].sort().join('|');
    return antes !== [...this.asignadas()].sort().join('|');
  });

  abrirAgregar(): void {
    this.elegidas.set([]);
    this.busqueda.set('');
    this.agregarAbierto.set(true);
  }

  /** Marca o desmarca las entidades visibles; las elegidas que la búsqueda oculta se conservan. */
  elegirVisibles(marcadas: boolean): void {
    const visibles = new Set(this.disponiblesFiltradas().map((e) => e.id));
    this.elegidas.update((ids) => [...ids.filter((id) => !visibles.has(id)), ...(marcadas ? visibles : [])]);
  }

  agregar(ids: string[]): void {
    this.asignadas.update((actuales) => [...actuales, ...ids.filter((id) => !actuales.includes(id))]);
    this.agregarAbierto.set(false);
  }

  quitar(id: string): void {
    this.asignadas.update((actuales) => actuales.filter((e) => e !== id));
  }
}

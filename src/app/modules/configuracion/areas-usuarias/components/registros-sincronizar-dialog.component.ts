import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { FocoDirective } from '../../../../shared/ui/foco/foco.directive';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { AreaUsuaria, BANDERAS_AREA_USUARIA } from '../models/area-usuaria.model';

type Bandera = 'generaCmn' | 'esAte' | 'esOa' | 'esMaa';

/**
 * Diálogo «Registros» de «Sincronizar» (Figma «6. SINCRONIZAR CONFIGURACION», A.1-RC-092 y RC-093): lista las
 * unidades del pliego que todavía no están en Áreas usuarias, con buscador y selección («todas» o fila por fila).
 * «Aceptar» emite los ids elegidos; «Cancelar», la X o Escape lo cierran sin cambios.
 */
@Component({
  selector: 'siaf-registros-sincronizar-dialog',
  standalone: true,
  imports: [ButtonComponent, FocoDirective, FormTableSearchComponent, IconComponent, RecordStatusTagComponent],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-siaf-md" role="presentation">
        <section
          class="flex max-h-[calc(100vh-32px)] w-full max-w-[980px] flex-col rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-highest)] shadow-siaf-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registros-sincronizar-titulo"
          tabindex="-1"
          data-dialogo-sincronizar
          [siafFoco]="open"
          (siafFocoEscape)="cerrar()"
        >
          <header class="flex items-center justify-between border-b border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm">
            <h2 id="registros-sincronizar-titulo" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Registros</h2>
            <siaf-button variant="text" size="sm" icon="close" [iconOnly]="true" ariaLabel="Cerrar" (click)="cerrar()" />
          </header>

          <div class="flex min-h-[320px] flex-1 flex-col gap-siaf-md overflow-auto p-siaf-md">
            <siaf-form-table-search [value]="busqueda()" placeholder="Buscar" ariaLabel="Buscar unidad organizacional" (typing)="busqueda.set($event)" (valueChange)="busqueda.set($event)" />

            <div class="flex h-8 items-center">
              <input
                class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                type="checkbox"
                aria-label="Seleccionar todas las unidades"
                data-sincronizar-todas
                [checked]="todas()"
                [indeterminate]="algunas()"
                [disabled]="filtradas().length === 0"
                (change)="alternarTodas($any($event.target).checked)"
              />
            </div>

            @if (filtradas().length === 0) {
              <p class="m-0 p-siaf-md text-center text-sm text-[var(--sys-color-text-neutral-medium)]">No hay unidades organizacionales nuevas para sincronizar.</p>
            } @else {
              <div class="overflow-auto rounded-siaf-md border border-[var(--sys-color-divider-default)]">
                <table class="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                      <th class="w-12 p-siaf-sm"></th>
                      <th class="px-siaf-md py-siaf-sm text-left">Código área</th>
                      <th class="px-siaf-md py-siaf-sm text-left">Denominación</th>
                      @for (b of banderas; track b.key) {
                        <th class="px-siaf-sm py-siaf-sm text-center">{{ b.label }}</th>
                      }
                      <th class="border-l border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (u of filtradas(); track u.id) {
                      <tr class="border-b border-[var(--sys-color-divider-default)] last:border-b-0" [class.bg-[var(--sys-color-bg-states-light-selected)]]="seleccion().has(u.id)">
                        <td class="p-siaf-sm">
                          <input
                            class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
                            type="checkbox"
                            [attr.aria-label]="'Incorporar ' + u.denominacion"
                            [checked]="seleccion().has(u.id)"
                            (change)="alternar(u.id, $any($event.target).checked)"
                          />
                        </td>
                        <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ u.codigo }}</td>
                        <td class="px-siaf-md py-siaf-sm uppercase text-[var(--sys-color-text-neutral-medium)]">{{ u.denominacion }}</td>
                        @for (b of banderas; track b.key) {
                          <td class="px-siaf-sm py-siaf-sm text-center">
                            @if (b.key === 'generaCmn' || u[b.key]) {
                              <siaf-icon class="text-[var(--sys-color-text-neutral-high)]" name="check" [size]="20" [decorative]="false" [label]="b.label + ': sí'" />
                            }
                          </td>
                        }
                        <td class="border-l border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm text-center"><siaf-record-status-tag status="Activo" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <footer class="flex justify-end gap-siaf-sm border-t border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm">
            <siaf-button variant="outline" data-cancelar-sincronizar (click)="cerrar()">Cancelar</siaf-button>
            <siaf-button variant="filled" data-aceptar-sincronizar [disabled]="seleccion().size === 0" (click)="aceptar()">Aceptar</siaf-button>
          </footer>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrosSincronizarDialogComponent {
  /** Al abrir se limpian la búsqueda y la selección. */
  @Input() set open(valor: boolean) {
    this._open = valor;
    if (valor) {
      this.busqueda.set('');
      this.seleccion.set(new Set());
    }
  }
  get open(): boolean {
    return this._open;
  }
  private _open = false;

  @Input() set unidades(lista: AreaUsuaria[]) {
    this.lista.set(lista);
  }

  @Output() readonly accepted = new EventEmitter<string[]>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly banderas = BANDERAS_AREA_USUARIA as { key: Bandera; label: string }[];
  private readonly lista = signal<AreaUsuaria[]>([]);
  readonly busqueda = signal('');
  readonly seleccion = signal<Set<string>>(new Set());

  readonly filtradas = computed(() => {
    const t = this.busqueda().trim().toLowerCase();
    return t ? this.lista().filter((u) => u.codigo.toLowerCase().includes(t) || u.denominacion.toLowerCase().includes(t)) : this.lista();
  });
  readonly todas = computed(() => this.filtradas().length > 0 && this.filtradas().every((u) => this.seleccion().has(u.id)));
  readonly algunas = computed(() => !this.todas() && this.filtradas().some((u) => this.seleccion().has(u.id)));

  alternar(id: string, marcada: boolean): void {
    this.seleccion.update((s) => {
      const next = new Set(s);
      if (marcada) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  alternarTodas(marcadas: boolean): void {
    this.seleccion.update((s) => {
      const next = new Set(s);
      for (const u of this.filtradas()) {
        if (marcadas) next.add(u.id);
        else next.delete(u.id);
      }
      return next;
    });
  }

  aceptar(): void {
    if (this.seleccion().size) this.accepted.emit([...this.seleccion()]);
  }

  cerrar(): void {
    this.closed.emit();
  }
}

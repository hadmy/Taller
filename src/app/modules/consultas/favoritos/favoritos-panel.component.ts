import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../shared/ui/checkbox/checkbox.component';
import { ExpansionPanelComponent } from '../../../shared/ui/expansion-panel/expansion-panel.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { MessageBoxComponent } from '../../../shared/ui/message-box/message-box.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SideNavComponent } from '../../../shared/ui/side-nav/side-nav.component';
import { TextFieldComponent } from '../../../shared/ui/text-field/text-field.component';
import { FavoritoReporte, cuantasCondiciones } from './favorito-reporte.model';

/** Un parámetro de la consulta, como se lista al agregar el favorito. */
export interface ParametroFavorito {
  label: string;
  value: string;
  icon: string;
}

/**
 * Panel «Favoritos» de un reporte (Figma C.1-RQ-011 a 014): la lista de favoritos del usuario (aplicar, marcar como
 * predeterminado, eliminar) y «Agregar favorito», que guarda los parámetros y los filtros avanzados aplicados.
 */
@Component({
  selector: 'siaf-favoritos-panel',
  standalone: true,
  imports: [ButtonComponent, CheckboxComponent, ExpansionPanelComponent, IconComponent, MessageBoxComponent, ModalComponent, SideNavComponent, TextFieldComponent],
  template: `
    <siaf-side-nav
      [open]="abierto"
      [title]="agregando() ? 'Agregar favorito' : 'Favoritos'"
      [showReturn]="agregando()"
      [showFooter]="agregando()"
      [closeOnCancel]="false"
      confirmLabel="Guardar"
      [confirmDisabled]="!nombre().trim()"
      (returned)="agregando.set(false)"
      (canceled)="agregando.set(false)"
      (confirmed)="guardar()"
      (closed)="cerrar()"
    >
      @if (agregando()) {
        <div class="flex flex-col gap-siaf-md" data-favorito-nuevo>
          <siaf-input label="Descripción" [required]="true" [autoSuccess]="false" [value]="nombre()" (valueChange)="nombre.set($any($event).toString())" />
          <div class="flex flex-col gap-siaf-xs">
            <siaf-checkbox label="Favorito predeterminado" [checked]="predeterminado()" (checkedChange)="predeterminado.set($event)" />
            <p class="m-0 text-xs leading-normal text-[var(--sys-color-text-neutral-medium)]">Se aplicará automáticamente la próxima vez que ingreses a este reporte.</p>
          </div>
          <siaf-expansion-panel [title]="'Parámetros · ' + totalParametros + ' campos'">
            <dl class="m-0 flex flex-col gap-siaf-sm">
              @for (p of parametros; track p.label) {
                <div class="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-siaf-md">
                  <siaf-icon class="row-span-2" [name]="p.icon" [size]="24" />
                  <dt class="text-sm text-[var(--sys-color-text-neutral-high)]">{{ p.label }}</dt>
                  <dd class="m-0 text-xs text-[var(--sys-color-text-neutral-medium)]">{{ p.value }}</dd>
                </div>
              }
            </dl>
          </siaf-expansion-panel>
          <siaf-expansion-panel [title]="'Filtros · ' + (cuantas(condiciones.length) || 'sin condiciones')">
            @for (c of condiciones; track c) {
              <p class="m-0 py-siaf-xxs">{{ c }}</p>
            } @empty {
              <p class="m-0">No hay filtros avanzados aplicados.</p>
            }
          </siaf-expansion-panel>
        </div>
      } @else {
        <div class="flex flex-col gap-siaf-md" data-favoritos>
          @if (!favoritos.length) {
            <message-box text="Aún no tienes favoritos. Guarda tu configuración de parámetros y filtros de la tabla para reutilizarla después." />
          } @else {
            <ul class="m-0 flex list-none flex-col gap-siaf-md p-0">
              @for (f of favoritos; track f.id) {
                <li
                  class="flex items-center gap-siaf-xs rounded-siaf-sm border px-siaf-xs py-siaf-xs"
                  [class]="f.id === aplicadoId ? 'border-[var(--sys-color-border-states-active)] bg-[var(--sys-color-bg-states-light-selected)]' : 'border-[var(--sys-color-divider-strong)] bg-surface'"
                  [attr.data-favorito]="f.id"
                >
                  <siaf-button
                    variant="text"
                    size="sm"
                    [icon]="f.predeterminado ? 'star' : 'star_border'"
                    [iconOnly]="true"
                    [ariaLabel]="(f.predeterminado ? 'Quitar como predeterminado ' : 'Marcar como predeterminado ') + f.nombre"
                    (click)="guardado.emit({ id: f.id, nombre: f.nombre, predeterminado: !f.predeterminado, parametros: f.parametros, condiciones: f.condiciones })"
                  />
                  <button
                    class="flex min-w-0 flex-1 flex-col rounded-siaf-sm py-siaf-xxs text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
                    type="button"
                    [attr.aria-current]="f.id === aplicadoId ? 'true' : null"
                    (click)="aplicado.emit(f)"
                  >
                    <span class="truncate text-sm font-bold text-[var(--sys-color-text-neutral-high)]" [attr.title]="f.nombre">{{ f.nombre }}</span>
                    <span class="text-xs text-[var(--sys-color-text-neutral-medium)]">{{ totalParametros }} parámetros{{ f.condiciones.length ? ' · ' + cuantas(f.condiciones.length) : '' }}</span>
                  </button>
                  <siaf-button variant="text" size="sm" icon="delete_outline" [iconOnly]="true" [ariaLabel]="'Eliminar ' + f.nombre" (click)="porEliminar.set(f)" />
                </li>
              }
            </ul>
          }
          <div>
            <siaf-button variant="outline" icon="add" (click)="agregar()">Agregar favorito</siaf-button>
          </div>
        </div>
      }
    </siaf-side-nav>

    <siaf-modal
      [open]="!!porEliminar()"
      variant="custom"
      title="¿Deseas eliminar el favorito?"
      [description]="'Se eliminará «' + (porEliminar()?.nombre ?? '') + '». Esta acción no se puede deshacer.'"
      icon="delete_outline"
      confirmLabel="Eliminar"
      (canceled)="porEliminar.set(null)"
      (closed)="porEliminar.set(null)"
      (confirmed)="eliminar()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritosPanelComponent {
  @Input() abierto = false;
  @Input() favoritos: readonly FavoritoReporte[] = [];
  /** Favorito que está aplicado. */
  @Input() aplicadoId = '';
  /** Cuántos parámetros tiene el reporte. */
  @Input() totalParametros = 0;
  /** Lo aplicado ahora, para «Agregar favorito». */
  @Input() parametros: readonly ParametroFavorito[] = [];
  @Input() condiciones: readonly string[] = [];

  @Output() cerrado = new EventEmitter<void>();
  @Output() aplicado = new EventEmitter<FavoritoReporte>();
  /** Nuevo (sin id, y los parámetros y condiciones los pone la pantalla) o cambiado. */
  @Output() guardado = new EventEmitter<Partial<FavoritoReporte> & { nombre: string; predeterminado: boolean }>();
  @Output() eliminado = new EventEmitter<string>();

  readonly cuantas = cuantasCondiciones;
  readonly agregando = signal(false);
  readonly nombre = signal('');
  readonly predeterminado = signal(false);
  readonly porEliminar = signal<FavoritoReporte | null>(null);

  agregar(): void {
    this.nombre.set('');
    this.predeterminado.set(false);
    this.agregando.set(true);
  }

  guardar(): void {
    this.guardado.emit({ nombre: this.nombre().trim(), predeterminado: this.predeterminado() });
    this.agregando.set(false);
  }

  eliminar(): void {
    const favorito = this.porEliminar();
    this.porEliminar.set(null);
    if (favorito) this.eliminado.emit(favorito.id);
  }

  cerrar(): void {
    this.agregando.set(false);
    this.cerrado.emit();
  }
}

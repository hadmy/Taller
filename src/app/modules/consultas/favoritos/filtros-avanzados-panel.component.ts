import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { MessageBoxComponent } from '../../../shared/ui/message-box/message-box.component';
import { SideNavComponent } from '../../../shared/ui/side-nav/side-nav.component';
import { TextFieldComponent, TextFieldOption } from '../../../shared/ui/text-field/text-field.component';
import { CampoCondicion, CondicionReporte, OPERADORES, OperadorCondicion } from './favorito-reporte.model';

type Borrador = { campo: string; operador: OperadorCondicion | ''; valor: string };

/** «Filtros avanzados» de un reporte (Figma C.1-RQ-008 y 009): condiciones de campo, operador y valor; se aplican juntas. */
@Component({
  selector: 'siaf-filtros-avanzados-panel',
  standalone: true,
  imports: [ButtonComponent, MessageBoxComponent, SideNavComponent, TextFieldComponent],
  template: `
    <siaf-side-nav
      [open]="estaAbierto()"
      title="Filtros avanzados"
      cancelLabel="Limpiar todo"
      confirmLabel="Aplicar"
      [closeOnCancel]="false"
      [confirmDisabled]="!puedeAplicar()"
      (canceled)="borrador.set([])"
      (confirmed)="aplicar()"
      (closed)="cerrado.emit()"
    >
      <div class="flex flex-col gap-siaf-md" data-filtros-avanzados>
        <h3 class="m-0 text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Condiciones</h3>
        @for (c of borrador(); track $index; let i = $index) {
          <fieldset class="m-0 flex min-w-0 flex-col gap-siaf-md border-0 p-0" [attr.data-condicion]="i + 1">
            <legend class="sr-only">Condición {{ i + 1 }}</legend>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase text-[var(--sys-color-text-neutral-high)]" aria-hidden="true">Condición {{ i + 1 }}</span>
              <siaf-button variant="text" size="sm" icon="delete_outline" [iconOnly]="true" [ariaLabel]="'Quitar la condición ' + (i + 1)" (click)="quitar(i)" />
            </div>
            <siaf-input type="select" label="Campo" [autoSuccess]="false" [options]="opcionesCampo()" [value]="c.campo" (valueChange)="cambiar(i, 'campo', $any($event).toString())" />
            <siaf-input type="select" label="Condición" [autoSuccess]="false" [options]="opcionesOperador" [value]="c.operador" (valueChange)="cambiar(i, 'operador', $any($event).toString())" />
            @if (opcionesValor(c.campo); as opciones) {
              <siaf-input type="select" label="Valor" [autoSuccess]="false" [options]="opciones" [value]="c.valor" (valueChange)="cambiar(i, 'valor', $any($event).toString())" />
            } @else {
              <siaf-input label="Valor" [autoSuccess]="false" [value]="c.valor" (valueChange)="cambiar(i, 'valor', $any($event).toString())" />
            }
          </fieldset>
        } @empty {
          <message-box [text]="mensaje" />
        }
        <div>
          <siaf-button variant="outline" icon="add" (click)="agregar()">Agregar condición</siaf-button>
        </div>
      </div>
    </siaf-side-nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosAvanzadosPanelComponent {
  readonly estaAbierto = signal(false);
  /** Al abrir, el borrador parte de lo aplicado. */
  @Input() set abierto(valor: boolean) {
    if (valor && !this.estaAbierto()) this.borrador.set(this.aplicadas().map((c) => ({ ...c })));
    this.estaAbierto.set(valor);
  }
  private readonly aplicadas = signal<readonly CondicionReporte[]>([]);
  @Input() set condiciones(valor: readonly CondicionReporte[]) {
    this.aplicadas.set(valor ?? []);
  }
  private readonly listaCampos = signal<readonly CampoCondicion[]>([]);
  @Input() set campos(valor: readonly CampoCondicion[]) {
    this.listaCampos.set(valor ?? []);
  }

  @Input() mensaje = 'Agregue una o más condiciones para refinar las filas de la tabla.';

  @Output() cerrado = new EventEmitter<void>();
  @Output() aplicado = new EventEmitter<CondicionReporte[]>();

  readonly borrador = signal<Borrador[]>([]);
  readonly opcionesOperador: TextFieldOption[] = OPERADORES.map((o) => ({ label: o.label, value: o.value }));
  readonly opcionesCampo = computed<TextFieldOption[]>(() => this.listaCampos().map((c) => ({ label: c.label, value: c.key })));
  private readonly valores = computed(
    () => new Map(this.listaCampos().filter((c) => c.options).map((c) => [c.key, (c.options ?? []).map((o) => ({ label: o, value: o }))] as const)),
  );

  readonly puedeAplicar = computed(() => {
    const lista = this.borrador();
    return lista.every((c) => c.campo && c.operador && c.valor.trim()) && JSON.stringify(lista) !== JSON.stringify(this.aplicadas());
  });

  opcionesValor(campo: string): TextFieldOption[] | null {
    return this.valores().get(campo) ?? null;
  }

  agregar(): void {
    this.borrador.update((lista) => [...lista, { campo: '', operador: '', valor: '' }]);
  }

  quitar(indice: number): void {
    this.borrador.update((lista) => lista.filter((_, i) => i !== indice));
  }

  /** Otro campo limpia el valor: puede no ser de su lista. */
  cambiar(indice: number, clave: keyof Borrador, valor: string): void {
    this.borrador.update((lista) =>
      lista.map((c, i) => (i !== indice ? c : ({ ...c, ...(clave === 'campo' && c.campo !== valor ? { valor: '' } : {}), [clave]: valor } as Borrador))),
    );
  }

  aplicar(): void {
    if (this.puedeAplicar()) this.aplicado.emit(this.borrador().map((c) => ({ ...c }) as CondicionReporte));
  }
}

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface BarraHorizontal {
  label: string;
  /** Valor visible («27 (14.8 %)»). */
  texto: string;
  valor: number;
  /** Token de color de la barra. */
  color: string;
  /** Línea vertical sobre el riel (por ejemplo, el techo), en la misma escala que `valor`. */
  marca?: number;
}

/** Lista de barras horizontales con riel (Figma C.1-RQ-004): nombre, barra y valor; con `selectable`, cada fila se elige. */
@Component({
  selector: 'siaf-barras-horizontales',
  standalone: true,
  template: `
    <ul class="m-0 flex list-none flex-col gap-siaf-xs p-0 text-xs" [attr.aria-label]="ariaLabel">
      @for (b of barras; track b.label) {
        <li>
          @if (selectable) {
            <button
              class="grid w-full cursor-pointer items-center gap-siaf-xs rounded-siaf-sm py-siaf-xxs text-left hover:bg-surface-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
              [class.opacity-40]="elegida && elegida !== b.label"
              type="button"
              [style.grid-template-columns]="columnas"
              [attr.aria-pressed]="elegida === b.label"
              (click)="elegir.emit(b.label)"
            >
              <span class="text-[var(--sys-color-text-neutral-medium)]">{{ b.label }}</span>
              <span class="relative block h-4 rounded-siaf-xs bg-[var(--sys-color-bg-surfaces-surface-high)]" aria-hidden="true">
                <span class="block h-full rounded-siaf-xs" [style.width.%]="ancho(b.valor)" [style.background-color]="'var(' + b.color + ')'"></span>
                @if (b.marca) {
                  <span class="absolute -bottom-0.5 -top-0.5 w-0.5 bg-[var(--sys-color-text-neutral-high)]" [style.left.%]="ancho(b.marca)"></span>
                }
              </span>
              <span class="text-right text-[var(--sys-color-text-neutral-medium)]">{{ b.texto }}</span>
            </button>
          } @else {
            <div [style.grid-template-columns]="columnas" class="grid items-center gap-siaf-xs py-siaf-xxs">
              <span class="text-[var(--sys-color-text-neutral-medium)]">{{ b.label }}</span>
              <span class="relative block h-4 rounded-siaf-xs bg-[var(--sys-color-bg-surfaces-surface-high)]" aria-hidden="true">
                <span class="block h-full rounded-siaf-xs" [style.width.%]="ancho(b.valor)" [style.background-color]="'var(' + b.color + ')'"></span>
                @if (b.marca) {
                  <span class="absolute -bottom-0.5 -top-0.5 w-0.5 bg-[var(--sys-color-text-neutral-high)]" [style.left.%]="ancho(b.marca)"></span>
                }
              </span>
              <span class="text-right text-[var(--sys-color-text-neutral-medium)]">{{ b.texto }}</span>
            </div>
          }
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarrasHorizontalesComponent {
  /** Ancho de la columna del valor: el mismo en todas las filas. */
  @Input() anchoValor = '88px';
  @Input() barras: readonly BarraHorizontal[] = [];
  @Input() ariaLabel = '';
  @Input() selectable = false;
  /** `label` de la barra elegida. */
  @Input() elegida = '';
  @Output() elegir = new EventEmitter<string>();

  get columnas(): string {
    return `minmax(0, 170px) minmax(0, 1fr) ${this.anchoValor}`;
  }

  /** La mayor (valor o marca) llena el riel. */
  ancho(valor: number): number {
    const mayor = Math.max(...this.barras.map((b) => Math.max(b.valor, b.marca ?? 0)), 0);
    return mayor ? (valor / mayor) * 100 : 0;
  }
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface ChartLegendItem {
  label: string;
  /** Token de color de la serie (`--sys-color-*`), el mismo que usa el gráfico. */
  token: string;
}

/**
 * Leyenda de los gráficos del kit (Figma UI KIT, página «Graphics», «Leyenda»): un punto de 10 px con el color de
 * cada serie y su nombre en texto chico, en una fila alineada a la izquierda sobre el gráfico (si no entra, sigue en
 * la línea de abajo; cada nombre nunca se corta). Con `vertical`, en columna: un nombre por línea.
 *
 * @figma 22743:508 Leyenda
 * @usar
 * - Dentro de los gráficos del kit: `siaf-bar-chart` y `siaf-line-chart` la arman solos con los nombres de sus
 *   series; `siaf-diverging-chart`, con los de sus dos lados, y `siaf-donut-chart`, con los de sus partes.
 * - En un gráfico propio que use la paleta del kit (`TOKENS_SERIES`), para que colores y nombres coincidan.
 * @evitar
 * - Como única forma de leer los datos: el gráfico debe traer además su tooltip y su tabla de datos.
 * - Para filtros o selección de series: no es interactiva.
 * @teclado
 * - No recibe foco: no es interactiva.
 * @accesibilidad
 * - **1.3.1 Información y relaciones (A)**: es una lista (`ul` y `li`); el punto de color va con `aria-hidden` y el
 *   nombre de la serie queda en texto.
 * - **1.4.1 Uso del color (A)**: el color solo relaciona la leyenda con las barras; los valores de cada serie también
 *   están en el tooltip y en la tabla de datos del gráfico.
 * - **1.4.3 Contraste mínimo (AA)**: nombres en `text-neutral-medium` sobre la superficie (14.53:1 claro / 12.87:1
 *   oscuro).
 * - **Pendiente · 1.4.11 Contraste no textual (AA)**: en oscuro los puntos de las series 1 y 2 (`bg-brand-primary`,
 *   2.66:1, y `bg-brand-secondary`, 2.99:1) no llegan a 3:1 sobre la superficie y la 2 y la 3 quedan del mismo tono;
 *   la paleta oscura de los gráficos está por definir con diseño.
 */
@Component({
  selector: 'siaf-chart-legend',
  standalone: true,
  host: { class: 'block' },
  template: `
    <ul class="m-0 flex list-none gap-x-siaf-md gap-y-siaf-xxs p-0" [class]="vertical ? 'flex-col items-start' : 'flex-wrap items-center justify-start'">
      @for (item of items; track item.label) {
        <li class="flex items-center gap-siaf-xxs whitespace-nowrap">
          <span class="size-[10px] shrink-0 rounded-full" [style.background-color]="'var(' + item.token + ')'" aria-hidden="true"></span>
          <span class="text-xs leading-[normal] tracking-[0.025px] text-[var(--sys-color-text-neutral-medium)]">{{ item.label }}</span>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartLegendComponent {
  @Input() items: readonly ChartLegendItem[] = [];
  /** En columna, un nombre por línea (la torta la pone a la derecha del gráfico). */
  @Input() vertical = false;
}

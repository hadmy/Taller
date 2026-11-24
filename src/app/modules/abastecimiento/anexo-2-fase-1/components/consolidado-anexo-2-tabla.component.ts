import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { IconDropdownMenuComponent, IconDropdownMenuItem } from '../../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { ConsolidadoAnexo2, FilaConsolidado, GrupoConsolidado } from '../models/anexo-2-fase-1.model';

/**
 * Tabla del «Consolidado Anexo 02» que se pinta en la pestaña del mismo nombre de la Solicitud de CMN - Anexo N.º 02.
 *
 * Integra los Anexos 01 que la OA ya revisó (los pendientes no entran): filas agrupadas por Fuente / Rubro ·
 * Clasificador de gastos · Actividad presupuestaria · Meta; por ítem, código, tipo, descripción, unidad de medida y precio
 * unitario; por año (desde el Año 1; el «+» de la cabecera agrega otro y el menú ⋮ de cada año agregado lo elimina), los dos semestres con cantidad (solo bienes) y valor; y el total por semestre y del Anexo. Los
 * ítems de un Anexo 01 «Incompleto» llevan la etiqueta del área con el comentario de la observación en el tooltip.
 * Cada grupo se contrae o expande con su flecha (su total sigue a la vista) y la tabla se desplaza en horizontal
 * dentro de un área de alto máximo, con la cabecera fija. La solicitud carga los datos; este componente solo los dibuja.
 */
@Component({
  selector: 'siaf-consolidado-anexo-2-tabla',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent, IconDropdownMenuComponent, StatusTagComponent, TooltipDirective],
  template: `
    @if (cargando) {
      <div class="siaf-skeleton-pulse h-4 w-56 rounded bg-[var(--sys-color-bg-surfaces-surface-low)]"></div>
    } @else if (!hayFilas()) {
      <siaf-empty-state
        illustration="no-data"
        title="Aún no hay Anexos N.º 01 revisados"
        description="Marque como completos o incompletos los Anexos N.º 01 de la solicitud para integrarlos al Anexo N.º 02."
      />
    } @else if (datos(); as c) {
      <!-- Scroll horizontal (y vertical con alto máximo, para que la barra horizontal siempre quede a la vista). -->
      <div
        class="isolate max-h-[600px] overflow-auto rounded-siaf-sm border border-[var(--sys-color-divider-default)]"
        tabindex="0"
        role="region"
        aria-label="Consolidado del Anexo N.º 02, con desplazamiento horizontal"
      >
        <table class="w-max min-w-full border-collapse text-xs text-[var(--sys-color-text-neutral-high)]">
          <thead class="cabecera-fija sticky top-0 z-10 text-center font-bold uppercase">
            <tr>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs">Fuente / Rubro</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs">Clasificador de gastos</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs">Actividad presupuestaria</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs">Meta</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs"><span class="sr-only">Sin título</span></th>
              @for (col of aniosVisibles(); track col.indice) {
                <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" colspan="4">Año {{ col.indice + 1 }} ({{ col.anio }})</th>
                <!-- El Año 1 siempre queda; cada año agregado lleva su menú ⋮ en una columna propia, como el «+». -->
                @if (col.indice > 0) {
                  <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs font-normal normal-case" rowspan="3">
                    <siaf-icon-dropdown-menu
                      icon="more_vert"
                      [ariaLabel]="'Opciones del año ' + col.anio"
                      [items]="opcionesAnio"
                      [menuWidth]="200"
                      (selected)="alElegirOpcionAnio($event, col.indice)"
                    />
                  </th>
                }
              }
              @if (columnaAgregar()) {
                <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="3">
                  <siaf-button
                    variant="text"
                    size="sm"
                    icon="add"
                    [iconOnly]="true"
                    [ariaLabel]="'Agregar el año ' + siguienteAnio()"
                    siafTooltip="Agregar año"
                    tooltipMode="always"
                    (click)="agregarAnio()"
                  />
                </th>
              }
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="3">Total S/</th>
            </tr>
            <tr>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="2">Código del ítem</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="2">Tipo</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="2">Descripción del ítem</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="2">Unidad de medida</th>
              <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" rowspan="2">Precio unitario</th>
              @for (col of aniosVisibles(); track col.indice) {
                <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" colspan="2">Semestre 1</th>
                <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" colspan="2">Semestre 2</th>
              }
            </tr>
            <tr>
              @for (col of aniosVisibles(); track col.indice) {
                @for (s of semestresPorAnio; track s) {
                  <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs">Cantidad</th>
                  <th class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs">Valor total S/</th>
                }
              }
            </tr>
          </thead>
          <tbody>
            @for (grupo of c.grupos; track $index; let g = $index) {
              <tr class="bg-[var(--sys-color-bg-surfaces-surface-low)] font-bold">
                <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">
                  <span class="flex items-center gap-siaf-xs whitespace-nowrap">
                    <siaf-button
                      variant="text"
                      size="sm"
                      [icon]="estaContraido(g) ? 'chevron_right' : 'expand_more'"
                      [iconOnly]="true"
                      [ariaLabel]="(estaContraido(g) ? 'Expandir' : 'Contraer') + ' el grupo ' + grupo.actividadOperativa"
                      [attr.aria-expanded]="!estaContraido(g)"
                      (click)="alternarGrupo(g)"
                    />
                    {{ grupo.fuente }}
                  </span>
                </td>
                <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">{{ grupo.clasificador }}</td>
                <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">{{ grupo.actividadOperativa }}</td>
                <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">{{ grupo.meta }}</td>
                <td class="border border-[var(--sys-color-divider-default)]" [attr.colspan]="1 + columnasAnios() + columnaAgregar()"></td>
                <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs text-right">{{ numero(totalGrupo(grupo)) }}</td>
              </tr>
              @if (!estaContraido(g)) {
              @for (fila of grupo.filas; track $index) {
                <tr>
                  <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs font-bold">{{ fila.codigo }}</td>
                  <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">{{ fila.tipo }}</td>
                  <td class="min-w-60 border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">
                    {{ fila.descripcion }}
                    <div class="text-[var(--sys-color-text-neutral-medium)]">{{ fila.area }}</div>
                    @if (fila.estadoEvaluacion === 'Incompleto') {
                      <div class="mt-siaf-xs">
                        <siaf-status-tag
                          appearance="soft"
                          size="small"
                          tone="warning"
                          [siafTooltip]="fila.comentario ?? 'Anexo N.º 01 incompleto'"
                          tooltipMode="always"
                          tabindex="0"
                        >Incompleto</siaf-status-tag>
                      </div>
                    }
                  </td>
                  <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">{{ fila.unidadMedida }}</td>
                  <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs text-right">{{ fila.precioUnitario === null ? '' : numero(fila.precioUnitario) }}</td>
                  @for (col of aniosVisibles(); track col.indice) {
                    @for (s of fila.semestres[col.indice]; track $index) {
                      <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs text-right">{{ s.cantidad ?? '' }}</td>
                      <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs text-right">{{ numero(s.valor) }}</td>
                    }
                    @if (col.indice > 0) {
                      <td class="border border-[var(--sys-color-divider-default)]"></td>
                    }
                  }
                  @if (columnaAgregar()) {
                    <td class="border border-[var(--sys-color-divider-default)]"></td>
                  }
                  <td class="border border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs text-right font-bold">{{ numero(totalFila(fila)) }}</td>
                </tr>
              }
              }
            }
          </tbody>
          <tfoot class="bg-[var(--sys-color-bg-surfaces-surface-high)] font-bold">
            <tr>
              <td class="border border-[var(--sys-color-divider-strong)]" colspan="4"></td>
              <td class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs text-right">Total general en S/</td>
              @for (total of totalesVisibles(); track $index; let k = $index) {
                <td class="border border-[var(--sys-color-divider-strong)]"></td>
                <td class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs text-right">{{ numero(total[0]) }}</td>
                <td class="border border-[var(--sys-color-divider-strong)]"></td>
                <td class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs text-right">{{ numero(total[1]) }}</td>
                @if (aniosVisibles()[k].indice > 0) {
                  <td class="border border-[var(--sys-color-divider-strong)]"></td>
                }
              }
              @if (columnaAgregar()) {
                <td class="border border-[var(--sys-color-divider-strong)]"></td>
              }
              <td class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs text-right">{{ numero(totalVisible()) }}</td>
            </tr>
            <tr>
              <td class="border border-[var(--sys-color-divider-strong)]" colspan="4"></td>
              <td class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs text-right">Total Anexo N.º 02 (todos los años)</td>
              <td class="border border-[var(--sys-color-divider-strong)] px-siaf-xs py-siaf-xs" [attr.colspan]="columnasAnios() + columnaAgregar() + 1">S/ {{ numero(c.totalGeneral) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    }
  `,
  styles: `
    /* La cabecera queda fija al bajar: «surface-high» es semitransparente, así que va sobre la superficie opaca
       para que las filas no se vean por debajo. */
    .cabecera-fija th {
      background: linear-gradient(var(--sys-color-bg-surfaces-surface-high), var(--sys-color-bg-surfaces-surface-high)),
        var(--sys-color-bg-surfaces-surface);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidadoAnexo2TablaComponent {
  readonly datos = signal<ConsolidadoAnexo2 | null>(null);

  /** Consolidado que arma el backend con los Anexos 01 ya revisados (`null` mientras no hay solicitud grabada). */
  @Input() set consolidado(valor: ConsolidadoAnexo2 | null) {
    this.datos.set(valor);
    this.contraidos.set(new Set());
    this.indicesAnios.set([0]);
  }
  @Input() cargando = false;

  readonly semestresPorAnio = [1, 2];

  /**
   * Años a la vista (posiciones en `anios`, en orden): la tabla empieza solo con el Año 1; el «+» de la cabecera
   * (tooltip «Agregar año») agrega el primer año que falta, con sus semestres, cantidades, valores y totales, y el
   * menú ⋮ de cada año agregado lo elimina («Eliminar año»). El Año 1 siempre queda. Al llegar otro consolidado
   * vuelve al Año 1.
   */
  private readonly indicesAnios = signal<readonly number[]>([0]);
  readonly aniosVisibles = computed(() => {
    const anios = this.datos()?.anios ?? [];
    return this.indicesAnios()
      .filter((i) => i < anios.length)
      .map((indice) => ({ indice, anio: anios[indice] }));
  });
  /** Primer año que falta en la tabla, el que agrega el «+» (`null` con todos a la vista: el botón se oculta). */
  private readonly indiceSiguiente = computed(() => {
    const visibles = new Set(this.indicesAnios());
    const indice = (this.datos()?.anios ?? []).findIndex((_, i) => !visibles.has(i));
    return indice < 0 ? null : indice;
  });
  readonly siguienteAnio = computed(() => {
    const indice = this.indiceSiguiente();
    return indice === null ? null : (this.datos()?.anios[indice] ?? null);
  });
  /** 1 mientras se ve la columna del «+», para ajustar los `colspan`. */
  readonly columnaAgregar = computed(() => (this.siguienteAnio() === null ? 0 : 1));
  readonly totalesVisibles = computed(() => {
    const totales = this.datos()?.totales ?? [];
    return this.aniosVisibles().map(({ indice }) => totales[indice]);
  });

  /** Opciones del menú ⋮ de cada año agregado. */
  readonly opcionesAnio: IconDropdownMenuItem[] = [{ label: 'Eliminar año', value: 'eliminar', icon: 'delete_outline' }];
  /** «Total general en S/» de los años a la vista. */
  readonly totalVisible = computed(() => this.totalesVisibles().reduce((suma, t) => suma + t[0] + t[1], 0));

  /** Columnas de los años a la vista: 4 por año (cantidad y valor de cada semestre). */
  readonly columnasAnios = computed(() => {
    const visibles = this.aniosVisibles();
    // 4 por año más la columna del menú ⋮ de cada año agregado (el Año 1 no la tiene).
    return visibles.length * 4 + visibles.filter((col) => col.indice > 0).length;
  });
  readonly hayFilas = computed(() => (this.datos()?.grupos.length ?? 0) > 0);

  /** Grupos contraídos (por posición). Al llegar otro consolidado se vuelven a mostrar todos. */
  private readonly contraidos = signal<ReadonlySet<number>>(new Set());

  /** Botón «+»: agrega a la tabla el primer año que falta, en su lugar. */
  agregarAnio(): void {
    const indice = this.indiceSiguiente();
    if (indice !== null) this.indicesAnios.update((actual) => [...actual, indice].sort((a, b) => a - b));
  }

  /** Menú ⋮ de un año agregado: «Eliminar año» lo quita de la tabla (el Año 1 no tiene menú). */
  alElegirOpcionAnio(opcion: string, indice: number): void {
    if (opcion === 'eliminar' && indice > 0) this.indicesAnios.update((actual) => actual.filter((i) => i !== indice));
  }

  /** Semestres de la fila solo de los años a la vista. */
  semestresVisibles(fila: FilaConsolidado): FilaConsolidado['semestres'] {
    return this.aniosVisibles().map(({ indice }) => fila.semestres[indice]);
  }

  estaContraido(indice: number): boolean {
    return this.contraidos().has(indice);
  }

  /** Flecha del grupo: contrae o expande sus ítems. */
  alternarGrupo(indice: number): void {
    this.contraidos.update((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(indice)) siguiente.delete(indice);
      else siguiente.add(indice);
      return siguiente;
    });
  }

  /** Total del ítem: suma de los semestres de los años a la vista. */
  totalFila(fila: FilaConsolidado): number {
    return this.semestresVisibles(fila).reduce((suma, anio) => suma + anio[0].valor + anio[1].valor, 0);
  }

  /** Total del grupo: se ve aunque el grupo esté contraído. */
  totalGrupo(grupo: GrupoConsolidado): number {
    return grupo.filas.reduce((suma, fila) => suma + this.totalFila(fila), 0);
  }

  /** Número con dos decimales, sin símbolo (las celdas de valor). */
  numero(valor: number): string {
    return valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

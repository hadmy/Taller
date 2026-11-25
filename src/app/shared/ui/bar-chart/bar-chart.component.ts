import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import type { ActiveDataPoint, ChartData, ChartOptions, Plugin } from 'chart.js';

import { ChartLegendComponent, ChartLegendItem } from '../chart-legend/chart-legend.component';
import { ChartTooltipComponent } from '../chart-tooltip/chart-tooltip.component';
import { colorDeTextoSobre, formatearPorcentaje, formatearValor, tokenDeSerie } from '../charts/chart-tema';
import { ChartSeries, GraficoBase, SerieDibujada, ajustarEje, conOpacidad, tieneValor } from '../charts/grafico-base';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export type BarChartOrientation = 'vertical' | 'horizontal';

/**
 * Aire bajo la barra 100 %: los nombres de sus tramos (8 px de separación y una línea de 12 px) más los 24 px de relleno
 * inferior del marco del Figma, que la figura no tiene. Así la barra queda a la misma altura que en el Figma.
 */
const AIRE_BAJO_LA_BARRA = 47;

/** Color de las barras en alerta (`alertIndexes`). */
const TOKEN_ALERTA = '--sys-color-bg-feedback-dark-danger';

/** Largo de línea de las etiquetas de categoría en horizontal: más largas se parten en líneas por palabras. */
const LARGO_LINEA_HORIZONTAL = 16;
/** En vertical, las etiquetas largas también se parten (en vez de inclinarse), en líneas de hasta 22 caracteres. */
const LARGO_LINEA_VERTICAL = 22;
/** Desde más de estas categorías, en vertical las etiquetas van inclinadas. */
const CATEGORIAS_INCLINADAS = 14;

/**
 * Parte una etiqueta larga en líneas de hasta `largo` caracteres, por palabras (una palabra más larga queda sola en su
 * línea). Chart.js limita el ancho del eje de categorías y, en una sola línea, el texto se cortaba por la izquierda.
 */
export function partirEtiqueta(texto: string, largo = LARGO_LINEA_HORIZONTAL): string | string[] {
  if (texto.length <= largo || !texto.includes(' ')) return texto;
  const lineas: string[] = [];
  for (const palabra of texto.split(' ')) {
    const ultima = lineas.at(-1);
    if (ultima !== undefined && ultima.length + 1 + palabra.length <= largo) lineas[lineas.length - 1] = `${ultima} ${palabra}`;
    else lineas.push(palabra);
  }
  return lineas;
}

/**
 * Gráfico de barras del kit (Figma UI KIT, página «Graphics»: «Bar», «Bar grouped», «Comparative bars» y «Stacked
 * bar»), dibujado con Chart.js. Con una serie son barras simples; con dos o más, agrupadas por categoría; y con una sola
 * categoría (o ninguna), el comparativo: las series lado a lado, sin etiqueta de categoría y con un tooltip por barra.
 * `orientation="horizontal"`
 * pone las categorías a la izquierda y muestra el nombre de todas (sin saltear; los de más de 16 caracteres, en varias
 * líneas): el `height` debe dar al menos 14 px por categoría, o 28 px si los nombres son largos. En vertical, los nombres
 * de más de 22 caracteres también se parten en líneas, en vez de inclinarse. Con `stacked` las series se apilan en cada categoría, con 2 px de aire entre
 * tramos y el porcentaje de cada tramo adentro cuando entra; con una sola categoría es la barra 100 % del Figma: una
 * barra horizontal que llena el ancho, sin ejes, con el nombre de cada tramo debajo. Los colores salen de la paleta del
 * kit (`TOKENS_SERIES`) y se vuelven a leer al cambiar de tema; la leyenda y el tooltip son `siaf-chart-legend` y
 * `siaf-chart-tooltip`.
 *
 * @figma 22743:375 Bar
 * @figma 22743:507 Bar grouped
 * @figma 22743:622 Comparative bars
 * @figma 22743:356 Stacked bar
 * @usar
 * - `selectable` con `[selectedIndex]` y `(categorySelected)` para un tablero interactivo: el clic (o Enter / Espacio
 *   tras recorrer con las flechas) elige una categoría, que conserva su color mientras las demás se atenúan; la pantalla
 *   filtra con ella. Volver a elegirla emite `null`.
 * - Apilado y `selectable`: `(segmentSelected)` trae la categoría y la serie del tramo pulsado (por ejemplo, nivel de
 *   gobierno y estado) y `[selectedSeries]` atenúa las demás series.
 * - Para comparar cantidades entre categorías o meses (recaudación, documentos por estado), con pocas series.
 * - Dentro de `siaf-chart-section`, que le pone título y descripción.
 * - `valueSuffix="%"` cuando los valores son porcentajes, y `ariaLabel` con lo que muestra el gráfico.
 * - `showValues` para escribir el valor de cada barra en su extremo, cuando la cifra exacta importa (montos, cantidades).
 * - `alertIndexes` para marcar en rojo las categorías urgentes (la leyenda suma «Urgente» o `alertLabel`), por ejemplo
 *   el pendiente que vence antes. El rojo no basta solo: la leyenda lo nombra.
 * - `stacked` para las partes de un total en cada categoría y, con una sola categoría, para la composición de un total
 *   en una barra (activos y patrimonio).
 * @evitar
 * - Para la evolución de un valor a lo largo del tiempo: usar `siaf-line-chart`.
 * - Para variaciones que suben y bajan respecto de cero: usar `siaf-diverging-chart`.
 * - Para las partes de un total en un anillo, con el porcentaje de cada parte al centro: usar `siaf-donut-chart`.
 * - Con más de cuatro series: la paleta da la vuelta y los colores se repiten.
 * - Para un solo número destacado: usar `siaf-kpi-card`.
 * @teclado
 * - **Tab**: enfoca el gráfico (una sola parada).
 * - **Flecha derecha / izquierda** (vertical) o **abajo / arriba** (horizontal): recorren las categorías y muestran el
 *   tooltip con el valor de cada serie; dan la vuelta.
 * - En el comparativo, las flechas pasan de una barra a la siguiente y el tooltip muestra solo su valor.
 * - **Inicio / Fin**: van a la primera o a la última categoría.
 * - **Escape**: oculta el tooltip; salir del gráfico también lo oculta.
 * @accesibilidad
 * - **1.1.1 Contenido no textual (A)**: el lienzo es `role="img"` con `ariaLabel` y, además, hay una tabla de datos
 *   oculta (`sr-only`) con una fila por categoría y una columna por serie.
 * - **1.3.1 Información y relaciones (A)**: la tabla usa `caption`, `th scope="col"` para las series y
 *   `th scope="row"` para las categorías.
 * - **2.1.1 Teclado (A)**: los valores se recorren con las flechas; al moverse, una región `aria-live` anuncia la
 *   categoría y los valores.
 * - **2.4.7 Foco visible (AA)**: el lienzo enfocado muestra el contorno de 2 px `border-states-focus`.
 * - **1.4.1 Uso del color (A)**: las series se distinguen por color, pero sus nombres están en la leyenda, en el
 *   tooltip y en la tabla de datos.
 * - **1.4.3 Contraste mínimo (AA)**: el porcentaje dentro de un tramo apilado toma, entre blanco, `text-neutral-high` y la
 *   superficie, el de más contraste con su color (4.71:1 como mínimo, en claro y en oscuro); lo dibujado en el lienzo
 *   está también en la tabla de datos.
 * - **1.4.13 Contenido en hover o foco (AA)**: Escape oculta el tooltip sin mover el puntero ni el foco.
 * - **Pendiente · 1.4.11 Contraste no textual (AA)**: en oscuro las barras de las series 1 y 2 (`bg-brand-primary`,
 *   2.66:1, y `bg-brand-secondary`, 2.99:1) no llegan a 3:1 sobre la superficie y la 2 y la 3 quedan del mismo tono;
 *   la paleta oscura de los gráficos está por definir con diseño.
 */
@Component({
  selector: 'siaf-bar-chart',
  standalone: true,
  imports: [ChartLegendComponent, ChartTooltipComponent],
  host: { class: 'block' },
  template: `
    <!-- Relleno del Figma («Bar»): 24 px arriba y a los lados, también dentro de siaf-chart-section. -->
    <figure class="m-0 flex flex-col gap-siaf-md px-siaf-lg pt-siaf-lg">
      @if (seriesDibujadas.length) {
        <siaf-chart-legend [items]="leyenda" />
      }
      <div class="relative w-full" [style.height.px]="height">
        <canvas
          #lienzo
          class="rounded-siaf-sm outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
          tabindex="0"
          role="img"
          [attr.aria-label]="ariaLabel"
          (keydown)="alTeclado($event)"
          (blur)="ocultarTooltip()"
        ></canvas>
        @if (tooltip(); as visible) {
          <siaf-chart-tooltip
            class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
            [style.left.px]="visible.x"
            [style.top.px]="visible.y - 8"
            [title]="visible.titulo"
            [items]="visible.items"
          />
        }
      </div>
      <p class="sr-only" aria-live="polite">{{ anuncio() }}</p>
      <!-- sr-only en un div y no en la tabla: una tabla crece hasta su contenido aunque declare 1 px, y su caja invisible
           ensanchaba la página en columnas angostas. -->
      <div class="sr-only">
        <table>
          <caption>{{ ariaLabel }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ categoryLabel }}</th>
              @for (serie of seriesDibujadas; track $index) {
                <th scope="col">{{ serie.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (categoria of etiquetas; track $index; let i = $index) {
              <tr>
                <th scope="row">{{ categoria }}</th>
                @for (serie of seriesDibujadas; track $index) {
                  <td>{{ valor(serie, i) }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </figure>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChartComponent extends GraficoBase<'bar'> {
  /** Etiquetas de las categorías (meses, estados). Con una sola, o ninguna, es el comparativo o la barra 100 %. */
  @Input() categories: readonly string[] = [];
  @Input() series: readonly ChartSeries[] = [];
  @Input() orientation: BarChartOrientation = 'vertical';
  /** Sufijo de los valores en el eje, el tooltip y la tabla (por ejemplo `%`). */
  @Input() valueSuffix = '';
  /** Máximo del eje de valores; sin él, Chart.js elige uno redondo por encima del mayor valor. */
  @Input() max: number | null = null;
  /** Nombre accesible del gráfico y título de su tabla de datos. */
  @Input() ariaLabel = 'Gráfico de barras';
  /** Encabezado de la columna de categorías en la tabla de datos. */
  @Input() categoryLabel = 'Categoría';
  /** Alto del área del gráfico en px (sin la leyenda). */
  @Input() height = 252;
  /** Con clic, Enter o Espacio se elige una categoría: la elegida mantiene su color y las demás se atenúan. */
  @Input() override selectable = false;
  /** Categoría seleccionada (índice en `categories`); `null`, ninguna. */
  @Input() override selectedIndex: number | null = null;
  /** Índice elegido, o `null` al volver a elegir el que ya estaba seleccionado. */
  @Output() override readonly categorySelected = new EventEmitter<number | null>();
  /** En barras apiladas: serie (tramo) seleccionada; las demás series se atenúan. */
  @Input() override selectedSeries: number | null = null;
  /** Con `selectable`, el clic en un tramo emite su categoría y su serie (o `null` si ya estaba elegido). */
  @Output() override readonly segmentSelected = new EventEmitter<{ category: number; series: number } | null>();
  /**
   * Apila las series de cada categoría. Con una sola categoría es la barra 100 % del Figma («Stacked bar»): horizontal,
   * sin ejes, con el porcentaje de cada tramo adentro y su nombre debajo.
   */
  @Input() stacked = false;
  /**
   * Categorías en alerta (índices en `categories`): sus barras van en rojo (`bg-feedback-dark-danger`) y la leyenda suma
   * `alertLabel` con ese color. Solo sin `stacked`.
   */
  @Input() alertIndexes: readonly number[] = [];
  /** Nombre del rojo en la leyenda cuando hay categorías en alerta. */
  @Input() alertLabel = 'Urgente';
  /**
   * Escribe el valor de cada barra en su extremo (a la derecha en horizontal, encima en vertical), con `valueSuffix`.
   * Sin efecto en barras apiladas, que ya muestran el porcentaje de cada tramo.
   */
  @Input() showValues = false;

  protected readonly tipo = 'bar';

  /** La leyenda de las series y, si hay categorías en alerta, el rojo con su nombre. */
  override get leyenda(): ChartLegendItem[] {
    const series = super.leyenda;
    return this.hayAlerta ? [...series, { label: this.alertLabel, token: TOKEN_ALERTA }] : series;
  }

  private get hayAlerta(): boolean {
    return !this.stacked && this.alertIndexes.length > 0;
  }
  /** Color del porcentaje sobre cada serie apilada (el de más contraste), leído junto con la paleta. */
  private textoSobreSerie: string[] = [];

  get etiquetas(): readonly string[] {
    return this.categories.length ? this.categories : [''];
  }

  get seriesDibujadas(): SerieDibujada[] {
    return this.series.map((serie, i) => ({ name: serie.name, values: serie.values, token: serie.token ?? tokenDeSerie(i) }));
  }

  get comparativo(): boolean {
    return !this.stacked && this.categories.length <= 1;
  }

  /** Barra apilada con una sola categoría: la barra 100 % del Figma. */
  get barraUnica(): boolean {
    return this.stacked && this.categories.length <= 1;
  }

  /** Rótulo del tramo `datasetIndex` en la categoría `indice`: su parte de la pila; `null` si no tiene valor. */
  textoDeTramo(datasetIndex: number, indice: number): string | null {
    const valor = this.series[datasetIndex]?.values[indice];
    if (!(Number(valor) > 0)) return null;
    const total = this.series.reduce((suma, serie) => suma + Math.max(0, Number(serie.values[indice]) || 0), 0);
    return formatearPorcentaje(valor, total);
  }

  protected get categoriasEnVertical(): boolean {
    return this.horizontal;
  }

  /** En el comparativo cada barra es una posición del teclado. */
  protected override get totalPosiciones(): number {
    return this.comparativo ? this.series.length : super.totalPosiciones;
  }

  protected override activosEn(posicion: number): ActiveDataPoint[] {
    if (!this.comparativo) return super.activosEn(posicion);
    return tieneValor(this.series[posicion]?.values[0]) ? [{ datasetIndex: posicion, index: 0 }] : [];
  }

  protected override textoDelAnuncio(posicion: number): string {
    if (!this.comparativo) return super.textoDelAnuncio(posicion);
    const serie = this.seriesDibujadas[posicion];
    return serie ? `${serie.name} ${this.valor(serie, 0)}` : '';
  }

  private get horizontal(): boolean {
    return this.barraUnica || this.orientation === 'horizontal';
  }

  /** Pinta de rojo las barras en alerta; con una categoría seleccionada, las no elegidas quedan atenuadas. */
  private conAlerta(relleno: string | string[]): string | string[] {
    if (!this.hayAlerta) return relleno;
    const rojo = this.colorDe(TOKEN_ALERTA);
    const elegida = this.selectedIndex;
    return this.etiquetas.map((_, k) => {
      if (!this.alertIndexes.includes(k)) return Array.isArray(relleno) ? relleno[k] : relleno;
      return elegida !== null && elegida >= 0 && k !== elegida ? conOpacidad(rojo, 0.3) : rojo;
    });
  }

  protected override complementos(): Plugin<'bar'>[] {
    return [
      { id: 'siafTramosApilados', afterDatasetsDraw: (grafico) => this.rotularTramos(grafico) },
      { id: 'siafValoresBarras', afterDatasetsDraw: (grafico) => this.rotularValores(grafico) },
    ];
  }

  private get conValores(): boolean {
    return this.showValues && !this.stacked && !this.barraUnica;
  }

  /** Con `showValues`, el valor de cada barra en su extremo, en `text-neutral-medium` de 11 px. */
  private rotularValores(grafico: Chart<'bar'>): void {
    if (!this.conValores) return;
    const ctx = grafico.ctx;
    const horizontal = this.horizontal;
    ctx.save();
    ctx.font = `600 11px ${getComputedStyle(this.host.nativeElement).fontFamily}`;
    ctx.fillStyle = this.colorDe('--sys-color-text-neutral-medium');
    ctx.textAlign = horizontal ? 'left' : 'center';
    ctx.textBaseline = horizontal ? 'middle' : 'bottom';
    this.series.forEach((serie, datasetIndex) => {
      const meta = grafico.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      meta.data.forEach((elemento, indice) => {
        const valor = Number(serie.values[indice]);
        if (!tieneValor(serie.values[indice]) || !Number.isFinite(valor)) return;
        const { x, y } = elemento.getProps(['x', 'y'], true);
        ctx.fillText(formatearValor(valor, this.valueSuffix), horizontal ? x + 4 : x, horizontal ? y : y - 3);
      });
    });
    ctx.restore();
  }

  protected datos(): ChartData<'bar'> {
    const cantidad = Math.max(this.series.length, 1);
    const ultima = this.series.length - 1;
    const colores = this.series.map((serie, i) => this.colorDe(serie.token ?? tokenDeSerie(i)));
    this.textoSobreSerie = this.stacked ? colores.map((color) => colorDeTextoSobre(this.host.nativeElement, color)) : [];
    return {
      labels: [...this.etiquetas],
      datasets: this.series.map((serie, i) => {
        const relleno = this.conAlerta(this.colorSegunSeleccion(colores[i], i));
        const comun = { label: serie.name, data: [...serie.values], backgroundColor: relleno, hoverBackgroundColor: relleno, maxBarThickness: 62 };
        if (this.stacked) {
          // Tramos rectos con 2 px de aire hacia el siguiente (un borde transparente de ese lado), como en el Figma.
          const aire = i < ultima ? 2 : 0;
          return {
            ...comun,
            borderRadius: 0,
            borderSkipped: false as const,
            borderColor: 'transparent',
            borderWidth: this.horizontal ? { top: 0, right: aire, bottom: 0, left: 0 } : { top: aire, right: 0, bottom: 0, left: 0 },
            categoryPercentage: this.barraUnica ? 1 : this.horizontal ? 0.7 : 0.6,
            barPercentage: 1,
          };
        }
        return {
          ...comun,
          borderRadius: 4,
          borderSkipped: 'start' as const,
          // Comparativo: las series ocupan el centro, con barras de ~62 px y aire entre ellas, como en el Figma; en
          // horizontal las barras del Figma ocupan dos tercios de su fila.
          categoryPercentage: this.comparativo ? Math.min(0.16 * cantidad, 0.9) : this.orientation === 'horizontal' ? 0.7 : 0.6,
          barPercentage: this.comparativo ? 0.62 : this.series.length > 1 ? 0.85 : 1,
        };
      }),
    };
  }

  protected opciones(): ChartOptions<'bar'> {
    if (this.barraUnica) {
      const total = this.series.reduce((suma, serie) => suma + Math.max(0, Number(serie.values[0]) || 0), 0);
      return {
        ...this.opcionesComunes(),
        indexAxis: 'y',
        layout: { padding: { bottom: AIRE_BAJO_LA_BARRA } },
        scales: {
          x: { display: false, stacked: true, min: 0, max: total || 1 },
          y: { display: false, stacked: true },
        },
      };
    }
    const { colorTexto, colorGrilla, fuente } = this.estiloDeEjes();
    const ejeValores = {
      afterFit: ajustarEje,
      stacked: this.stacked,
      beginAtZero: true,
      max: this.max ?? undefined,
      // Con `showValues`, el eje sigue un 20 % más allá de la barra más larga para que entre su valor (sin quitar
      // ancho a los nombres de las categorías).
      grace: this.conValores ? '20%' : 0,
      border: { display: false },
      grid: { color: colorGrilla, drawTicks: false },
      ticks: {
        color: colorTexto,
        font: fuente,
        padding: 12,
        maxTicksLimit: 6,
        callback: (valor: string | number) => formatearValor(Number(valor), this.valueSuffix),
      },
    };
    // Muchas barras verticales: todas llevan su nombre, inclinado, en una línea.
    const denso = !this.horizontal && this.etiquetas.length > CATEGORIAS_INCLINADAS;
    const ejeCategorias = {
      afterFit: ajustarEje,
      stacked: this.stacked,
      border: { display: false },
      grid: { display: false, drawTicks: false },
      ticks: {
        display: !this.comparativo,
        // En horizontal cada barra lleva su nombre: no se saltean etiquetas (el alto lo elige la pantalla).
        autoSkip: !this.horizontal && !denso,
        ...(denso ? { minRotation: 45, maxRotation: 45 } : {}),
        color: colorTexto,
        font: fuente,
        padding: 12,
        callback: (_valor: string | number, indice: number) => {
          const texto = (this.etiquetas[indice] ?? '').toUpperCase();
          if (denso) return texto;
          // En vertical, las líneas pueden ser algo más largas: cada categoría tiene más ancho que alto.
          return partirEtiqueta(texto, this.horizontal ? LARGO_LINEA_HORIZONTAL : LARGO_LINEA_VERTICAL);
        },
      },
    };
    const horizontal = this.horizontal;
    return {
      ...this.opcionesComunes(),
      // Comparativo: cada serie es una barra propia y el tooltip muestra solo la más cercana al puntero.
      ...(this.comparativo ? { interaction: { mode: 'nearest' as const, intersect: false, axis: horizontal ? ('y' as const) : ('x' as const) } } : {}),
      indexAxis: horizontal ? 'y' : 'x',
      scales: horizontal ? { x: ejeValores, y: ejeCategorias } : { x: ejeCategorias, y: ejeValores },
    };
  }

  /** Porcentaje dentro de cada tramo apilado, si entra, y, en la barra 100 %, el nombre de cada tramo debajo. */
  private rotularTramos(grafico: Chart<'bar'>): void {
    if (!this.stacked) return;
    const ctx = grafico.ctx;
    const familia = getComputedStyle(this.host.nativeElement).fontFamily;
    const colorNombre = this.barraUnica ? this.colorDe('--sys-color-text-neutral-low') : '';
    const ultima = this.series.length - 1;
    const horizontal = this.horizontal;
    ctx.save();
    this.series.forEach((serie, datasetIndex) => {
      const meta = grafico.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      meta.data.forEach((elemento, indice) => {
        const texto = this.textoDeTramo(datasetIndex, indice);
        if (!texto) return;
        const { x, y, base, width, height } = elemento.getProps(['x', 'y', 'base', 'width', 'height'], true);
        const ancho = horizontal ? Math.abs(x - base) : width;
        const alto = horizontal ? height : Math.abs(base - y);
        const centroX = horizontal ? (x + base) / 2 : x;
        ctx.font = `700 12px ${familia}`;
        if (ctx.measureText(texto).width + 16 <= ancho && alto >= 20) {
          ctx.fillStyle = this.textoSobreSerie[datasetIndex] ?? '';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(texto, centroX, horizontal ? y : (y + base) / 2);
        }
        if (!this.barraUnica) return;
        const nombre = serie.name.toUpperCase();
        ctx.font = `400 12px ${familia}`;
        if (ctx.measureText(nombre).width > ancho) return;
        ctx.fillStyle = colorNombre;
        ctx.textBaseline = 'top';
        ctx.textAlign = datasetIndex === 0 ? 'left' : datasetIndex === ultima ? 'right' : 'center';
        const xNombre = datasetIndex === 0 ? Math.min(x, base) : datasetIndex === ultima ? Math.max(x, base) : centroX;
        ctx.fillText(nombre, xNombre, y + height / 2 + 8);
      });
    });
    ctx.restore();
  }
}

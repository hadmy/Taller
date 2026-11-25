import type { BreadcrumbItem } from '../components/breadcrumb/breadcrumb.component';
import type { FilterPillOption } from '../components/filter-pill/filter-pill.component';
import type { KpiCardTone } from '../ui/kpi-card/kpi-card.component';
import type { ReportSummaryField } from '../ui/report-summary-card/report-summary-card.component';
import type { ReportTableColumn, ReportTableRow } from '../ui/report-table/report-table.component';
import type { TabItem } from '../ui/tabs/tabs.component';
import type { TextFieldOption } from '../ui/text-field/text-field.component';

/** Campo del panel «Parámetros de consulta». */
export interface QueryReportParameterField {
  key: string;
  label: string;
  /** `date` usa el selector de fecha; `select-multiple`, la lista con casillas y «Seleccionar todo». */
  type: 'date' | 'select' | 'select-multiple';
  options?: TextFieldOption[];
  required?: boolean;
  /** Opciones según lo ya elegido en el panel (por ejemplo, el subgrupo del nivel); reemplazan a `options`. */
  optionsFor?: (values: QueryReportParameters) => TextFieldOption[];
  /** Ícono de Material Icons de su tarjeta en «Parámetros aplicados». */
  icon: string;
  /** Nombre corto de su tarjeta; por defecto, `label`. */
  appliedLabel?: string;
  /** Con `emptyParameterLabel`, no muestra su tarjeta cuando está vacío. */
  hideWhenEmpty?: boolean;
  /** Nunca muestra su tarjeta: va junto a otro campo que lo nombra en `appliedWith`. */
  hideApplied?: boolean;
  /** Clave de otro campo cuyo valor se muestra en la misma tarjeta. */
  appliedWith?: string;
  /** Texto de su tarjeta cuando está vacío; por defecto, `emptyParameterLabel`. */
  emptyLabel?: string;
}

/** Valores aplicados: la fecha (aaaa-mm-dd, como la entrega `siaf-date-time-picker`), el valor elegido o la lista. */
export type QueryReportParameters = Record<string, string | string[]>;

/** Píldora de «Filtros predeterminados»: filtra las filas cuya columna `key` tiene el valor elegido. */
export interface QueryReportPresetFilter {
  key: string;
  label: string;
  options: FilterPillOption[];
}

export interface QueryReportSummary {
  /** Etiqueta en versalitas («Entidad»). */
  label: string;
  icon: string;
  title: string;
  description?: string;
  fields: ReportSummaryField[];
}

/** Lo que devuelve la consulta de la pantalla para los parámetros aplicados. */
export interface QueryReportResult {
  rows: ReportTableRow[];
  summary?: QueryReportSummary | null;
}

export type QueryReportColumn = ReportTableColumn;
export type QueryReportRow = ReportTableRow;

/** `sum` suma una columna de importes («1,031,200.00»); `count` cuenta filas. */
export type QueryReportAggregate = 'sum' | 'count';

/** Solo las filas cuya columna tiene exactamente ese valor. */
export interface QueryReportRowFilter {
  column: string;
  value: string;
}

/** Tarjeta KPI de la vista de gráficas, calculada con las filas del resultado. */
export interface QueryReportKpi {
  title: string;
  icon?: string;
  tone?: KpiCardTone;
  /** Columna a sumar; con `count` no hace falta. */
  column?: string;
  aggregate?: QueryReportAggregate;
  /** Con filtro, la barra muestra qué parte del total de la columna representan esas filas; sin él, el 100 %. */
  where?: QueryReportRowFilter;
  /** Decimales de una suma (2 por defecto); en 0 para cantidades como Entidades. Los conteos van siempre sin decimales. */
  decimals?: number;
  /** Texto antes del monto («S/ »). */
  prefix?: string;
}

export type QueryReportChartType = 'bar' | 'line' | 'donut' | 'diverging';

/** Gráfico de la vista de gráficas: agrupa las filas por una columna y suma otra (o las cuenta). */
export interface QueryReportChart {
  title: string;
  description?: string;
  type: QueryReportChartType;
  /** Columna que forma las categorías, en el orden en que aparecen. */
  groupBy: string;
  /** Con una columna de fecha dd/mm/aaaa, agrupa por mes («ENE», «FEB»…) en orden cronológico. */
  byMonth?: boolean;
  column?: string;
  aggregate?: QueryReportAggregate;
  where?: QueryReportRowFilter;
  /**
   * `index`: cada valor como porcentaje del primero (base = 100). `change`: variación porcentual de cada categoría
   * respecto de la primera, sin la primera.
   */
  transform?: 'index' | 'change';
  /** Nombre de la serie en la leyenda y el tooltip. */
  seriesName?: string;
  /** Nombre de las categorías en la tabla de datos del gráfico («Mes»). */
  categoryLabel?: string;
  /** Con `diverging`, qué significa cada lado; por defecto «Disminución» y «Aumento». */
  negativeLabel?: string;
  positiveLabel?: string;
  /** `narrow` va en la columna angosta (336 px) a la derecha del `wide` anterior, como en el Figma. */
  width?: 'wide' | 'narrow';
}

export interface QueryReportChartsConfig {
  kpis: QueryReportKpi[];
  charts: QueryReportChart[];
  /**
   * Tablero interactivo: el clic en una barra (de `bar` o `diverging`) elige esa categoría; los KPI y los gráficos de otra
   * dimensión se recalculan con sus filas, y los que agrupan igual la resaltan. Un chip «Mes: MAR ×» la quita.
   */
  interactive?: boolean;
}

export type QueryReportExportFormat = 'excel' | 'csv' | 'pdf';

/**
 * Configuración de una pantalla «Consultas y reportes» armada con `siaf-query-report-page`: la pantalla solo pasa sus
 * textos, sus parámetros, sus columnas y el resultado de cada consulta.
 */
export interface QueryReportConfig {
  title: string;
  /** Línea bajo el título («Favorito: …»). */
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  /** Texto de los parámetros vacíos en «Parámetros aplicados» («Todos»); sin él, no se muestran. */
  emptyParameterLabel?: string;
  /** Línea bajo el título del resultado («Fecha de corte de datos: …»). */
  resultNote?: string;
  /** La vista de gráficas la pinta la pantalla en el espacio `[reportCharts]` (con `viewChanged` sabe cuándo). */
  customCharts?: boolean;
  searchPlaceholder?: string;
  /** Los títulos de la tabla ordenan las filas. */
  sortable?: boolean;
  /** Casilla por fila; «Exportar» lleva solo las marcadas, si hay. */
  selectable?: boolean;
  parameterFields: QueryReportParameterField[];
  columns: QueryReportColumn[];
  /** Clave que identifica cada fila del resultado. */
  rowKey: string;
  /** Título de la tarjeta del resultado; por defecto «Resultado de reporte». */
  resultTitle?: string;
  /** Pestañas sobre el resultado; la pantalla recibe `tabChanged` y entrega el resultado de la pestaña. */
  tabs?: TabItem[];
  presetFilters?: QueryReportPresetFilter[];
  /** KPI y gráficos de la vista de gráficas; sin ellos no aparece el selector de vista. */
  charts?: QueryReportChartsConfig;
  /** Nombre de la tabla para el lector de pantalla. */
  tableLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Una fila del «Dashboard» de Reportes: el monto de un ítem del Anexo 01 de un área usuaria en un año del Cuadro
 * Multianual de Necesidades. Sale de lo que se elabora en «CMN Programación».
 */
export interface FilaDashboardCmn {
  /** Ítem y año: identifica la fila. */
  id: string;
  /** Año del CMN («2027»). */
  anio: string;
  /** Sigla del área usuaria («OTI»): la categoría corta de los gráficos. */
  areaSigla: string;
  area: string;
  item: string;
  descripcion: string;
  tipo: 'Bien' | 'Servicio';
  /** Clasificador de gastos (genérica), como en el Anexo 01: «3 - Bienes». */
  generica: string;
  /** Importe con separador de miles y dos decimales («1,031,200.00»). */
  monto: string;
}

/** Filtros de la consulta («Parámetros»): sin valor, todo. */
export interface FiltrosDashboard {
  anios?: string[];
  areas?: string[];
  tipo?: string;
}

/** Genérica de los activos no financieros: su KPI. */
export const GENERICA_ACTIVOS_NO_FINANCIEROS = '7 - Adquisición de Activos No Financieros';

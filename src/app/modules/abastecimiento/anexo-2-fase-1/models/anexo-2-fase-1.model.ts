/**
 * Proceso «Solicitud de CMN - Anexo N.º 02 | Fase 1: Identificación» del Cuadro Multianual de Necesidades (CMN).
 *
 * La Oficina de Abastecimiento consolida los Anexos 01 que remitieron las áreas usuarias: revisa el resumen de la
 * consolidación y el marco presupuestario de los tres años del CMN, elige en «Seleccionar registros» las áreas usuarias
 * que entran al Anexo 02, graba y verifica; el aprobador aprueba, observa o rechaza.
 */

/** Código del documento en el catálogo de documentos. */
export const CODIGO_DOCUMENTO = 'SA2F1';
/** Nombre del documento en la bandeja de CMN Programación (Figma «A.2-OA-EV-009»). */
export const NOMBRE_DOCUMENTO = 'Anexo 02 - Consolidado del Cuadro Multianual de Necesidades';
/** Opción del panel «Crear documento» (Figma «A.2-OA-EV-010»). */
export const NOMBRE_DOCUMENTO_CREAR = 'CMN Fase 1 - Anexo 02 Consolidado';
/** Título de la pantalla de la solicitud (Figma «A.1-RC-01»). */
export const TITULO_SOLICITUD = 'Solicitud de CMN - Anexo N.º 02 | Fase 1: Identificación';

/** Única acción del documento: crear el Anexo 02. */
export const TIPO_ACCION = 'creacion';
export const ETIQUETA_TIPO_ACCION = 'Creación';

/** Anexo 01 de un área usuaria: lo que se elige en «Seleccionar registros». */
export interface AreaUsuariaAnexo1 {
  id: string;
  /** Área usuaria que remitió el Anexo 01. */
  nombre: string;
  /** Cantidad de ítems (necesidades) del Anexo 01. */
  items: number;
  /** Monto programado en el Anexo 01, en soles. */
  montoProgramado: number;
  /** Estado de la evaluación del Anexo 01 por la Oficina de Abastecimiento. */
  estadoEvaluacion: EstadoEvaluacionAnexo1;
  /** Último día (ISO, `AAAA-MM-DD`) en que el área usuaria puede modificar su Anexo 01. */
  plazoModificacion: string;
}

export type EstadoEvaluacionAnexo1 = 'Pendiente' | 'Conforme' | 'Observado';

/** Un área usuaria de un Anexo 02 aprobado: la pestaña Registros de CMN Programación. */
export interface RegistroAnexo2 {
  id: string;
  area: string;
  items: number;
  montoProgramado: number;
  /** Solicitud (Anexo 02) que la incluyó. */
  documentoId: string;
  numeroDocumento: string;
  /** Fecha de aprobación (ISO). */
  fechaAprobacion: string;
}

/** Datos de cabecera del Anexo 02 («Datos del Anexo 02»). */
export interface DatosAnexo2 {
  entidad: string;
  oficinaAbastecimiento: string;
  referenciaPresupuestaria: string;
  fase: string;
  elaboradoPor: string;
}

/** Tarjetas de «Resumen del proceso de consolidación». */
export interface ResumenConsolidacion {
  anexosRecibidos: number;
  conformes: number;
  observados: number;
  necesidades: number;
  anexosEvaluados: number;
}

/** Un año de «Marco presupuestario». */
export interface MarcoPresupuestarioAnio {
  anio: number;
  referencia: string;
  techoPresupuestal: number;
  consolidadoAnexo1: number;
}

/** Todo lo que la solicitud muestra antes de elegir registros. */
export interface ContextoAnexo2 {
  datos: DatosAnexo2;
  resumen: ResumenConsolidacion;
  marcoPresupuestario: MarcoPresupuestarioAnio[];
  /** Anexos 01 recibidos que se pueden incluir en el Anexo 02. */
  areas: AreaUsuariaAnexo1[];
}

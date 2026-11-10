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
  /** Comentario de observación cuando la OA lo marcó «No conforme» (Figma «Observar registro»). */
  comentarioEvaluacion?: string;
}

/** Evaluación del Anexo 01 por la OA (Figma «3. Detalle items»): «Conforme» o «No conforme» desde su detalle. */
export type EstadoEvaluacionAnexo1 = 'Pendiente' | 'Conforme' | 'No conforme';

/** Años de programación del CMN (Año 1, 2 y 3): columnas del consolidado del Anexo N.º 02. */
export const ANIOS_CMN = [2027, 2028, 2029] as const;

export type TipoItemAnexo1 = 'Bien' | 'Servicio';

/** Un ítem (necesidad) del Anexo 01 de un área usuaria: tabla de «Detalle del Anexo 1» y filas del consolidado. */
export interface ItemAnexo1 {
  id: string;
  /** Código del ítem del catálogo (16 dígitos). */
  item: string;
  descripcion: string;
  /** Monto programado del ítem en el Anexo 01 (suma de los tres años), en soles. */
  montoProgramado: number;
  tipo: TipoItemAnexo1;
  unidadMedida: string;
  /** Solo en bienes: con él se calcula la cantidad de cada semestre. */
  precioUnitario: number | null;
  /** Fuente de financiamiento / rubro (p. ej. «RO/00»). */
  fuente: string;
  /** Clasificador de gastos (genérica). */
  clasificador: string;
  actividadOperativa: string;
  meta: string;
  /** Monto programado por año del CMN. */
  montosPorAnio: Record<number, number>;
}

/** Lo que muestra «Detalle del Anexo 1» de un área usuaria incluida en la solicitud. */
export interface DetalleAnexo1 {
  area: AreaUsuariaAnexo1;
  items: ItemAnexo1[];
  /** La OA todavía puede dar conformidad u observar (solicitud ELABORADA u OBSERVADA y Anexo 01 pendiente). */
  evaluable: boolean;
}

/** Cuerpo de «Conforme» / «No conforme» (el comentario es obligatorio para «No conforme»). */
export interface EvaluacionAnexo1Request {
  estado: Exclude<EstadoEvaluacionAnexo1, 'Pendiente'>;
  comentario?: string;
}

/** Un semestre de un año en el consolidado: la cantidad solo existe en bienes. */
export interface SemestreConsolidado {
  cantidad: number | null;
  valor: number;
}

/** Un ítem del consolidado del Anexo N.º 02, con su área usuaria y los dos semestres de cada año. */
export interface FilaConsolidado {
  codigo: string;
  tipo: TipoItemAnexo1;
  descripcion: string;
  unidadMedida: string;
  precioUnitario: number | null;
  area: string;
  estadoEvaluacion: Exclude<EstadoEvaluacionAnexo1, 'Pendiente'>;
  /** Comentario de la observación cuando el Anexo 01 está «No conforme». */
  comentario?: string;
  /** Un par [semestre 1, semestre 2] por cada año de `ANIOS_CMN`, en el mismo orden. */
  semestres: [SemestreConsolidado, SemestreConsolidado][];
}

/** Grupo del consolidado: Fuente / Rubro · Clasificador de gastos · Actividad operativa · Meta. */
export interface GrupoConsolidado {
  fuente: string;
  clasificador: string;
  actividadOperativa: string;
  meta: string;
  filas: FilaConsolidado[];
}

/** «Consolidado del Anexo N.º 02» de una solicitud: los Anexos 01 ya revisados (Conforme o No conforme). */
export interface ConsolidadoAnexo2 {
  solicitudId: string;
  numeroDocumento: string;
  entidad: string;
  fase: string;
  anios: number[];
  grupos: GrupoConsolidado[];
  /** Total por año: [semestre 1, semestre 2], en el orden de `anios`. */
  totales: [number, number][];
  totalGeneral: number;
}

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

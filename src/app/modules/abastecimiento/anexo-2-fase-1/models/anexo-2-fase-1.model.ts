/**
 * Proceso «Solicitud de CMN - Anexo N.º 02 | Fase 1: Identificación» del Cuadro Multianual de Necesidades (CMN).
 *
 * La Oficina de Abastecimiento consolida los Anexos 01 que remitieron las áreas usuarias: revisa el resumen de la
 * consolidación y el marco presupuestario de los tres años del CMN, elige en «Seleccionar registros» las áreas usuarias
 * que entran al Anexo 02, graba y verifica; el evaluador valida u observa y el aprobador aprueba u observa (no hay rechazo).
 */

/** Código del documento en el catálogo de documentos. */
export const CODIGO_DOCUMENTO = 'SA2F1';
/** Nombre del documento en la bandeja de CMN Programación (Figma «A.2-OA-EV-009»). */
export const NOMBRE_DOCUMENTO = 'Anexo 02 - Consolidado del Cuadro Multianual de Necesidades';
/** Opción del panel «Crear documento» (Figma «A.2-OA-EV-010»). */
export const NOMBRE_DOCUMENTO_CREAR = 'CMN Fase 1 - Anexo 02 Consolidado';
/** Título de la pantalla de la solicitud (Figma «A.1-RC-01»). */
export const TITULO_SOLICITUD = 'Solicitud de CMN - Anexo N.º 02 | Fase 1: Identificación';

/** Fase del CMN de una Solicitud de CMN - Anexo N.º 02. Las tres usan la misma pantalla y el mismo flujo. */
export type FaseCmn = 1 | 2 | 3;

/**
 * Textos de cada fase: nombre de la fase, título de la pantalla (y de las migas de pan), opción del panel «Crear
 * documento», valor del campo «Fase» y la referencia presupuestaria de los datos del Anexo 02. La Fase 1 conserva los
 * del Figma.
 */
export const FASES_CMN: Record<
  FaseCmn,
  { nombre: string; titulo: string; opcionCrear: string; etiqueta: string; referenciaPresupuestaria: string }
> = {
  1: {
    nombre: 'Identificación',
    titulo: TITULO_SOLICITUD,
    opcionCrear: NOMBRE_DOCUMENTO_CREAR,
    etiqueta: 'Fase 1 - Identificación',
    referenciaPresupuestaria: 'APM 2025',
  },
  2: {
    nombre: 'Clasificación y Priorización',
    titulo: 'Solicitud de CMN - Anexo N.º 02 | Fase 2: Clasificación y Priorización',
    opcionCrear: 'CMN Fase 2: Fase de clasificación y priorización',
    etiqueta: 'Fase 2 - Clasificación y Priorización',
    referenciaPresupuestaria: 'APM 2026',
  },
  3: {
    nombre: 'Consolidación y Aprobación',
    titulo: 'Solicitud de CMN - Anexo N.º 02 | Fase 3: Consolidación y Aprobación',
    opcionCrear: 'CMN Fase 3: Fase de consolidación y aprobación',
    etiqueta: 'Fase 3 - Consolidación y Aprobación',
    referenciaPresupuestaria: 'PIA 2026',
  },
};

/** Fase de un valor cualquiera (dato de ruta o de la solicitud); lo que no es 2 ni 3 es la Fase 1. */
export function faseCmn(valor: unknown): FaseCmn {
  return valor === 2 || valor === 3 ? valor : 1;
}

/** Acciones del documento: crear el Anexo 02 de una fase y modificar el que ya está aprobado. */
export const TIPO_ACCION = 'creacion';
export const ETIQUETA_TIPO_ACCION = 'Creación';
export const TIPO_ACCION_MODIFICACION = 'modificacion';
export const ETIQUETA_MODIFICACION = 'Modificación';

/** Tipo de acción como lo muestran las pantallas («modificacion» → «Modificación»). */
export function etiquetaTipoAccion(tipoAccion: string): string {
  if (tipoAccion === TIPO_ACCION) return ETIQUETA_TIPO_ACCION;
  return tipoAccion === TIPO_ACCION_MODIFICACION ? ETIQUETA_MODIFICACION : tipoAccion;
}

/** Documento con su fase, para distinguirlo en Documentos y la bandeja (nombre corto: la fase se ve sin cortarse). */
export function nombreDocumentoFase(fase: FaseCmn): string {
  return `Anexo 02 - Consolidado del CMN · Fase ${fase}`;
}

/** Registro de un Anexo 02 aprobado: «Anexo 02 · Fase 1 - Identificación». */
export function nombreRegistroFase(fase: FaseCmn): string {
  return `Anexo 02 · ${FASES_CMN[fase].etiqueta}`;
}

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
  /** Comentario de observación cuando la OA lo marcó «Incompleto» (Figma «Observar registro»). */
  comentarioEvaluacion?: string;
  /** Solo en un área modificada: monto del Anexo 01 original, del que salen sus ítems antes de los ajustes. */
  montoBase?: number;
  /** Solo en un área modificada: monto nuevo de cada necesidad cambiada (por id del ítem). */
  ajustes?: Record<string, number>;
}

/** Una necesidad en la Modificación del Anexo 02: lo vigente y lo que quedaría. */
export interface ItemModificacion {
  id: string;
  item: string;
  descripcion: string;
  tipo: TipoItemAnexo1;
  unidadMedida: string;
  precioUnitario: number | null;
  montoVigente: number;
  monto: number;
}

/** Un área usuaria en la Modificación del Anexo 02. */
export interface AreaModificacion {
  id: string;
  nombre: string;
  plazoModificacion: string;
  /** Fuera del plazo de modificación: sus necesidades se ven, pero no se cambian. */
  soloLectura: boolean;
  /** Sus necesidades salen del Anexo 02. */
  quitada: boolean;
  items: ItemModificacion[];
}

/** Anexo 02 vigente de una fase y lo que se puede modificar (o lo que ya modificó una solicitud grabada). */
export interface ModificacionAnexo2 {
  fase: FaseCmn;
  base: { documentoId: string; numero: string; fechaAprobacion: string };
  areas: AreaModificacion[];
}

/** Respuesta de «vigente»: sin `modificacion` si no hay Anexo 02 aprobado; `enProceso` si otra modificación está en curso. */
export interface VigenteAnexo2 {
  modificacion: ModificacionAnexo2 | null;
  enProceso: { id: string; numero: string; estado: string } | null;
}

/** Cuerpo para grabar la modificación: por área, si se quita y los montos nuevos de sus necesidades. */
export interface GuardarModificacionRequest {
  fase: FaseCmn;
  baseId: string;
  areas: { id: string; quitada: boolean; ajustes: Record<string, number> }[];
}

/** Áreas del Anexo 02 que la modificación toma como base (foto de lo vigente al registrarla). */
export interface BaseModificacionAnexo2 {
  documentoId: string;
  numero: string;
  fechaAprobacion: string;
  areas: AreaUsuariaAnexo1[];
}

/** Evaluación del Anexo 01 por la OA (Figma «3. Detalle items»): «Completo» o «Incompleto» desde su detalle. */
export type EstadoEvaluacionAnexo1 = 'Pendiente' | 'Completo' | 'Incompleto';

/** Años de programación del CMN (Año 1, 2 y 3): columnas del consolidado del Anexo N.º 02. */
export const ANIOS_CMN = [2027, 2028, 2029] as const;

export type TipoItemAnexo1 = 'Bien' | 'Servicio';

/** Un ítem (necesidad) del Anexo 01 de un área usuaria: tabla del panel «Anexo N° 01» y filas del consolidado. */
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

/** Lo que muestra el panel «Anexo N° 01» de un área usuaria incluida en la solicitud. */
export interface DetalleAnexo1 {
  area: AreaUsuariaAnexo1;
  items: ItemAnexo1[];
  /** La OA todavía puede dar conformidad u observar (solicitud ELABORADA u OBSERVADA y Anexo 01 pendiente). */
  evaluable: boolean;
}

/** Cuerpo de «Completo» / «Incompleto» (el comentario es obligatorio para «Incompleto»). */
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
  /** Comentario de la observación cuando el Anexo 01 está «Incompleto». */
  comentario?: string;
  /** Un par [semestre 1, semestre 2] por cada año de `ANIOS_CMN`, en el mismo orden. */
  semestres: [SemestreConsolidado, SemestreConsolidado][];
}

/** Grupo del consolidado: Fuente / Rubro · Clasificador de gastos · Actividad presupuestaria · Meta. */
export interface GrupoConsolidado {
  fuente: string;
  clasificador: string;
  actividadOperativa: string;
  meta: string;
  filas: FilaConsolidado[];
}

/** «Consolidado del Anexo N.º 02» de una solicitud: los Anexos 01 ya revisados (Completo o Incompleto). */
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

/** Una versión del registro: la solicitud aprobada que lo creó o lo modificó. */
export interface VersionRegistroAnexo2 {
  documentoId: string;
  numero: string;
  tipoAccion: string;
  /** Fecha de aprobación (ISO). */
  fechaAprobacion: string;
}

/** Lo programado en un año frente al presupuesto de la fase (APM o PIA). */
export interface ProgramadoAnio {
  anio: number;
  monto: number;
  techo: number;
}

/**
 * Registro de CMN Programación (Figma «B.1-RC-016»): uno por Anexo 02 aprobado de cada fase. Una modificación aprobada
 * no crea otro: actualiza el mismo registro y suma una versión a su historial.
 */
export interface RegistroAnexo2 {
  id: string;
  /** Número del registro en la entidad («0001»). */
  numero: string;
  fase: FaseCmn;
  areas: number;
  necesidades: number;
  programado: ProgramadoAnio[];
  /** Solicitud vigente (la última aprobada) y su número. */
  documentoId: string;
  numeroDocumento: string;
  fechaAprobacion: string;
  /** De la más antigua a la vigente. */
  versiones: VersionRegistroAnexo2[];
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

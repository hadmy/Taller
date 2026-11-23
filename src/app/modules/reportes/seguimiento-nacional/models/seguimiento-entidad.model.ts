/**
 * «Resumen de la Entidad» del seguimiento del CMN: cómo programa una Entidad (011 - Ministerio de Educación) en cada
 * fase, por área usuaria. Lo calcula el backend simulado.
 */

/** Estado del Anexo N.º 01 de un área usuaria; -1 es «sin Anexo N.º 01 registrado». */
export const ESTADOS_ANEXO_01 = ['Elaborado', 'Verificado', 'Validado', 'Observado', 'Aprobado'] as const;
export const ANEXO_01_APROBADO = 4;
export const SIN_ANEXO_01 = -1;

/** Revisión de la Oficina de Abastecimiento sobre un Anexo N.º 01 aprobado. */
export const REVISIONES_OA = ['Pendiente', 'Conforme', 'No conforme'] as const;

export const GENERICAS_ENTIDAD = [
  { codigo: '2.3', nombre: '2.3 Bienes y servicios', corto: '2.3 Bienes y servicios' },
  { codigo: '2.6', nombre: '2.6 Adquisición de activos no financieros', corto: '2.6 Activos no financieros' },
  { codigo: '2.5', nombre: '2.5 Otros gastos', corto: '2.5 Otros gastos' },
] as const;

/** Estado de una necesidad remitida a un Área Técnica Estratégica (ATE). */
export const ESTADOS_REMISION = ['Pendiente', 'Aceptada', 'Rechazada'] as const;
export const REMISION_ACEPTADA = 1;

export const NOMBRES_ETAPA = [
  'Etapa 1 · Programación de necesidades',
  'Etapa 2 · Atención por las ATE y aprobación del Anexo N.º 01',
  'Etapa 3 · Consolidación del Anexo N.º 02',
] as const;

export interface AreaUsuariaEntidad {
  codigo: string;
  nombre: string;
  /** Es Área Técnica Estratégica: recibe necesidades de otras áreas. */
  esAte: boolean;
  /** Código del área de la que depende, si es una unidad. */
  titular: string | null;
}

export interface SituacionAnexo01 {
  /** Índice de `ESTADOS_ANEXO_01`, o `SIN_ANEXO_01`. */
  estado: number;
  /** Índice de `REVISIONES_OA` (solo con el Anexo N.º 01 aprobado). */
  revision: number | null;
  /** Solicitud de ampliación de plazo de etapa: «Pendiente», «Aceptada» o «Rechazada». */
  ampliacion: string | null;
  /** Versión aprobada del Anexo N.º 01 tras ajustes. */
  version: number;
  /** La OA notificó ajustes (revisión «No conforme»). */
  ajustado: boolean;
}

export interface NecesidadEntidad {
  fase: number;
  /** Área usuaria que la programa. */
  area: string;
  item: string;
  descripcion: string;
  unidad: string;
  tipo: 'B' | 'S';
  /** Código de la genérica («2.3»). */
  generica: string;
  /** Índice de la orden de prelación (`ORDENES_PRELACION`). */
  orden: number;
  /** ATE a la que se remitió, o `null` si es propia. */
  ate: string | null;
  /** Índice de `ESTADOS_REMISION` (solo si se remitió a una ATE). */
  remision: number | null;
  /** Monto de los años 1, 2 y 3, en soles. */
  montos: [number, number, number];
}

export interface FaseEntidad {
  numero: number;
  nombre: string;
  /** Periodo rector de la fase (aaaa-mm-dd). */
  inicio: string;
  fin: string;
  /** Las tres etapas configuradas por la Entidad. */
  etapas: { inicio: string; fin: string }[];
}

export interface SeguimientoEntidad {
  /** «011 - Ministerio de Educación» */
  entidad: string;
  periodo: string;
  fechaCorte: string;
  fases: FaseEntidad[];
  areas: AreaUsuariaEntidad[];
  /** Situación del Anexo N.º 01 por fase («2») y área usuaria. */
  situacion: Record<string, Record<string, SituacionAnexo01>>;
  necesidades: NecesidadEntidad[];
  /** Techo presupuestario de cada área usuaria por genérica, en soles. */
  techos: Record<string, Record<string, number>>;
}

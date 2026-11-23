/**
 * «Seguimiento nacional del CMN Programación» (consulta de la DPLAIP): cómo avanza cada Entidad del país en la fase
 * elegida de un periodo de programación. Lo calcula el backend simulado.
 */

/** Estado del Anexo N.º 02 de la Entidad en la fase; el índice es el valor de `EntidadSeguimiento.estado`. */
export const ESTADOS_ANEXO_02 = ['Sin iniciar', 'En elaboración', 'En evaluación', 'Aprobado'] as const;
export type EstadoAnexo02 = 0 | 1 | 2 | 3;
export const ESTADO_APROBADO: EstadoAnexo02 = 3;

export const ORDENES_PRELACION = [
  '1. Servicios básicos',
  '2. Obligaciones financieras',
  '3. Previsiones presupuestarias',
  '4. Necesidades estratégicas',
  '5. Necesidades operativas',
] as const;

export const ESTADOS_AMPLIACION = [
  'En evaluación – MAA',
  'En evaluación – DPLAIP',
  'En evaluación – DGA',
  'Observada',
  'Aprobada',
  'Rechazada',
] as const;

export const NIVELES_GOBIERNO = ['Gobierno Nacional', 'Gobierno Regional', 'Gobierno Local'] as const;

export const DEPARTAMENTOS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
  'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
] as const;

export const NOMBRES_FASE = ['Identificación', 'Clasificación y Priorización', 'Consolidación y Aprobación'] as const;

/** Periodos de programación: el de 2026 programa 2027-2029 y está en su fase 2. */
export const PERIODOS_SEGUIMIENTO = [
  { valor: '2026', etiqueta: '2026 (programa 2027 - 2029)', faseVigente: 2 },
  { valor: '2025', etiqueta: '2025 (programa 2026 - 2028)', faseVigente: 3 },
] as const;

/** Una Entidad del Clasificador Institucional y su situación en la fase consultada. */
export interface EntidadSeguimiento {
  /** Código de Entidad/Pliego del Clasificador Institucional. */
  codigo: string;
  nombre: string;
  /** Grupo del Clasificador: nivel de gobierno. */
  nivel: string;
  subgrupo: string;
  area: string;
  /** Departamento del ubigeo de la Entidad. */
  departamento: string;
  /** Áreas usuarias habilitadas para programar. */
  areasUsuarias: number;
  estado: EstadoAnexo02;
  /** Día de la fase (desde su inicio) en que se aprobó el Anexo N.º 02; `null` si no está aprobado. */
  diaAprobacion: number | null;
  /** Estado de su solicitud de ampliación de plazo de fase; `null` si no pidió. */
  ampliacion: string | null;
  anexos01Aprobados: number;
  /** Monto programado de los años 1, 2 y 3, en soles. */
  montos: [number, number, number];
  /** Parte del monto de cada orden de prelación (suman 1), en el orden de `ORDENES_PRELACION`. */
  prelacion: number[];
}

export interface FaseRectora {
  numero: number;
  nombre: string;
  /** aaaa-mm-dd */
  inicio: string;
  fin: string;
}

export interface SeguimientoNacional {
  periodo: string;
  fase: number;
  /** aaaa-mm-dd */
  fechaCorte: string;
  fases: FaseRectora[];
  entidades: EntidadSeguimiento[];
}

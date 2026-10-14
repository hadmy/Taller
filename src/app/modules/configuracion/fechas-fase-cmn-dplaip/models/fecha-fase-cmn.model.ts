/** Rango de fechas (inicio/fin) de una fase, en formato ISO (yyyy-mm-dd) o vacío si no se configuró. */
export interface FaseFecha {
  inicio: string;
  fin: string;
}

export function faseFechaVacia(): FaseFecha {
  return { inicio: '', fin: '' };
}

/** Un año con fechas de fase configuradas para el CMN - DPLAIP: inicio y fin de cada una de las 3 fases. */
export interface FechaFaseCmnDplaip {
  id: string;
  anio: number;
  estado: 'Activo' | 'Inactivo' | 'En Proceso';
  fase1: FaseFecha;
  fase2: FaseFecha;
  fase3: FaseFecha;
}

/** Rango de fechas (inicio/fin) de una fase, en formato ISO (yyyy-mm-dd) o vacío si no se configuró. */
export interface FaseFecha {
  inicio: string;
  fin: string;
}

/** Un año con fechas de fase configuradas para el CMN de la entidad. */
export interface FechaFaseCmnEntidad {
  id: string;
  anio: number;
  estado: 'Activo' | 'Inactivo' | 'En Proceso';
  fase1: FaseFecha;
  fase2: FaseFecha;
  fase3: FaseFecha;
}

export function faseFechaVacia(): FaseFecha {
  return { inicio: '', fin: '' };
}

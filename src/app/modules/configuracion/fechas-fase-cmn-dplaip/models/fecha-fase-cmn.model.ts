/** Rango de fechas (inicio/fin) de una etapa, en formato ISO (yyyy-mm-dd) o vacío si no se configuró. */
export interface FaseFecha {
  inicio: string;
  fin: string;
}

export function faseFechaVacia(): FaseFecha {
  return { inicio: '', fin: '' };
}

/** Las tres etapas de una fase, cada una con su propio rango de fechas. */
export interface EtapasFase {
  etapa1: FaseFecha;
  etapa2: FaseFecha;
  etapa3: FaseFecha;
}

export function etapasFaseVacia(): EtapasFase {
  return { etapa1: faseFechaVacia(), etapa2: faseFechaVacia(), etapa3: faseFechaVacia() };
}

/** Un año con fechas de fase configuradas para el CMN - DPLAIP: 3 fases, cada una con 3 etapas. */
export interface FechaFaseCmnDplaip {
  id: string;
  anio: number;
  estado: 'Activo' | 'Inactivo' | 'En Proceso';
  fase1: EtapasFase;
  fase2: EtapasFase;
  fase3: EtapasFase;
}

/** Etiqueta y anexo de cada una de las tres etapas, iguales en las tres fases (Figma, nodo 3591:262078). */
export const ETAPAS_FASE: { key: keyof EtapasFase; titulo: string; anexo: string }[] = [
  { key: 'etapa1', titulo: 'Etapa 1', anexo: 'Anexo 1: Registro de necesidades (ATEs / No ATEs)' },
  { key: 'etapa2', titulo: 'Etapa 2', anexo: 'Anexo 1: Registro de necesidades (No ATEs)' },
  { key: 'etapa3', titulo: 'Etapa 3', anexo: 'Anexo 2: Consolidación de necesidades de AU' },
];

/** Fechas de las tres etapas de una fase, en orden: para calcular el rango resumen de la fase. */
export function fechasDeFase(fase: EtapasFase): string[] {
  return [fase.etapa1.inicio, fase.etapa1.fin, fase.etapa2.inicio, fase.etapa2.fin, fase.etapa3.inicio, fase.etapa3.fin].filter(Boolean);
}

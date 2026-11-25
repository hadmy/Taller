/** Parámetros generales del CMN. */
export interface ParametrosCmn {
  /** Los fija la DPLAIP; `null` mientras no los fija. */
  aniosPredefinidos: number | null;
  /** Los fija la Entidad. */
  maximoAdicionales: number;
  /** Fases (1, 2 y 3) cuyo Anexo 2 requiere un segundo validador. */
  validacionAdicional: Record<1 | 2 | 3, boolean>;
}

/** Años que rigen mientras la DPLAIP no fija otros: los de la normativa. */
export const ANIOS_NORMATIVA = 3;
export const MAXIMO_PREDEFINIDOS = 5;
export const MAXIMO_ADICIONALES = 20;

export const FASES_VALIDACION = [
  { numero: 1, nombre: 'Identificación' },
  { numero: 2, nombre: 'Clasificación y Priorización' },
  { numero: 3, nombre: 'Consolidación y Aprobación' },
] as const;

/** Pasos del flujo del Anexo 2 de una fase, con o sin validador adicional. */
export function pasosDelFlujo(adicional: boolean): { rol: string; cargo: string }[] {
  return [
    { rol: 'Creador', cargo: 'Espec. de Abastecimiento' },
    { rol: 'Validador', cargo: 'Jefe de Abastecimiento' },
    ...(adicional ? [{ rol: 'Validador Adicional', cargo: 'Validador Adicional' }] : []),
    { rol: 'Aprobador', cargo: 'Jefe AGA' },
  ];
}

/** Opciones «1» a `hasta` de un selector de cantidad. */
export const opcionesHasta = (hasta: number): { label: string; value: string }[] =>
  Array.from({ length: hasta }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));

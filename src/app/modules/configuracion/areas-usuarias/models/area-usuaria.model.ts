/**
 * Área usuaria del pliego, jerárquica por código (`01`, `01.01`, `01.01.01`…). Las cuatro banderas definen en qué
 * fases del Cuadro Multianual de Necesidades participa el área.
 */
export interface AreaUsuaria {
  id: string;
  codigo: string;
  denominacion: string;
  generaCmn: boolean;
  esAte: boolean;
  esOa: boolean;
  esAga: boolean;
  /** Área traída por «Sincronizar» que todavía no se grabó: la tabla la marca con la etiqueta «Nuevo». */
  nuevo?: boolean;
  /** Su configuración ya se grabó: en la lista sus cuatro banderas pasan de inactivas a activas. */
  configurada?: boolean;
  /** Solo backend simulado: área del pliego que aparece en la lista recién al sincronizar. */
  pendiente?: boolean;
}

/** Los cuatro flags editables de `AreaUsuaria`, en el orden de las columnas de la tabla. */
export const BANDERAS_AREA_USUARIA: { key: keyof AreaUsuaria; label: string }[] = [
  { key: 'generaCmn', label: '¿Genera CMN?' },
  { key: 'esAte', label: '¿Es ATE?' },
  { key: 'esOa', label: '¿Es OA?' },
  { key: 'esAga', label: '¿Es AGA?' },
];

/** Igual que `BANDERAS_AREA_USUARIA`, con las etiquetas del detalle de área (Figma «Conf-Areas usuarias-03»). */
export const BANDERAS_AREA_USUARIA_DETALLE: { key: keyof AreaUsuaria; label: string }[] = [
  { key: 'generaCmn', label: 'Generar CMN?' },
  { key: 'esAte', label: 'Es ATE?' },
  { key: 'esOa', label: 'Es OA?' },
  { key: 'esAga', label: 'Es AGA?' },
];

/** Fila del catálogo de commodities/ítems del que se elige en «Buscar commodities u ítems» (Figma «Conf-Areas usuarias-06»). */
export interface CatalogoItem {
  id: string;
  commodity: string;
  descripcionCommodity: string;
  item: string;
  descripcionItem: string;
}

/**
 * Commodity/ítem que el área usuaria puede pedir en el Cuadro Multianual de Necesidades. Pestaña «Commodities u
 * Items a pedir» del detalle de área.
 */
export interface AreaUsuariaItem {
  id: string;
  areaUsuariaId: string;
  /** Pestaña del detalle a la que pertenece: lo que el área atiende, lo que puede pedir o sus necesidades estratégicas. */
  tipo: 'atiende' | 'puede-pedir' | 'necesidades';
  commodity: string;
  descripcionCommodity: string;
  item: string;
  descripcionItem: string;
  vigente: boolean;
}

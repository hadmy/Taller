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
  esMaa: boolean;
  /** Área traída por «Sincronizar» que todavía no se grabó: la tabla la marca con la etiqueta «Nuevo». */
  nuevo?: boolean;
  /** Su configuración ya se grabó: en la lista sus cuatro banderas pasan de inactivas a activas. */
  configurada?: boolean;
  /** Solo backend simulado: área del pliego que aparece en la lista recién al sincronizar. */
  pendiente?: boolean;
}

/** Qué significa cada bandera: se muestra como tooltip sobre su etiqueta. */
const DESCRIPCION_BANDERA = {
  generaCmn: 'Área participa del CMN a programar',
  esAte: 'Área Técnica Estratégica',
  esOa: 'Oficina de Abastecimiento',
  esMaa: 'Máxima Autoridad Administrativa',
} as const;

/** Los cuatro flags editables de `AreaUsuaria`, en el orden de las columnas de la tabla. */
export const BANDERAS_AREA_USUARIA: { key: keyof AreaUsuaria; label: string; descripcion: string }[] = [
  { key: 'generaCmn', label: '¿Genera CMN?', descripcion: DESCRIPCION_BANDERA.generaCmn },
  { key: 'esAte', label: '¿Es ATE?', descripcion: DESCRIPCION_BANDERA.esAte },
  { key: 'esOa', label: '¿Es OA?', descripcion: DESCRIPCION_BANDERA.esOa },
  { key: 'esMaa', label: '¿Es MAA?', descripcion: DESCRIPCION_BANDERA.esMaa },
];

/** Igual que `BANDERAS_AREA_USUARIA`, con las etiquetas del detalle de área (Figma «Conf-Areas usuarias-03»). */
export const BANDERAS_AREA_USUARIA_DETALLE: { key: keyof AreaUsuaria; label: string; descripcion: string }[] = [
  { key: 'generaCmn', label: 'Generar CMN?', descripcion: DESCRIPCION_BANDERA.generaCmn },
  { key: 'esAte', label: 'Es ATE?', descripcion: DESCRIPCION_BANDERA.esAte },
  { key: 'esOa', label: 'Es OA?', descripcion: DESCRIPCION_BANDERA.esOa },
  { key: 'esMaa', label: 'Es MAA?', descripcion: DESCRIPCION_BANDERA.esMaa },
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

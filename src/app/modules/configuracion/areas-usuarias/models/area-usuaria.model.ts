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
  { key: 'generaCmn', label: '¿Genera CMN?' },
  { key: 'esAte', label: '¿Es ATE?' },
  { key: 'esOa', label: '¿Es OGA?' },
  { key: 'esAga', label: '¿Es AGA?' },
];

/**
 * Commodity/ítem que el área usuaria puede pedir en el Cuadro Multianual de Necesidades. Pestaña «Commodities u
 * Items a pedir» del detalle de área.
 */
export interface AreaUsuariaItem {
  id: string;
  areaUsuariaId: string;
  commodity: string;
  descripcionCommodity: string;
  item: string;
  descripcionItem: string;
  vigente: boolean;
}

/** Ruta e id del proceso. El id existe en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const FECHAS_FASE_CMN_ENTIDAD_ROUTE = '/procesos/cuadro-multianual-necesidades/configuracion/fechas-fase-cmn-entidad';

/** Formulario «+»: elegir año y configurar sus tres fases (fecha inicio / fin). */
export const FECHAS_FASE_CMN_ENTIDAD_FORM_ROUTE = `${FECHAS_FASE_CMN_ENTIDAD_ROUTE}/nuevo`;

/** Lista de años configurados: es la pantalla de entrada (Figma 5110:411128); su «+» y «Editar» abren el formulario. */
export const FECHAS_FASE_CMN_ENTIDAD_LISTA_ROUTE = FECHAS_FASE_CMN_ENTIDAD_ROUTE;

/** Hoja del árbol de procesos: arma las migas de pan. */
export const FECHAS_FASE_CMN_ENTIDAD_PROCESS_ID = 'cuadro-multianual-necesidades-configuracion-fechas-fase-entidad';

/** Ruta e id del proceso. El id existe en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const FECHAS_FASE_CMN_DPLAIP_ROUTE = '/procesos/cuadro-multianual-necesidades/configuracion/fechas-fase-cmn-dplaip';

/** Formulario «+»: elegir año y configurar sus tres fases (fecha inicio / fin). */
export const FECHAS_FASE_CMN_DPLAIP_FORM_ROUTE = `${FECHAS_FASE_CMN_DPLAIP_ROUTE}/nuevo`;

/** Lista de años configurados: a ella se llega al grabar; su «+» y «Editar» abren el formulario. */
export const FECHAS_FASE_CMN_DPLAIP_LISTA_ROUTE = `${FECHAS_FASE_CMN_DPLAIP_ROUTE}/lista`;

/** Hoja del árbol de procesos: arma las migas de pan. */
export const FECHAS_FASE_CMN_DPLAIP_PROCESS_ID = 'cuadro-multianual-necesidades-configuracion-fechas-fase-dplaip';

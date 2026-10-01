/** Ruta e id del proceso. El id existe en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE =
  '/procesos/cuadro-multianual-necesidades/configuracion/distribucion-interna-presupuesto';

/** Formulario «+»: elegir año y presupuesto de fase, y repartir el techo presupuestal por genérica. */
export const DISTRIBUCION_INTERNA_PRESUPUESTO_FORM_ROUTE = `${DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE}/nuevo`;

/** Hoja del árbol de procesos: arma las migas de pan. */
export const DISTRIBUCION_INTERNA_PRESUPUESTO_PROCESS_ID =
  'cuadro-multianual-necesidades-configuracion-distribucion-interna-presupuestaria';

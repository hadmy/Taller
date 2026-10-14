import type { CreateDocumentProcessOption } from '../../../../shared/components/create-document/create-document.component';
import { ETIQUETA_TIPO_ACCION, NOMBRE_DOCUMENTO } from '../models/item-estrategico.model';

/** Rutas e ids del proceso. Los ids existen en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const PROCESS_ROUTE = '/procesos/cuadro-multianual-necesidades/solicitudes/items-estrategicos';
export const REQUEST_SEGMENT = 'solicitud';
export const REQUEST_ROUTE = `${PROCESS_ROUTE}/${REQUEST_SEGMENT}`;

/** Hoja «Ítems estratégicos» del árbol de procesos: arma las migas de pan. */
export const PROCESS_ID = 'cuadro-multianual-necesidades-solicitudes-items-estrategicos';

/** Código del proceso en `/tipos-documento` (agrupa el panel «Crear documento»). */
export const PROCESO_CODIGO = 'items-estrategicos';

/** Opción del panel «Crear documento» (shell y pestaña Documentos). */
export const CREATE_DOCUMENT_OPTIONS: CreateDocumentProcessOption[] = [
  {
    id: PROCESO_CODIGO,
    label: 'Ítems estratégicos',
    route: REQUEST_ROUTE,
    documents: [NOMBRE_DOCUMENTO],
    documentOptions: [{ label: NOMBRE_DOCUMENTO, route: REQUEST_ROUTE, actionTypes: [ETIQUETA_TIPO_ACCION] }],
    actionTypes: [ETIQUETA_TIPO_ACCION],
  },
];

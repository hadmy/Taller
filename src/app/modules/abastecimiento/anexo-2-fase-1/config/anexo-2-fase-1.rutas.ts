import type { CreateDocumentProcessOption } from '../../../../shared/components/create-document/create-document.component';
import { ETIQUETA_TIPO_ACCION, NOMBRE_DOCUMENTO_CREAR } from '../models/anexo-2-fase-1.model';

/**
 * Rutas e ids del proceso. Los ids existen en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts).
 * `PROCESS_ROUTE` es «Documentos y registros» de CMN Programación (Figma «A.2-OA-EV-009»).
 */
export const PROCESS_ROUTE = '/procesos/cmn-programacion';
export const REQUEST_SEGMENT = 'anexo-2-fase-1';
export const REQUEST_ROUTE = `${PROCESS_ROUTE}/${REQUEST_SEGMENT}`;
/** «Detalle del Anexo 1» de un área usuaria de la solicitud: `REQUEST_ROUTE/:id/anexo-1/:areaId` (Figma «3. Detalle items»). */
export const ANEXO_1_SEGMENT = 'anexo-1';
/** «Consolidado del Anexo N.º 02» de la solicitud: `REQUEST_ROUTE/:id/consolidado`. */
export const CONSOLIDADO_SEGMENT = 'consolidado';

/** Hoja «CMN Programación» del árbol de procesos: arma las migas de pan. */
export const PROCESS_ID = 'cmn-programacion';

/** Nombre del proceso: título de Documentos y registros y columna «Sistema». */
export const NOMBRE_PROCESO = 'CMN Programación';

/** Código del proceso en `/tipos-documento` (agrupa el panel «Crear documento»). */
export const PROCESO_CODIGO = 'cmn-anexo-2-fase-1';

/** Opción del panel «Crear documento» (shell y pestaña Documentos). */
export const CREATE_DOCUMENT_OPTIONS: CreateDocumentProcessOption[] = [
  {
    id: PROCESO_CODIGO,
    label: NOMBRE_PROCESO,
    route: REQUEST_ROUTE,
    documents: [NOMBRE_DOCUMENTO_CREAR],
    documentOptions: [{ label: NOMBRE_DOCUMENTO_CREAR, route: REQUEST_ROUTE, actionTypes: [ETIQUETA_TIPO_ACCION] }],
    actionTypes: [ETIQUETA_TIPO_ACCION],
  },
];

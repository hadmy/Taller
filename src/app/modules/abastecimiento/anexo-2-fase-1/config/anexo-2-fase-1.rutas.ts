import type { CreateDocumentProcessOption } from '../../../../shared/components/create-document/create-document.component';
import { ETIQUETA_MODIFICACION, ETIQUETA_TIPO_ACCION, FASES_CMN, FaseCmn } from '../models/anexo-2-fase-1.model';

/**
 * Rutas e ids del proceso. Los ids existen en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts).
 * `PROCESS_ROUTE` es «Documentos y registros» de CMN Programación (Figma «A.2-OA-EV-009»).
 */
export const PROCESS_ROUTE = '/procesos/cmn-programacion';
export const REQUEST_SEGMENT = 'anexo-2-fase-1';
export const REQUEST_ROUTE = `${PROCESS_ROUTE}/${REQUEST_SEGMENT}`;

/**
 * Ruta para crear la solicitud de cada fase del CMN. Las tres abren la misma pantalla (la fase va en `data.fase`);
 * una vez grabada, la solicitud se abre en `REQUEST_ROUTE/:id` y su fase sale de la propia solicitud.
 */
export const REQUEST_ROUTE_POR_FASE: Record<FaseCmn, string> = {
  1: REQUEST_ROUTE,
  2: `${PROCESS_ROUTE}/anexo-2-fase-2`,
  3: `${PROCESS_ROUTE}/anexo-2-fase-3`,
};

/** Hoja «CMN Programación» del árbol de procesos: arma las migas de pan. */
export const PROCESS_ID = 'cmn-programacion';

/** Nombre del proceso: título de Documentos y registros y columna «Sistema». */
export const NOMBRE_PROCESO = 'CMN Programación';

/** Código del proceso en `/tipos-documento` (agrupa el panel «Crear documento»). */
export const PROCESO_CODIGO = 'cmn-anexo-2-fase-1';

const FASES: FaseCmn[] = [1, 2, 3];

/** Opciones del panel «Crear documento» (shell y pestaña Documentos): una por fase del CMN. */
export const CREATE_DOCUMENT_OPTIONS: CreateDocumentProcessOption[] = [
  {
    id: PROCESO_CODIGO,
    label: NOMBRE_PROCESO,
    route: REQUEST_ROUTE,
    documents: FASES.map((fase) => FASES_CMN[fase].opcionCrear),
    documentOptions: FASES.map((fase) => ({
      label: FASES_CMN[fase].opcionCrear,
      route: REQUEST_ROUTE_POR_FASE[fase],
      actionTypes: [ETIQUETA_TIPO_ACCION, ETIQUETA_MODIFICACION],
    })),
    actionTypes: [ETIQUETA_TIPO_ACCION, ETIQUETA_MODIFICACION],
  },
];

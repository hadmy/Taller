import { ESTADO } from '../../../../core/models/documento.model';
import type {
  DocumentsRecordsColumn,
  DocumentsRecordsConfig,
  DocumentsRecordsFilterOption,
  DocumentsRecordsMenuOption,
} from '../../../../shared/types/documents-records.types';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { ETIQUETA_TIPO_ACCION, NOMBRE_DOCUMENTO } from '../models/anexo-2-fase-1.model';
import { CREATE_DOCUMENT_OPTIONS, NOMBRE_PROCESO, PROCESS_ID, PROCESS_ROUTE, REQUEST_ROUTE } from './anexo-2-fase-1.rutas';

/**
 * Configuración de «Documentos y registros» de CMN Programación (Figma «A.2-OA-EV-009»). La pantalla completa la pinta
 * `siaf-documents-records-page`: aquí solo se dice qué columnas, filtros y opciones tiene.
 */

const documentColumns: DocumentsRecordsColumn[] = [
  { key: 'document', label: 'Documento', visibility: 'visible', group: 'default', widthClass: 'w-[250px]', kind: 'document-link' },
  { key: 'number', label: 'Número', visibility: 'visible', group: 'default', widthClass: 'w-[80px]' },
  { key: 'actionType', label: 'Tipo de acción', visibility: 'visible', group: 'default', widthClass: 'w-[120px]' },
  { key: 'status', label: 'Estado', visibility: 'visible', group: 'default', widthClass: 'w-[110px]', kind: 'flow-status' },
  { key: 'system', label: 'Sistema', visibility: 'visible', group: 'default', widthClass: 'w-[170px]' },
  { key: 'date', label: 'Fecha de registro', visibility: 'visible', group: 'default', widthClass: 'w-[150px]' },
  { key: 'entity', label: 'Entidad', visibility: 'visible', group: 'default', widthClass: 'w-[220px]' },
  { key: 'creator', label: 'Creador', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
  { key: 'requesterArea', label: 'Área solicitante', visibility: 'hidden', group: 'more', widthClass: 'w-[240px]' },
  { key: 'evaluationDate', label: 'Fecha de evaluación', visibility: 'hidden', group: 'more', widthClass: 'w-[200px]' },
  { key: 'evaluationUser', label: 'Usuario de evaluación', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
  { key: 'approvalDate', label: 'Fecha de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[200px]' },
  { key: 'approvalUser', label: 'Usuario de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
];

const recordColumns: DocumentsRecordsColumn[] = [
  { key: 'area', label: 'Área usuaria', visibility: 'visible', group: 'default', widthClass: 'min-w-[320px]' },
  { key: 'items', label: 'Ítems', visibility: 'visible', group: 'default', widthClass: 'w-[120px]' },
  { key: 'monto', label: 'Monto programado A01', visibility: 'visible', group: 'default', widthClass: 'w-[220px]' },
  { key: 'number', label: 'Solicitud', visibility: 'visible', group: 'default', widthClass: 'w-[280px]' },
  { key: 'fechaRegistro', label: 'Fecha de aprobación', visibility: 'visible', group: 'default', widthClass: 'w-[170px]' },
];

const fieldsMenuOptions: DocumentsRecordsMenuOption[] = [
  { label: 'Documento' },
  { label: 'Tipo de acción' },
  { label: 'Estado' },
  { label: 'Fecha de registro', hasChildren: true },
  { label: 'Entidad' },
];

const filterCampoOptions: DocumentsRecordsFilterOption[] = [
  { label: 'Documento', value: 'document' },
  { label: 'Número', value: 'number' },
  { label: 'Tipo de acción', value: 'actionType' },
  { label: 'Estado', value: 'status' },
  { label: 'Fecha', value: 'date' },
  { label: 'Entidad', value: 'entity' },
];

const filterValorOptions: DocumentsRecordsFilterOption[] = [
  { label: ESTADO.ELABORADO, value: ESTADO.ELABORADO },
  { label: ESTADO.VERIFICADO, value: ESTADO.VERIFICADO },
  { label: ESTADO.VALIDADO, value: ESTADO.VALIDADO },
  { label: ESTADO.APROBADO, value: ESTADO.APROBADO },
  { label: ETIQUETA_TIPO_ACCION, value: ETIQUETA_TIPO_ACCION },
];

export const CMN_PROGRAMACION_DOCUMENTS_CONFIG: DocumentsRecordsConfig = {
  title: NOMBRE_PROCESO,
  processId: PROCESS_ID,
  defaultRequestRoute: REQUEST_ROUTE,
  createDocumentOptions: CREATE_DOCUMENT_OPTIONS,
  breadcrumbs: buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, 'Documentos y Registros'),
  documentRows: [],
  recordRows: [],
  documentColumns,
  recordColumns,
  // `table-fixed`: las columnas toman el ancho del Figma y el documento largo se corta (con tooltip), sin scroll.
  documentTableMinWidthClass: 'min-w-[1000px] table-fixed',
  recordTableMinWidthClass: 'min-w-[1100px]',
  recordTrackKey: 'recordId',
  recordHistoryDocumentLabel: NOMBRE_DOCUMENTO,
  // El historial de un registro es el de la solicitud (Anexo 02) que lo incluyó.
  recordHistoryKind: 'documento',
  statusFilterOptions: [ESTADO.ELABORADO, ESTADO.VERIFICADO, ESTADO.VALIDADO, ESTADO.OBSERVADO, ESTADO.APROBADO, ESTADO.RECHAZADO],
  actionTypeFilterOptions: [ETIQUETA_TIPO_ACCION],
  filterCampoOptions,
  filterValorOptions,
  fieldsMenuOptions,
  recordFilterCampoOptions: [
    { label: 'Área usuaria', value: 'area' },
    { label: 'Solicitud', value: 'number' },
  ],
  recordFilterValorOptions: [],
};

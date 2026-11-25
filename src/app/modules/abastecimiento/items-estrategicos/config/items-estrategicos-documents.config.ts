import { ESTADO } from '../../../../core/models/documento.model';
import type {
  DocumentsRecordsColumn,
  DocumentsRecordsConfig,
  DocumentsRecordsFilterOption,
} from '../../../../shared/types/documents-records.types';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { ETIQUETA_TIPO_ACCION, NOMBRE_DOCUMENTO } from '../models/item-estrategico.model';
import { CREATE_DOCUMENT_OPTIONS, PROCESS_ID, PROCESS_ROUTE, REQUEST_ROUTE } from './items-estrategicos.rutas';

/**
 * Configuración de «Documentos y registros» de los necesidades estratégicas. La pantalla completa la pinta
 * `siaf-documents-records-page`: aquí solo se dice qué columnas, filtros y opciones tiene.
 */

const documentColumns: DocumentsRecordsColumn[] = [
  { key: 'document', label: 'Documento', visibility: 'visible', group: 'default', widthClass: 'w-[340px]', kind: 'document-link' },
  { key: 'number', label: 'Número', visibility: 'visible', group: 'default', widthClass: 'w-[280px]' },
  { key: 'actionType', label: 'Tipo de acción', visibility: 'visible', group: 'default', widthClass: 'w-[160px]' },
  { key: 'status', label: 'Estado', visibility: 'visible', group: 'default', widthClass: 'w-[150px]', kind: 'flow-status' },
  { key: 'system', label: 'Sistemas Nacionales', visibility: 'visible', group: 'default', widthClass: 'w-[260px]' },
  { key: 'date', label: 'Fecha de registro', visibility: 'visible', group: 'default', widthClass: 'w-[170px]' },
  { key: 'creator', label: 'Creador', visibility: 'visible', group: 'more', widthClass: 'w-[220px]' },
  { key: 'subject', label: 'Asunto/Motivo', visibility: 'hidden', group: 'more', widthClass: 'w-[280px]' },
  { key: 'requesterArea', label: 'Área solicitante', visibility: 'hidden', group: 'more', widthClass: 'w-[240px]' },
  { key: 'entity', label: 'Entidad', visibility: 'visible', group: 'more', widthClass: 'w-[320px]' },
  { key: 'evaluationDate', label: 'Fecha de evaluación', visibility: 'hidden', group: 'more', widthClass: 'w-[200px]' },
  { key: 'evaluationUser', label: 'Usuario de evaluación', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
  { key: 'approvalDate', label: 'Fecha de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[200px]' },
  { key: 'approvalUser', label: 'Usuario de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
];

const recordColumns: DocumentsRecordsColumn[] = [
  { key: 'codigo', label: 'Código CUBSO', visibility: 'visible', group: 'default', widthClass: 'w-[200px]' },
  { key: 'descripcion', label: 'Descripción', visibility: 'visible', group: 'default', widthClass: 'min-w-[320px]' },
  { key: 'status', label: 'Estado del registro', visibility: 'visible', group: 'default', widthClass: 'w-[180px]', kind: 'record-status' },
  { key: 'number', label: 'Número', visibility: 'visible', group: 'default', widthClass: 'w-[220px]', headerGroup: 'Documento' },
  { key: 'document', label: 'Descripción', visibility: 'visible', group: 'default', widthClass: 'w-[300px]', headerGroup: 'Documento' },
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

export const ITEMS_ESTRATEGICOS_DOCUMENTS_CONFIG: DocumentsRecordsConfig = {
  title: 'Necesidades estratégicas',
  processId: PROCESS_ID,
  defaultRequestRoute: REQUEST_ROUTE,
  createDocumentOptions: CREATE_DOCUMENT_OPTIONS,
  breadcrumbs: buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE),
  documentRows: [],
  // Bandeja sin solicitudes (Figma A.1-RC-009).
  emptyState: {
    title: 'Solicitudes de necesidades estratégicas',
    listTitle: 'Bandeja de solicitudes',
    heading: 'Sin solicitudes registradas',
    description: 'Aún no hay solicitudes registradas. Presione «Crear documento» para iniciar una.',
    readonlyDescription: 'Aún no hay solicitudes registradas.',
  },
  recordRows: [],
  documentColumns,
  recordColumns,
  documentTableMinWidthClass: 'min-w-[2200px]',
  recordTableMinWidthClass: 'min-w-[1100px]',
  recordTrackKey: 'recordId',
  recordHistoryDocumentLabel: NOMBRE_DOCUMENTO,
  // «Historial del registro» propio (Figma A.1-RC-050).
  recordHistoryKind: 'personalizado',
  recordSelection: true,
  statusFilterOptions: [ESTADO.ELABORADO, ESTADO.VERIFICADO, ESTADO.VALIDADO, ESTADO.OBSERVADO, ESTADO.APROBADO, ESTADO.RECHAZADO],
  actionTypeFilterOptions: [ETIQUETA_TIPO_ACCION],
  filterCampoOptions,
  filterValorOptions,
  recordFilter1Label: 'Estado del registro',
  recordFilter1Key: 'status',
  recordFilter1Default: 'Activo',
  recordFilter1Options: ['Activo', 'Inactivo'],
  recordFilterCampoOptions: [
    { label: 'Estado del registro', value: 'status' },
    { label: 'Código CUBSO', value: 'codigo' },
    { label: 'Descripción', value: 'descripcion' },
  ],
  recordFilterValorOptions: [
    { label: 'Activo', value: 'Activo' },
    { label: 'Inactivo', value: 'Inactivo' },
  ],
};

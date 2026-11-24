import { ESTADO } from '../../../../core/models/documento.model';
import type {
  DocumentsRecordsColumn,
  DocumentsRecordsConfig,
  DocumentsRecordsFilterOption,
} from '../../../../shared/types/documents-records.types';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { ANIOS_CMN, ETIQUETA_MODIFICACION, ETIQUETA_TIPO_ACCION, FASES_CMN, NOMBRE_DOCUMENTO, nombreRegistroFase } from '../models/anexo-2-fase-1.model';
import { CREATE_DOCUMENT_OPTIONS, NOMBRE_PROCESO, PROCESS_ID, PROCESS_ROUTE, REQUEST_ROUTE } from './anexo-2-fase-1.rutas';

/**
 * Configuración de «Documentos y registros» de CMN Programación (Figma «A.2-OA-EV-009»). La pantalla completa la pinta
 * `siaf-documents-records-page`: aquí solo se dice qué columnas, filtros y opciones tiene.
 */

const documentColumns: DocumentsRecordsColumn[] = [
  { key: 'document', label: 'Documento', visibility: 'visible', group: 'default', widthClass: 'w-[372px]', kind: 'document-link' },
  { key: 'number', label: 'Número', visibility: 'visible', group: 'default', widthClass: 'w-[80px]' },
  { key: 'actionType', label: 'Tipo de acción', visibility: 'visible', group: 'default', widthClass: 'w-[130px]' },
  { key: 'status', label: 'Estado', visibility: 'visible', group: 'default', widthClass: 'w-[110px]', kind: 'flow-status' },
  { key: 'system', label: 'Sistema', visibility: 'visible', group: 'default', widthClass: 'w-[160px]' },
  { key: 'date', label: 'Fecha de registro', visibility: 'visible', group: 'default', widthClass: 'w-[140px]' },
  { key: 'entity', label: 'Entidad', visibility: 'visible', group: 'default', widthClass: 'w-[125px]' },
  { key: 'creator', label: 'Creador', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
  { key: 'requesterArea', label: 'Área solicitante', visibility: 'hidden', group: 'more', widthClass: 'w-[240px]' },
  { key: 'evaluationDate', label: 'Fecha de evaluación', visibility: 'hidden', group: 'more', widthClass: 'w-[200px]' },
  { key: 'evaluationUser', label: 'Usuario de evaluación', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
  { key: 'approvalDate', label: 'Fecha de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[200px]' },
  { key: 'approvalUser', label: 'Usuario de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[220px]' },
];

const recordColumns: DocumentsRecordsColumn[] = [
  { key: 'numeroRegistro', label: 'N° registro', visibility: 'visible', group: 'default', widthClass: 'w-[95px]' },
  { key: 'registro', label: 'Registro', visibility: 'visible', group: 'default', widthClass: 'w-[270px]' },
  { key: 'necesidades', label: 'Necesidades', visibility: 'visible', group: 'default', widthClass: 'w-[150px]' },
  ...ANIOS_CMN.map((anio): DocumentsRecordsColumn => ({
    key: `programado${anio}`, label: `Programado ${anio}`, visibility: 'visible', group: 'default', widthClass: 'w-[164px]', kind: 'budget',
  })),
  { key: 'estado', label: 'Estado', visibility: 'visible', group: 'default', widthClass: 'w-[125px]', kind: 'record-status' },
  { key: 'areas', label: 'Áreas usuarias', visibility: 'hidden', group: 'more', widthClass: 'w-[130px]' },
  { key: 'fechaRegistro', label: 'Fecha de aprobación', visibility: 'hidden', group: 'more', widthClass: 'w-[170px]' },
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
  { label: ETIQUETA_MODIFICACION, value: ETIQUETA_MODIFICACION },
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
  documentTableMinWidthClass: 'min-w-[1080px] table-fixed',
  recordTableMinWidthClass: 'min-w-[1200px] table-fixed',
  recordTrackKey: 'recordId',
  recordHistoryDocumentLabel: NOMBRE_DOCUMENTO,
  // El historial de un registro son sus versiones aprobadas (la creación y las modificaciones): panel del módulo.
  recordHistoryKind: 'personalizado',
  statusFilterOptions: [ESTADO.ELABORADO, ESTADO.VERIFICADO, ESTADO.VALIDADO, ESTADO.OBSERVADO, ESTADO.APROBADO, ESTADO.RECHAZADO],
  actionTypeFilterOptions: [ETIQUETA_TIPO_ACCION, ETIQUETA_MODIFICACION],
  filterCampoOptions,
  filterValorOptions,
  recordFilter1Label: 'Fase',
  recordFilter1Key: 'fase',
  recordFilter1Options: ([1, 2, 3] as const).map((fase) => FASES_CMN[fase].etiqueta),
  recordFilterCampoOptions: [
    { label: 'N° de registro', value: 'numeroRegistro' },
    { label: 'Registro', value: 'registro' },
  ],
  recordFilterValorOptions: ([1, 2, 3] as const).map((fase) => ({ label: nombreRegistroFase(fase), value: nombreRegistroFase(fase) })),
};

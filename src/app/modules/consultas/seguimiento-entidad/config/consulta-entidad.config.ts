import type { QueryReportColumn, QueryReportConfig, QueryReportParameterField } from '../../../../shared/types/query-report.types';
import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { GENERICAS_ENTIDAD } from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import { NOMBRES_FASE } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import type { CampoCondicion } from '../../favoritos/favorito-reporte.model';
import { ESTADOS_ANEXO, OPCIONES_ANEXO, TONOS_ESTADO } from '../../graficos/estados-anexo';
import { etiquetaAnioEntidad } from '../utils/consulta-entidad.util';
import { SEGUIMIENTO_ENTIDAD_CONSULTA_PROCESS_ID, SEGUIMIENTO_ENTIDAD_CONSULTA_ROUTE } from './consulta-entidad.rutas';

export interface OpcionesAreas {
  areas: TextFieldOption[];
  ates: TextFieldOption[];
}

export const parametrosEntidad = ({ areas, ates }: OpcionesAreas): QueryReportParameterField[] => [
  {
    key: 'periodo',
    label: 'Periodo de programación',
    appliedLabel: 'Periodo',
    type: 'select',
    icon: 'calendar_today',
    required: true,
    options: [{ label: '2026 (programa 2027 - 2029)', value: '2026' }],
  },
  { key: 'anexo', label: 'Anexo', type: 'select', icon: 'description', required: true, options: OPCIONES_ANEXO },
  { key: 'fase', label: 'Fase', type: 'select', icon: 'timeline', required: true, options: NOMBRES_FASE.map((n, i) => ({ label: `Fase ${i + 1}: ${n}`, value: String(i + 1) })) },
  { key: 'area', label: 'Área usuaria', type: 'select', icon: 'apartment', options: areas },
  { key: 'ate', label: 'ATE', appliedLabel: 'ATE / Genérica', appliedWith: 'generica', type: 'select', icon: 'category', options: ates },
  {
    key: 'generica',
    label: 'Genérica',
    type: 'select',
    icon: 'category',
    hideApplied: true,
    options: [{ label: 'Todas', value: '' }, ...GENERICAS_ENTIDAD.map((g) => ({ label: g.nombre, value: g.codigo }))],
  },
  { key: 'anio', label: 'Año programado', type: 'select', icon: 'event', emptyLabel: etiquetaAnioEntidad(0), options: [0, 1, 2].map((k) => ({ label: etiquetaAnioEntidad(k), value: String(k) })) },
  { key: 'estado', label: 'Estado del anexo', type: 'select', icon: 'fact_check', hideWhenEmpty: true, emptyLabel: 'Todos', options: [{ label: 'Todos', value: '' }, ...ESTADOS_ANEXO.map((e) => ({ label: e, value: e }))] },
];

const COLUMNAS: QueryReportColumn[] = [
  { key: 'area', label: 'Área usuaria', width: 320 },
  { key: 'ate', label: 'ATE', width: 80 },
  { key: 'estado', label: 'Estado del Anexo N° 01', width: 200, kind: 'status', tones: TONOS_ESTADO },
  { key: 'revision', label: 'Revisión OA', width: 190 },
  { key: 'necesidades', label: 'Necesidades', width: 130, align: 'right' },
  { key: 'monto', label: 'Monto a su cargo (S/)', width: 190, align: 'right' },
  { key: 'uso', label: 'Uso de su techo', width: 150, align: 'right' },
];

const REVISIONES = ['Pendiente', 'Conforme', 'No conforme · v1', 'No conforme · v2', 'Ampliación pendiente', 'Ampliación aceptada', 'Ampliación rechazada', '–'];
const opciones = (valores: readonly string[]) => valores.map((v) => ({ label: v, value: v }));

/** Campos de «Filtros avanzados». */
export const CAMPOS_ENTIDAD: CampoCondicion[] = [
  { key: 'area', label: 'Área usuaria' },
  { key: 'ate', label: 'ATE', options: ['ATE', '–'] },
  { key: 'estado', label: 'Estado del Anexo N° 01', options: ESTADOS_ANEXO },
  { key: 'revision', label: 'Revisión OA', options: REVISIONES },
  { key: 'necesidades', label: 'Necesidades' },
  { key: 'monto', label: 'Monto a su cargo (S/)' },
  { key: 'uso', label: 'Uso de su techo' },
];

/** Migas del reporte: las del menú y, al final, el nombre del reporte según el Figma. */
const MIGAS = buildProcessBreadcrumbs(SEGUIMIENTO_ENTIDAD_CONSULTA_PROCESS_ID, SEGUIMIENTO_ENTIDAD_CONSULTA_ROUTE).map((miga, i, todas) =>
  i === todas.length - 1 ? { ...miga, label: 'Seguimiento de la programación del CMN' } : miga,
);

/** Configuración del reporte de la Entidad (Figma «C.2 Reporte Entidad») con `siaf-query-report-page`. */
export const configEntidad = (areas: OpcionesAreas): QueryReportConfig => ({
  title: 'Seguimiento de la programación del CMN',
  breadcrumbs: MIGAS,
  parameterFields: parametrosEntidad(areas),
  emptyParameterLabel: 'Todas',
  columns: COLUMNAS,
  rowKey: 'codigo',
  tableLabel: 'Avance por Área usuaria',
  customCharts: true,
  sortable: true,
  selectable: true,
  searchPlaceholder: 'Buscar por código o nombre de Área usuaria',
  emptyDescription: 'Ingrese los parámetros de consulta (periodo y fase) para visualizar el avance de la programación del CMN de la Entidad.',
  presetFilters: [
    { key: 'area', label: 'Área usuaria', options: opciones(areas.areas.slice(1).map((a) => a.label)) },
    { key: 'ate', label: 'ATE', options: [{ label: 'Solo ATE', value: 'ATE' }, { label: 'No es ATE', value: '–' }] },
    { key: 'estado', label: 'Estado del Anexo N° 01', options: opciones(ESTADOS_ANEXO) },
    { key: 'revision', label: 'Revisión OA', options: opciones(REVISIONES.slice(0, -1)) },
  ],
});

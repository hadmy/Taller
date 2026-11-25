import type { QueryReportColumn, QueryReportConfig, QueryReportParameterField, QueryReportParameters } from '../../../../shared/types/query-report.types';
import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { DEPARTAMENTOS, NIVELES_GOBIERNO, NOMBRES_FASE, PERIODOS_SEGUIMIENTO } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import type { CampoCondicion } from '../../favoritos/favorito-reporte.model';
import { ESTADOS_ANEXO, OPCIONES_ANEXO, TONOS_ESTADO } from '../../graficos/estados-anexo';
import { ESTADOS_AMPLIACION_REPORTE, SIN_AMPLIACION } from '../utils/seguimiento-dplaip.util';
import { SEGUIMIENTO_DPLAIP_PROCESS_ID, SEGUIMIENTO_DPLAIP_ROUTE } from './seguimiento-dplaip.rutas';

/** Clasificador Institucional: áreas de cada subgrupo de cada nivel de gobierno. */
const CLASIFICADOR: Record<string, Record<string, readonly string[]>> = {
  'Gobierno Nacional': {
    'Entidades públicas presupuestarias': ['Poder Legislativo', 'Poder Ejecutivo', 'Poder Judicial', 'Otras'],
    'Entidades públicas descentralizadas': ['Organismos descentralizados', 'Universidades públicas'],
    'Entidades públicas de seguridad social': ['Seguridad social'],
  },
  'Gobierno Regional': { 'Gobiernos regionales': ['Gobiernos regionales'] },
  'Gobierno Local': { Municipalidades: ['Municipalidades provinciales', 'Municipalidades distritales'] },
};

const conTodos = (valores: readonly string[]): TextFieldOption[] => [{ label: 'Todos', value: '' }, ...valores.map((v) => ({ label: v, value: v }))];

const subgrupos = (p: QueryReportParameters): Record<string, readonly string[]>[] =>
  p['nivel'] ? [CLASIFICADOR[String(p['nivel'])] ?? {}] : Object.values(CLASIFICADOR);

export const PARAMETROS_DPLAIP: QueryReportParameterField[] = [
  {
    key: 'periodo',
    label: 'Periodo de programación',
    appliedLabel: 'Periodo',
    type: 'select',
    icon: 'calendar_today',
    required: true,
    options: PERIODOS_SEGUIMIENTO.map((p) => ({ label: p.etiqueta, value: p.valor })),
  },
  { key: 'anexo', label: 'Anexo', type: 'select', icon: 'description', required: true, options: OPCIONES_ANEXO },
  {
    key: 'fase',
    label: 'Fase',
    type: 'select',
    icon: 'timeline',
    required: true,
    options: NOMBRES_FASE.map((n, i) => ({ label: `Fase ${i + 1}: ${n}`, value: String(i + 1) })),
  },
  { key: 'nivel', label: 'Nivel de gobierno (Grupo)', appliedLabel: 'Nivel de gobierno', type: 'select', icon: 'account_balance', options: conTodos(NIVELES_GOBIERNO) },
  {
    key: 'subgrupo',
    label: 'Subgrupo',
    appliedLabel: 'Subgrupo · Área',
    appliedWith: 'area',
    type: 'select',
    icon: 'category',
    hideWhenEmpty: true,
    optionsFor: (p) => conTodos(subgrupos(p).flatMap((s) => Object.keys(s))),
  },
  {
    key: 'area',
    label: 'Área',
    type: 'select',
    icon: 'category',
    hideApplied: true,
    optionsFor: (p) => conTodos(subgrupos(p).flatMap((s) => Object.entries(s).filter(([k]) => !p['subgrupo'] || k === p['subgrupo']).flatMap(([, areas]) => areas))),
  },
  { key: 'departamento', label: 'Departamento', type: 'select', icon: 'place', options: conTodos(DEPARTAMENTOS) },
  { key: 'estado', label: 'Estado del anexo', type: 'select', icon: 'fact_check', options: conTodos(ESTADOS_ANEXO) },
];

const columnas = (anexo: string): QueryReportColumn[] => [
  { key: 'codigo', label: 'Código', width: 115 },
  { key: 'entidad', label: 'Entidad', width: 240, kind: 'link' },
  { key: 'nivel', label: 'Nivel de gobierno', width: 165 },
  { key: 'departamento', label: 'Departamento', width: 140 },
  { key: 'estado', label: `Estado del Anexo N° ${anexo}`, width: 190, kind: 'status', tones: TONOS_ESTADO },
  { key: 'anexos01', label: 'Anexos N° 01 aprobados', width: 200, align: 'right' },
  { key: 'monto', label: 'Monto Año 1 (S/)', width: 165, align: 'right' },
  { key: 'fechaFin', label: 'Fecha fin de fase', width: 190 },
  { key: 'dias', label: 'Días restantes', width: 140, align: 'right' },
];

const AMPLIACIONES = [...ESTADOS_AMPLIACION_REPORTE.map((e) => e.estado), SIN_AMPLIACION];
const opciones = (valores: readonly string[]) => valores.map((v) => ({ label: v, value: v }));

/** Campos de «Filtros avanzados». */
export const camposCondicion = (anexo: string): CampoCondicion[] => [
  { key: 'codigo', label: 'Código' },
  { key: 'entidad', label: 'Entidad' },
  { key: 'nivel', label: 'Nivel de gobierno', options: NIVELES_GOBIERNO },
  { key: 'departamento', label: 'Departamento', options: DEPARTAMENTOS },
  { key: 'estado', label: `Estado del Anexo N° ${anexo}`, options: ESTADOS_ANEXO },
  { key: 'anexos01', label: 'Anexos N° 01 aprobados' },
  { key: 'monto', label: 'Monto Año 1 (S/)' },
  { key: 'fechaFin', label: 'Fecha fin de fase' },
  { key: 'dias', label: 'Días restantes' },
  { key: 'ampliacion', label: 'Ampliación de plazo', options: AMPLIACIONES },
];

/** Migas del reporte: las del menú y, al final, el nombre del reporte según el Figma. */
export const MIGAS_DPLAIP = buildProcessBreadcrumbs(SEGUIMIENTO_DPLAIP_PROCESS_ID, SEGUIMIENTO_DPLAIP_ROUTE).map((miga, i, todas) =>
  i === todas.length - 1 ? { ...miga, label: 'Seguimiento nacional del CMN' } : miga,
);

/**
 * Configuración del reporte DPLAIP (Figma «C.1 Reporte DPLAIP», nodo 8105:43) con `siaf-query-report-page`: ocho
 * parámetros (periodo, fase y anexo obligatorios), vista gráfica propia y detalle por Entidad.
 */
export const configDplaip = (anexo: string): QueryReportConfig => ({
  title: 'Seguimiento nacional del CMN Programación',
  breadcrumbs: MIGAS_DPLAIP,
  parameterFields: PARAMETROS_DPLAIP,
  emptyParameterLabel: 'Todos',
  columns: columnas(anexo),
  selectable: true,
  rowKey: 'codigo',
  tableLabel: 'Detalle por Entidad',
  customCharts: true,
  sortable: true,
  searchPlaceholder: 'Buscar por código o nombre de Entidad',
  emptyDescription: 'Ingrese los parámetros de consulta (periodo y fase) para visualizar el avance nacional del CMN Programación.',
  presetFilters: [
    { key: 'nivel', label: 'Nivel de gobierno', options: opciones(NIVELES_GOBIERNO) },
    { key: 'departamento', label: 'Departamento', options: opciones(DEPARTAMENTOS) },
    { key: 'estado', label: `Estado del Anexo N° ${anexo}`, options: opciones(ESTADOS_ANEXO) },
    { key: 'ampliacion', label: 'Ampliación de plazo', options: opciones(AMPLIACIONES) },
  ],
});

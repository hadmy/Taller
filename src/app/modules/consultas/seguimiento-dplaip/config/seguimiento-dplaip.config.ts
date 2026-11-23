import type {
  QueryReportChartsConfig,
  QueryReportColumn,
  QueryReportConfig,
  QueryReportParameterField,
} from '../../../../shared/types/query-report.types';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import {
  DEPARTAMENTOS,
  ESTADOS_ANEXO_02,
  NIVELES_GOBIERNO,
  NOMBRES_FASE,
  PERIODOS_SEGUIMIENTO,
} from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { GRUPOS_AMPLIACION } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';
import { PESTANAS_DPLAIP, PestanaDplaip, etiquetaAnio } from '../utils/seguimiento-dplaip.util';
import { SEGUIMIENTO_DPLAIP_PROCESS_ID, SEGUIMIENTO_DPLAIP_ROUTE } from './seguimiento-dplaip.rutas';

const opciones = (valores: readonly string[]) => valores.map((v) => ({ label: v, value: v }));

const PARAMETROS: QueryReportParameterField[] = [
  {
    key: 'periodo',
    label: 'Periodo de programación',
    type: 'select',
    icon: 'calendar_today',
    required: true,
    options: PERIODOS_SEGUIMIENTO.map((p) => ({ label: p.etiqueta, value: p.valor })),
  },
  {
    key: 'fase',
    label: 'Fase',
    type: 'select',
    icon: 'timeline',
    required: true,
    options: NOMBRES_FASE.map((n, i) => ({ label: `Fase ${i + 1}: ${n}`, value: String(i + 1) })),
  },
  { key: 'niveles', label: 'Niveles de gobierno', type: 'select-multiple', icon: 'account_balance', options: opciones(NIVELES_GOBIERNO) },
  { key: 'departamentos', label: 'Departamentos', type: 'select-multiple', icon: 'map', options: opciones(DEPARTAMENTOS) },
  { key: 'estados', label: 'Estados del Anexo N.º 02', type: 'select-multiple', icon: 'task_alt', options: opciones(ESTADOS_ANEXO_02) },
];

/** Columnas de las pestañas que listan Entidades. */
const COLUMNAS_ENTIDAD: QueryReportColumn[] = [
  { key: 'codigo', label: 'Código', group: 'Entidad', width: 120 },
  { key: 'entidad', label: 'Nombre', group: 'Entidad', width: 320 },
  { key: 'nivel', label: 'Nivel de gobierno', width: 170 },
  { key: 'departamento', label: 'Departamento', width: 150 },
];

/** Columnas, KPI y gráficos de cada pestaña. */
function porPestana(pestana: PestanaDplaip, periodo: string): { columns: QueryReportColumn[]; rowKey: string; charts?: QueryReportChartsConfig; tableLabel: string } {
  switch (pestana) {
    case 'estado':
      return {
        rowKey: 'codigo',
        tableLabel: 'Estado del Anexo N.º 02 por Entidad',
        columns: [
          ...COLUMNAS_ENTIDAD,
          { key: 'estado', label: 'Estado del Anexo N.º 02', width: 180 },
          { key: 'anexos01', label: 'Anexos N.º 01 aprobados', width: 170, align: 'right' },
          { key: 'monto', label: 'Monto año 1 (S/)', width: 170, align: 'right', fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Entidades que programan', icon: 'account_balance', aggregate: 'count' },
            { title: 'Anexo N.º 02 aprobado', icon: 'task_alt', tone: 'success', aggregate: 'count', where: { column: 'estado', value: 'Aprobado' } },
            { title: 'En evaluación', icon: 'pending_actions', tone: 'informative', aggregate: 'count', where: { column: 'estado', value: 'En evaluación' } },
            { title: 'Sin iniciar', icon: 'hourglass_empty', tone: 'warning', aggregate: 'count', where: { column: 'estado', value: 'Sin iniciar' } },
          ],
          charts: [
            { title: 'Entidades por nivel de gobierno', type: 'bar', groupBy: 'nivel', aggregate: 'count', seriesName: 'Entidades', categoryLabel: 'Nivel de gobierno' },
            { title: 'Estado del Anexo N.º 02', type: 'donut', groupBy: 'estado', aggregate: 'count', seriesName: 'Entidades', categoryLabel: 'Estado', width: 'narrow' },
          ],
        },
      };
    case 'avance':
      return {
        rowKey: 'id',
        tableLabel: 'Avance acumulado por día de la fase',
        columns: [
          { key: 'dia', label: 'Día', width: 120 },
          { key: 'aprobadas', label: 'Entidades con Anexo N.º 02 aprobado', width: 280, align: 'right' },
          { key: 'porcentaje', label: '% acumulado', width: 160, align: 'right', fixed: true },
        ],
        charts: {
          kpis: [],
          charts: [
            { title: '% de Entidades con Anexo N.º 02 aprobado por día', type: 'line', groupBy: 'dia', column: 'porcentaje', seriesName: '% aprobado', categoryLabel: 'Día' },
          ],
        },
      };
    case 'prelacion':
      return {
        rowKey: 'id',
        tableLabel: 'Monto programado por orden de prelación y año',
        columns: [
          { key: 'orden', label: 'Orden de prelación', width: 320 },
          { key: 'anio', label: 'Año', width: 160 },
          { key: 'monto', label: 'Monto programado (millones de S/)', width: 260, align: 'right', fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Monto total (millones de S/)', icon: 'payments', column: 'monto', decimals: 1 },
            ...[0, 1, 2].map((k) => ({
              title: `${etiquetaAnio(periodo, k)} (millones de S/)`,
              icon: 'calendar_today',
              column: 'monto',
              where: { column: 'anio', value: etiquetaAnio(periodo, k) },
              decimals: 1,
            })),
          ],
          charts: [
            { title: 'Monto por orden de prelación', type: 'bar', groupBy: 'orden', column: 'monto', seriesName: 'Monto (millones de S/)', categoryLabel: 'Orden de prelación' },
            { title: 'Monto por año', type: 'bar', groupBy: 'anio', column: 'monto', seriesName: 'Monto (millones de S/)', categoryLabel: 'Año', width: 'narrow' },
          ],
        },
      };
    case 'ampliaciones':
      return {
        rowKey: 'codigo',
        tableLabel: 'Solicitudes de ampliación de plazo de fase',
        columns: [
          ...COLUMNAS_ENTIDAD,
          { key: 'grupo', label: 'Estado', width: 150 },
          { key: 'ampliacion', label: 'Detalle del estado', width: 220, fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Solicitudes', icon: 'event_repeat', aggregate: 'count' },
            ...GRUPOS_AMPLIACION.slice(0, 3).map((g) => ({
              title: g === 'Aprobada' ? 'Aprobadas' : g === 'Observada' ? 'Observadas' : g,
              icon: g === 'Aprobada' ? 'task_alt' : g === 'Observada' ? 'report' : 'pending_actions',
              tone: (g === 'Aprobada' ? 'success' : g === 'Observada' ? 'warning' : 'informative') as 'success' | 'warning' | 'informative',
              aggregate: 'count' as const,
              where: { column: 'grupo', value: g },
            })),
          ],
          charts: [
            { title: 'Solicitudes por nivel de gobierno', type: 'bar', groupBy: 'nivel', aggregate: 'count', seriesName: 'Solicitudes', categoryLabel: 'Nivel de gobierno' },
            { title: 'Solicitudes por estado', type: 'donut', groupBy: 'grupo', aggregate: 'count', seriesName: 'Solicitudes', categoryLabel: 'Estado', width: 'narrow' },
          ],
        },
      };
    case 'departamentos':
      return {
        rowKey: 'departamento',
        tableLabel: '% de Entidades con Anexo N.º 02 aprobado por departamento',
        columns: [
          { key: 'departamento', label: 'Departamento', width: 200 },
          { key: 'entidades', label: 'Entidades', width: 140, align: 'right' },
          { key: 'aprobadas', label: 'Con Anexo N.º 02 aprobado', width: 220, align: 'right' },
          { key: 'porcentaje', label: '% aprobado', width: 140, align: 'right', fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Entidades', icon: 'account_balance', column: 'entidades', decimals: 0 },
            { title: 'Con Anexo N.º 02 aprobado', icon: 'task_alt', tone: 'success', column: 'aprobadas', decimals: 0 },
            { title: 'Departamentos', icon: 'map', aggregate: 'count' },
          ],
          charts: [
            { title: '% de Entidades con Anexo N.º 02 aprobado por departamento', type: 'bar', groupBy: 'departamento', column: 'porcentaje', seriesName: '% aprobado', categoryLabel: 'Departamento' },
          ],
        },
      };
    case 'detalle':
      return {
        rowKey: 'codigo',
        tableLabel: 'Detalle por Entidad',
        columns: [
          ...COLUMNAS_ENTIDAD,
          { key: 'estado', label: 'Estado del Anexo N.º 02', width: 180 },
          { key: 'anexos01', label: 'Anexos N.º 01 aprobados', width: 170, align: 'right' },
          { key: 'monto', label: 'Monto año 1 (S/)', width: 160, align: 'right' },
          { key: 'fechaFin', label: 'Fecha fin de fase', width: 140 },
          { key: 'ampliacion', label: 'Ampliación de plazo', width: 200, fixed: true },
        ],
      };
  }
}

/**
 * Configuración de «Seguimiento del CMN – DPLAIP» (sección Consultas y reportes) con `siaf-query-report-page`, como el
 * Figma «Consultas y reportes» (2.10.6.1.4, nodo 2435:45049): «Parámetros» con periodo, fase, niveles, departamentos y
 * estados; una pestaña por tablero del seguimiento nacional, cada una con su tabla y, salvo el detalle, su vista de
 * gráficas con los componentes del UI KIT («Graphics»). Columnas y gráficos cambian con la pestaña.
 */
export function configSeguimientoDplaip(pestana: PestanaDplaip, periodo: string): QueryReportConfig {
  return {
    title: 'Seguimiento del CMN – DPLAIP',
    breadcrumbs: buildProcessBreadcrumbs(SEGUIMIENTO_DPLAIP_PROCESS_ID, SEGUIMIENTO_DPLAIP_ROUTE),
    parameterFields: PARAMETROS,
    resultTitle: 'Resultado de reporte',
    tabs: PESTANAS_DPLAIP.map((p) => ({ id: p.id, label: p.label })),
    emptyTitle: 'Sin resultados',
    emptyDescription: 'No hay Entidades con los parámetros aplicados.',
    ...porPestana(pestana, periodo),
  };
}

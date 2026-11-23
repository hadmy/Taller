import type { QueryReportChartsConfig, QueryReportColumn, QueryReportConfig } from '../../../../shared/types/query-report.types';
import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { GENERICAS_ENTIDAD } from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import { NOMBRES_FASE } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { PESTANAS_ENTIDAD, PestanaEntidad, etiquetaAnioEntidad } from '../utils/consulta-entidad.util';
import { SEGUIMIENTO_ENTIDAD_CONSULTA_PROCESS_ID, SEGUIMIENTO_ENTIDAD_CONSULTA_ROUTE } from './consulta-entidad.rutas';

const AREA: QueryReportColumn = { key: 'area', label: 'Área usuaria', width: 300 };
const ITEM: QueryReportColumn[] = [
  { key: 'item', label: 'Código', group: 'Ítem', width: 150 },
  { key: 'descripcion', label: 'Descripción', group: 'Ítem', width: 300 },
];

function porPestana(pestana: PestanaEntidad, anio: number): { columns: QueryReportColumn[]; rowKey: string; charts?: QueryReportChartsConfig; tableLabel: string } {
  const montoAnio = `Monto ${etiquetaAnioEntidad(anio)} (S/)`;
  switch (pestana) {
    case 'anexos':
      return {
        rowKey: 'codigo',
        tableLabel: 'Anexos N.º 01 por área usuaria',
        columns: [
          { key: 'codigo', label: 'Código', group: 'Área usuaria', width: 90 },
          { key: 'area', label: 'Nombre', group: 'Área usuaria', width: 320 },
          { key: 'ate', label: 'ATE', width: 70 },
          { key: 'estado', label: 'Estado del Anexo N.º 01', width: 180 },
          { key: 'revision', label: 'Revisión OA', width: 140 },
          { key: 'necesidades', label: 'Necesidades', width: 120, align: 'right' },
          { key: 'monto', label: `Monto a su cargo ${etiquetaAnioEntidad(anio)} (S/)`, width: 230, align: 'right' },
          { key: 'uso', label: '% uso del techo', width: 140, align: 'right', fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Áreas usuarias', icon: 'apartment', aggregate: 'count' },
            { title: 'Anexo N.º 01 aprobado', icon: 'task_alt', tone: 'success', aggregate: 'count', where: { column: 'estado', value: 'Aprobado' } },
            { title: 'Observados', icon: 'report', tone: 'warning', aggregate: 'count', where: { column: 'estado', value: 'Observado' } },
            { title: 'Sin Anexo N.º 01', icon: 'hourglass_empty', tone: 'danger', aggregate: 'count', where: { column: 'estado', value: 'Sin Anexo N.º 01' } },
          ],
          charts: [
            { title: 'Áreas usuarias por estado del Anexo N.º 01', type: 'bar', groupBy: 'estado', aggregate: 'count', seriesName: 'Áreas usuarias', categoryLabel: 'Estado' },
            { title: 'Revisión de la OA', type: 'donut', groupBy: 'revision', aggregate: 'count', seriesName: 'Áreas usuarias', categoryLabel: 'Revisión', width: 'narrow' },
          ],
        },
      };
    case 'techo':
      return {
        rowKey: 'generica',
        tableLabel: 'Uso del techo presupuestario por genérica',
        columns: [
          { key: 'generica', label: 'Genérica', width: 340 },
          { key: 'programado', label: 'Programado (S/)', width: 200, align: 'right' },
          { key: 'techo', label: 'Techo de la fase (S/)', width: 200, align: 'right' },
          { key: 'uso', label: '% uso del techo', width: 150, align: 'right', fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Programado', icon: 'payments', column: 'programado', prefix: 'S/ ' },
            { title: 'Techo de la fase', icon: 'savings', column: 'techo', prefix: 'S/ ' },
          ],
          charts: [
            { title: 'Programado por genérica', type: 'bar', groupBy: 'generica', column: 'programado', seriesName: 'Programado (S/)', categoryLabel: 'Genérica' },
            { title: '% del techo usado', type: 'bar', groupBy: 'generica', column: 'uso', seriesName: '% uso del techo', categoryLabel: 'Genérica', width: 'narrow' },
          ],
        },
      };
    case 'remitidas':
      return {
        rowKey: 'id',
        tableLabel: 'Necesidades remitidas a las ATE',
        columns: [...ITEM, { ...AREA, label: 'Área que remite' }, { key: 'ate', label: 'ATE', width: 300 }, { key: 'estado', label: 'Estado', width: 130, fixed: true }],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Remitidas', icon: 'send', aggregate: 'count' },
            { title: 'Aceptadas', icon: 'task_alt', tone: 'success', aggregate: 'count', where: { column: 'estado', value: 'Aceptada' } },
            { title: 'Pendientes', icon: 'pending_actions', tone: 'warning', aggregate: 'count', where: { column: 'estado', value: 'Pendiente' } },
            { title: 'Rechazadas', icon: 'cancel', tone: 'danger', aggregate: 'count', where: { column: 'estado', value: 'Rechazada' } },
          ],
          charts: [
            { title: 'Necesidades remitidas por ATE', type: 'bar', groupBy: 'ate', aggregate: 'count', seriesName: 'Necesidades', categoryLabel: 'ATE' },
            { title: 'Por estado', type: 'donut', groupBy: 'estado', aggregate: 'count', seriesName: 'Necesidades', categoryLabel: 'Estado', width: 'narrow' },
          ],
        },
      };
    case 'prelacion':
      return {
        rowKey: 'id',
        tableLabel: 'Necesidades a cargo por orden de prelación',
        columns: [
          ...ITEM,
          { ...AREA, label: 'Área a cargo' },
          { key: 'orden', label: 'Orden de prelación', width: 250 },
          { key: 'generica', label: 'Genérica', width: 220 },
          { key: 'monto', label: montoAnio, width: 210, align: 'right', fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: `Monto ${etiquetaAnioEntidad(anio)}`, icon: 'payments', column: 'monto', prefix: 'S/ ' },
            { title: 'Necesidades a cargo', icon: 'inventory_2', aggregate: 'count' },
          ],
          charts: [
            { title: 'Monto por orden de prelación', type: 'bar', groupBy: 'orden', column: 'monto', seriesName: 'Monto (S/)', categoryLabel: 'Orden de prelación' },
            { title: 'Monto por genérica', type: 'donut', groupBy: 'generica', column: 'monto', seriesName: 'Monto (S/)', categoryLabel: 'Genérica', width: 'narrow' },
          ],
        },
      };
    case 'pendientes':
      return {
        rowKey: 'pendiente',
        tableLabel: 'Pendientes de la Oficina de Abastecimiento',
        columns: [
          { key: 'pendiente', label: 'Pendiente', width: 340 },
          { key: 'cantidad', label: 'Cantidad', width: 120, align: 'right' },
          { key: 'plazo', label: 'Plazo', width: 260 },
          { key: 'urgente', label: 'Urgente', width: 110, fixed: true },
        ],
        charts: {
          interactive: true,
          kpis: [
            { title: 'Pendientes', icon: 'pending_actions', column: 'cantidad', decimals: 0 },
            { title: 'Urgentes', icon: 'priority_high', tone: 'danger', column: 'cantidad', decimals: 0, where: { column: 'urgente', value: 'Sí' } },
          ],
          charts: [{ title: 'Pendientes de la Oficina de Abastecimiento', type: 'bar', groupBy: 'pendiente', column: 'cantidad', seriesName: 'Pendientes', categoryLabel: 'Pendiente' }],
        },
      };
    case 'necesidades':
      return {
        rowKey: 'id',
        tableLabel: 'Necesidades programadas',
        columns: [
          AREA,
          ...ITEM,
          { key: 'unidad', label: 'Unidad', width: 110 },
          { key: 'tipo', label: 'Tipo', width: 100 },
          { key: 'generica', label: 'Genérica', width: 220 },
          { key: 'orden', label: 'Orden de prelación', width: 250 },
          { key: 'ate', label: 'ATE', width: 280 },
          { key: 'anio1', label: etiquetaAnioEntidad(0), group: 'Monto (S/)', width: 150, align: 'right' },
          { key: 'anio2', label: etiquetaAnioEntidad(1), group: 'Monto (S/)', width: 150, align: 'right' },
          { key: 'anio3', label: etiquetaAnioEntidad(2), group: 'Monto (S/)', width: 150, align: 'right', fixed: true },
        ],
      };
  }
}

/**
 * Configuración de «Seguimiento del CMN – Entidad» (sección Consultas y reportes) con `siaf-query-report-page`, como el
 * Figma «Consultas y reportes» (2435:45049): la vista de la Oficina de Abastecimiento del resumen de la Entidad, con
 * «Parámetros» (fase, año, áreas usuarias, ATE y genéricas) y una pestaña por tablero, cada una con su tabla y, salvo
 * la de necesidades, su vista de gráficas del UI KIT. Las áreas y ATE llegan con los datos.
 */
export function configConsultaEntidad(pestana: PestanaEntidad, anio: number, areas: TextFieldOption[], ates: TextFieldOption[]): QueryReportConfig {
  return {
    title: 'Seguimiento del CMN – Entidad',
    breadcrumbs: buildProcessBreadcrumbs(SEGUIMIENTO_ENTIDAD_CONSULTA_PROCESS_ID, SEGUIMIENTO_ENTIDAD_CONSULTA_ROUTE),
    parameterFields: [
      { key: 'fase', label: 'Fase', type: 'select', icon: 'timeline', required: true, options: NOMBRES_FASE.map((n, i) => ({ label: `Fase ${i + 1}: ${n}`, value: String(i + 1) })) },
      { key: 'anio', label: 'Año programado', type: 'select', icon: 'calendar_today', required: true, options: [0, 1, 2].map((k) => ({ label: etiquetaAnioEntidad(k), value: String(k) })) },
      { key: 'areas', label: 'Áreas usuarias', type: 'select-multiple', icon: 'apartment', options: areas },
      { key: 'ates', label: 'ATE', type: 'select-multiple', icon: 'hub', options: ates },
      { key: 'genericas', label: 'Genéricas', type: 'select-multiple', icon: 'category', options: GENERICAS_ENTIDAD.map((g) => ({ label: g.nombre, value: g.codigo })) },
    ],
    resultTitle: 'Resultado de reporte',
    tabs: PESTANAS_ENTIDAD.map((p) => ({ id: p.id, label: p.label })),
    emptyTitle: 'Sin resultados',
    emptyDescription: 'No hay datos con los parámetros aplicados.',
    ...porPestana(pestana, anio),
  };
}

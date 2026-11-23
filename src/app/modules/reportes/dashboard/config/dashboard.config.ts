import { ANIOS_CMN } from '../../../abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import type { QueryReportConfig } from '../../../../shared/types/query-report.types';
import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { GENERICA_ACTIVOS_NO_FINANCIEROS } from '../models/dashboard-cmn.model';
import { DASHBOARD_REPORTES_PROCESS_ID, DASHBOARD_REPORTES_ROUTE } from './dashboard.rutas';

const ANIOS = ANIOS_CMN.map(String);

/**
 * Configuración del «Dashboard» del CMN con `siaf-query-report-page` (Figma 22402:16766): el monto programado en el
 * Anexo 01 de las áreas usuarias, en total y por bienes, servicios y activos no financieros, y dos gráficos de barras
 * (por área usuaria y por año del CMN). Es interactivo: el clic en una barra filtra todo por esa área o ese año.
 * Las áreas del parámetro llegan con los datos: la pantalla las pasa en `opcionesArea`.
 */
export function configDashboard(opcionesArea: TextFieldOption[]): QueryReportConfig {
  return {
    title: 'Dashboard del Cuadro Multianual de Necesidades',
    breadcrumbs: buildProcessBreadcrumbs(DASHBOARD_REPORTES_PROCESS_ID, DASHBOARD_REPORTES_ROUTE),
    parameterFields: [
      { key: 'anios', label: 'Años del CMN', type: 'select-multiple', icon: 'calendar_today', options: ANIOS.map((a) => ({ label: a, value: a })) },
      { key: 'areas', label: 'Áreas usuarias', type: 'select-multiple', icon: 'apartment', options: opcionesArea },
      {
        key: 'tipo',
        label: 'Tipo de ítem',
        type: 'select',
        icon: 'category',
        options: [
          { label: 'Bien', value: 'Bien' },
          { label: 'Servicio', value: 'Servicio' },
        ],
      },
    ],
    columns: [
      { key: 'anio', label: 'Año', group: 'CMN', width: 90 },
      { key: 'areaSigla', label: 'Sigla', group: 'Área usuaria', width: 100 },
      { key: 'area', label: 'Denominación', group: 'Área usuaria', width: 300 },
      { key: 'item', label: 'Código', group: 'Ítem', width: 170 },
      { key: 'descripcion', label: 'Descripción', group: 'Ítem', width: 300 },
      { key: 'tipo', label: 'Tipo', width: 110 },
      { key: 'generica', label: 'Genérica', width: 300 },
      { key: 'monto', label: 'Monto programado (S/)', width: 190, align: 'right', fixed: true },
    ],
    rowKey: 'id',
    resultTitle: 'Programación del CMN',
    presetFilters: [
      {
        key: 'tipo',
        label: 'Tipo',
        options: [
          { label: 'Bien', value: 'Bien' },
          { label: 'Servicio', value: 'Servicio' },
        ],
      },
      { key: 'anio', label: 'Año', options: ANIOS.map((a) => ({ label: a, value: a })) },
    ],
    charts: {
      interactive: true,
      kpis: [
        { title: 'Monto programado total', icon: 'arrow_outward', tone: 'informative', column: 'monto', prefix: 'S/ ' },
        { title: 'Bienes', icon: 'arrow_outward', tone: 'informative', column: 'monto', where: { column: 'tipo', value: 'Bien' }, prefix: 'S/ ' },
        { title: 'Servicios', icon: 'arrow_outward', tone: 'informative', column: 'monto', where: { column: 'tipo', value: 'Servicio' }, prefix: 'S/ ' },
        {
          title: 'Activos no financieros',
          icon: 'arrow_outward',
          tone: 'informative',
          column: 'monto',
          where: { column: 'generica', value: GENERICA_ACTIVOS_NO_FINANCIEROS },
          prefix: 'S/ ',
        },
      ],
      charts: [
        {
          title: 'Monto programado por área usuaria',
          description: 'Anexo 01 de cada área, en los años elegidos',
          type: 'bar',
          groupBy: 'areaSigla',
          column: 'monto',
          seriesName: 'Monto programado',
          categoryLabel: 'Área usuaria',
        },
        {
          title: 'Monto por año del CMN',
          description: 'Programación de cada año',
          type: 'bar',
          groupBy: 'anio',
          column: 'monto',
          seriesName: 'Monto programado',
          categoryLabel: 'Año',
          width: 'narrow',
        },
      ],
    },
    tableLabel: 'Ítems programados del CMN',
    emptyTitle: 'Sin programación para el dashboard',
  };
}

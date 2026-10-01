import { Routes } from '@angular/router';

import { AREAS_USUARIAS_ROUTE } from './areas-usuarias/config/areas-usuarias.rutas';
import {
  DISTRIBUCION_INTERNA_PRESUPUESTO_FORM_ROUTE,
  DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE,
} from './distribucion-interna-presupuesto/config/distribucion-interna-presupuesto.rutas';
import { FECHAS_FASE_CMN_DPLAIP_FORM_ROUTE, FECHAS_FASE_CMN_DPLAIP_ROUTE } from './fechas-fase-cmn-dplaip/config/fechas-fase-cmn-dplaip.rutas';
import { FECHAS_FASE_CMN_ENTIDAD_FORM_ROUTE, FECHAS_FASE_CMN_ENTIDAD_ROUTE } from './fechas-fase-cmn-entidad/config/fechas-fase-cmn-entidad.rutas';
import { PRECIOS_DIFERENCIADOS_ROUTE } from './precios-diferenciados/config/precios-diferenciados.rutas';

/** Módulo de pantallas de configuración transversales (no siguen el ciclo de una solicitud). */
export const CONFIGURACION_ROUTES: Routes = [
  {
    path: AREAS_USUARIAS_ROUTE.slice(1),
    loadComponent: () =>
      import('./areas-usuarias/pages/areas-usuarias-configuracion.component').then(
        (m) => m.AreasUsuariasConfiguracionComponent,
      ),
  },
  {
    path: `${AREAS_USUARIAS_ROUTE.slice(1)}/:areaId`,
    loadComponent: () =>
      import('./areas-usuarias/pages/area-usuaria-detalle.component').then(
        (m) => m.AreaUsuariaDetalleComponent,
      ),
  },
  {
    path: FECHAS_FASE_CMN_ENTIDAD_ROUTE.slice(1),
    loadComponent: () =>
      import('./fechas-fase-cmn-entidad/pages/fechas-fase-cmn-entidad.component').then(
        (m) => m.FechasFaseCmnEntidadComponent,
      ),
  },
  {
    path: FECHAS_FASE_CMN_ENTIDAD_FORM_ROUTE.slice(1),
    loadComponent: () =>
      import('./fechas-fase-cmn-entidad/pages/fecha-fase-cmn-entidad-form.component').then(
        (m) => m.FechaFaseCmnEntidadFormComponent,
      ),
  },
  {
    path: FECHAS_FASE_CMN_DPLAIP_ROUTE.slice(1),
    loadComponent: () =>
      import('./fechas-fase-cmn-dplaip/pages/fechas-fase-cmn-dplaip.component').then(
        (m) => m.FechasFaseCmnDplaipComponent,
      ),
  },
  {
    path: FECHAS_FASE_CMN_DPLAIP_FORM_ROUTE.slice(1),
    loadComponent: () =>
      import('./fechas-fase-cmn-dplaip/pages/fecha-fase-cmn-dplaip-form.component').then(
        (m) => m.FechaFaseCmnDplaipFormComponent,
      ),
  },
  {
    path: DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE.slice(1),
    loadComponent: () =>
      import('./distribucion-interna-presupuesto/pages/distribucion-interna-presupuesto.component').then(
        (m) => m.DistribucionInternaPresupuestoComponent,
      ),
  },
  {
    path: DISTRIBUCION_INTERNA_PRESUPUESTO_FORM_ROUTE.slice(1),
    loadComponent: () =>
      import('./distribucion-interna-presupuesto/pages/distribucion-interna-presupuesto-form.component').then(
        (m) => m.DistribucionInternaPresupuestoFormComponent,
      ),
  },
  {
    path: PRECIOS_DIFERENCIADOS_ROUTE.slice(1),
    loadComponent: () =>
      import('./precios-diferenciados/pages/precios-diferenciados.component').then(
        (m) => m.PreciosDiferenciadosComponent,
      ),
  },
];

import { Routes } from '@angular/router';

import { DASHBOARD_REPORTES_ROUTE } from './dashboard/config/dashboard.rutas';
import { SEGUIMIENTO_NACIONAL_ROUTE } from './seguimiento-nacional/config/seguimiento-nacional.rutas';

/** Sección Reportes: tableros y consultas de solo lectura. */
export const REPORTES_ROUTES: Routes = [
  {
    path: DASHBOARD_REPORTES_ROUTE.slice(1),
    loadComponent: () => import('./dashboard/pages/dashboard.component').then((m) => m.DashboardReportesComponent),
  },
  {
    path: SEGUIMIENTO_NACIONAL_ROUTE.slice(1),
    loadComponent: () =>
      import('./seguimiento-nacional/pages/seguimiento-nacional.component').then((m) => m.SeguimientoNacionalComponent),
  },
];

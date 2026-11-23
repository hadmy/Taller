import { Routes } from '@angular/router';

import { SEGUIMIENTO_DPLAIP_ROUTE } from './seguimiento-dplaip/config/seguimiento-dplaip.rutas';
import { SEGUIMIENTO_ENTIDAD_CONSULTA_ROUTE } from './seguimiento-entidad/config/consulta-entidad.rutas';

/** Sección «Consultas y reportes»: pantallas de consulta con parámetros, tabla y gráficos. */
export const CONSULTAS_ROUTES: Routes = [
  {
    path: SEGUIMIENTO_DPLAIP_ROUTE.slice(1),
    loadComponent: () =>
      import('./seguimiento-dplaip/pages/seguimiento-dplaip.component').then((m) => m.SeguimientoDplaipComponent),
  },
  {
    path: SEGUIMIENTO_ENTIDAD_CONSULTA_ROUTE.slice(1),
    loadComponent: () =>
      import('./seguimiento-entidad/pages/consulta-entidad.component').then((m) => m.ConsultaEntidadComponent),
  },
];

import { Routes } from '@angular/router';

import {
  ANEXO_1_SEGMENT,
  CONSOLIDADO_SEGMENT,
  PROCESS_ROUTE as CMN_PROGRAMACION_ROUTE,
  REQUEST_ROUTE as ANEXO_2_REQUEST_ROUTE,
} from './anexo-2-fase-1/config/anexo-2-fase-1.rutas';
import { PROCESS_ROUTE, REQUEST_ROUTE } from './items-estrategicos/config/items-estrategicos.rutas';

/**
 * Gestión de abastecimiento · CMN: Solicitud de Necesidades Estratégicas (Documentos y registros y la solicitud) y
 * CMN Programación (Documentos y registros y la Solicitud del Anexo N.º 02, Fase 1).
 */
export const ABASTECIMIENTO_ROUTES: Routes = [
  {
    path: PROCESS_ROUTE.slice(1),
    loadComponent: () =>
      import('./items-estrategicos/pages/documents/items-estrategicos-documents.component').then(
        (m) => m.ItemsEstrategicosDocumentsComponent,
      ),
  },
  {
    path: REQUEST_ROUTE.slice(1),
    loadComponent: () =>
      import('./items-estrategicos/pages/solicitud/item-estrategico-request.component').then(
        (m) => m.ItemEstrategicoRequestComponent,
      ),
  },
  {
    path: `${REQUEST_ROUTE.slice(1)}/:id`,
    loadComponent: () =>
      import('./items-estrategicos/pages/solicitud/item-estrategico-request.component').then(
        (m) => m.ItemEstrategicoRequestComponent,
      ),
  },
  {
    path: CMN_PROGRAMACION_ROUTE.slice(1),
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/documents/cmn-programacion-documents.component').then((m) => m.CmnProgramacionDocumentsComponent),
  },
  {
    path: ANEXO_2_REQUEST_ROUTE.slice(1),
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/solicitud/anexo-2-fase-1-request.component').then((m) => m.Anexo2Fase1RequestComponent),
  },
  {
    path: `${ANEXO_2_REQUEST_ROUTE.slice(1)}/:id`,
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/solicitud/anexo-2-fase-1-request.component').then((m) => m.Anexo2Fase1RequestComponent),
  },
  {
    path: `${ANEXO_2_REQUEST_ROUTE.slice(1)}/:id/${ANEXO_1_SEGMENT}/:areaId`,
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/detalle-anexo-1/detalle-anexo-1.component').then((m) => m.DetalleAnexo1Component),
  },
  {
    path: `${ANEXO_2_REQUEST_ROUTE.slice(1)}/:id/${CONSOLIDADO_SEGMENT}`,
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/consolidado-anexo-2/consolidado-anexo-2.component').then((m) => m.ConsolidadoAnexo2Component),
  },
];

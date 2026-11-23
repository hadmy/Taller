import { Routes } from '@angular/router';

import {
  ESCRITORIO_ROUTE as CMN_ESCRITORIO_ROUTE,
  PROCESS_ROUTE as CMN_PROGRAMACION_ROUTE,
  REQUEST_ROUTE as ANEXO_2_REQUEST_ROUTE,
  REQUEST_ROUTE_POR_FASE as ANEXO_2_REQUEST_ROUTE_POR_FASE,
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
    path: CMN_ESCRITORIO_ROUTE.slice(1),
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/escritorio/cmn-escritorio.component').then((m) => m.CmnEscritorioComponent),
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
  // Fases 2 y 3 del CMN: la misma solicitud del Anexo N.º 02, creada con su fase.
  ...([2, 3] as const).map((fase) => ({
    path: ANEXO_2_REQUEST_ROUTE_POR_FASE[fase].slice(1),
    data: { fase },
    loadComponent: () =>
      import('./anexo-2-fase-1/pages/solicitud/anexo-2-fase-1-request.component').then((m) => m.Anexo2Fase1RequestComponent),
  })),
];

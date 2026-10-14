import { Routes } from '@angular/router';

import { PROCESS_ROUTE, REQUEST_ROUTE } from './items-estrategicos/config/items-estrategicos.rutas';

/** Gestión de abastecimiento · CMN: Solicitud de Ítems Estratégicos (Documentos y registros y la solicitud). */
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
];

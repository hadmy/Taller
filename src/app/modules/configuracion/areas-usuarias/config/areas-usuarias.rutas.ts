import type { BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';

/** Ruta e id del proceso. El id existe en `DEFAULT_PROCESS_TREE` (shared/utils/process-tree.util.ts). */
export const AREAS_USUARIAS_ROUTE = '/procesos/cuadro-multianual-necesidades/configuracion/fechas-fase-area-usuaria';

/** Hoja del árbol de procesos: arma las migas de pan. */
export const AREAS_USUARIAS_PROCESS_ID = 'cuadro-multianual-necesidades-configuracion-areas-usuarias';

/** Título de las pantallas de configuración y última miga de pan (Figma «A.1-RC-006»). */
export const TITULO_CONFIGURACION = 'Configuración del Cuadro Multianual de Necesidades';

/** Migas de las tres pantallas de Áreas usuarias, como el prototipo: no repiten los grupos del menú. */
export const AREAS_USUARIAS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Inicio', href: '/panel' },
  { label: 'Cuadro Multianual de Necesidades', href: '/panel' },
  { label: TITULO_CONFIGURACION },
];

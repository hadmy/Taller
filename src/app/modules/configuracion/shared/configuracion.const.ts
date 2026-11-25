import type { BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';

/** Título de las pantallas de configuración y última miga de pan (Figma «A.1-RC-006»). */
export const TITULO_CONFIGURACION = 'Configuración del Cuadro Multianual de Necesidades';

/** Migas de todas las pantallas de configuración: se entra por «Configuraciones» y se cambia de una a otra por pestañas. */
export const CONFIGURACION_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Inicio', href: '/panel' },
  { label: 'Cuadro Multianual de Necesidades', href: '/panel' },
  { label: TITULO_CONFIGURACION },
];

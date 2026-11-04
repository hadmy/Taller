/**
 * Árbol maestro de procesos + utilidad de búsqueda de ruta.
 * Vive en shared/utils/ (no en layout/) porque lo consumen tanto piezas
 * del shell (layout/process-menu-tree, layout/create-document) como
 * utilidades transversales de shared (breadcrumbs.util) — shared no debe
 * depender de layout, así que la fuente de verdad va acá.
 */
export interface ProcessMenuNode {
  id: string;
  label: string;
  selected?: boolean;
  // Solo debe marcarse en nodos raiz: la vista inicial muestra hasta el segundo nivel.
  expanded?: boolean;
  // Ruta de la página principal del módulo (documentos y registros)
  moduleRoute?: string;
  // Si un nodo tiene estas propiedades, Crear documento puede completar documento/tipo y navegar.
  createRoute?: string;
  documentOptions?: string[];
  documentCreateOptions?: Array<{
    label: string;
    route?: string;
    actionTypes?: string[];
  }>;
  actionTypeOptions?: string[];
  /**
   * Marca un nodo como módulo planificado pero aún no implementado.
   * El menú lo renderiza con texto atenuado y badge "Próximamente",
   * y el click no navega (solo expande si tiene hijos).
   */
  comingSoon?: boolean;
  children?: ProcessMenuNode[];
}

/**
 * Árbol de procesos del taller, tomado del Figma del CMN («A.2-OA-EV-006/007 Procesos»). Lo que no está implementado
 * va como «Próximamente». Para sumar un proceso real: una hoja con `moduleRoute` (Documentos y registros) y otra para
 * sus consultas, y sus rutas en `app.routes.ts`.
 */
export const DEFAULT_PROCESS_TREE: ProcessMenuNode[] = [
  {
    id: 'gestion-pasivos-financieros',
    label: 'Gestión de pasivos financieros del sector público',
    comingSoon: true,
  },
  {
    id: 'gestion-abastecimiento',
    label: 'Gestión de abastecimiento',
    children: [
      {
        id: 'programacion-multianual-bienes-servicios-obras',
        label: 'Programación multianual de bienes, servicios y obras',
        children: [
          {
            id: 'cmn-programacion',
            label: 'CMN Programación',
            moduleRoute: '/procesos/cmn-programacion',
          },
          {
            id: 'cmn-ejecucion',
            label: 'CMN Ejecución',
            comingSoon: true,
          },
        ],
      },
      {
        id: 'catalogo-bienes-servicios',
        label: 'Catálogo de bienes y servicios',
        comingSoon: true,
      },
      // Taller: las demás pantallas del CMN que ya existían (no están en el Figma del navegador de procesos).
      {
        id: 'cuadro-multianual-necesidades',
        label: 'Cuadro Multianual de Necesidades',
        comingSoon: true,
        children: [
          {
            id: 'cuadro-multianual-necesidades-documentos',
            label: 'Documentos y registros del Cuadro Multianual de Necesidades',
            comingSoon: true,
          },
          {
            id: 'cuadro-multianual-necesidades-consultas',
            label: 'Consultas y reportes del Cuadro Multianual de Necesidades',
            comingSoon: true,
          },
          {
            id: 'cuadro-multianual-necesidades-solicitudes',
            label: 'Solicitudes del Cuadro Multianual de Necesidades',
            comingSoon: true,
            children: [
              {
                id: 'cuadro-multianual-necesidades-solicitudes-items-estrategicos',
                label: 'Necesidades estratégicas',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/solicitudes/necesidades-estrategicas',
              },
              {
                id: 'cuadro-multianual-necesidades-solicitudes-cambio-fecha-vigente',
                label: 'Cambio de fecha vigente',
                comingSoon: true,
              },
              {
                id: 'cuadro-multianual-necesidades-solicitudes-cambio-fecha-vencida',
                label: 'Cambio de fecha vencida',
                comingSoon: true,
              },
              {
                id: 'cuadro-multianual-necesidades-solicitudes-anexo-1-fase-1',
                label: 'Registro de Anexo 1 / Fase 1',
                comingSoon: true,
              },
            ],
          },
          {
            id: 'cuadro-multianual-necesidades-configuracion',
            label: 'Configuración del Cuadro Multianual de Necesidades',
            comingSoon: true,
            children: [
              {
                id: 'cuadro-multianual-necesidades-configuracion-areas-usuarias',
                label: 'Configuración de Áreas Usuarias',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/configuracion/fechas-fase-area-usuaria',
              },
              {
                id: 'cuadro-multianual-necesidades-configuracion-servicios-basicos-excluidos-ley',
                label: 'Configuración de Servicios Básicos Excluidos de la Ley',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/configuracion/servicios-basicos-excluidos-ley',
              },
              {
                id: 'cuadro-multianual-necesidades-configuracion-fechas-fase-dplaip',
                label: 'Configuración de fechas de Fase del CMN - DPLAIP',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/configuracion/fechas-fase-cmn-dplaip',
              },
              {
                id: 'cuadro-multianual-necesidades-configuracion-fechas-fase-entidad',
                label: 'Configuración de fechas de Fase del CMN por Entidad',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/configuracion/fechas-fase-cmn-entidad',
              },
              {
                id: 'cuadro-multianual-necesidades-configuracion-precios-diferenciados',
                label: 'Configuración de Precios Diferenciados',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/configuracion/precios-diferenciados',
              },
              {
                id: 'cuadro-multianual-necesidades-configuracion-distribucion-interna-presupuestaria',
                label: 'Configuración de Distribución Interna Presupuestario',
                moduleRoute: '/procesos/cuadro-multianual-necesidades/configuracion/distribucion-interna-presupuesto',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'clasificadores-catalogos',
    label: 'Clasificadores y catálogos',
    comingSoon: true,
  },
  {
    id: 'consultas-reportes',
    label: 'Consultas y reportes',
    comingSoon: true,
  },
];

export function findProcessPathById(id: string, nodes: readonly ProcessMenuNode[] = DEFAULT_PROCESS_TREE): ProcessMenuNode[] {
  for (const node of nodes) {
    if (node.id === id) {
      return [node];
    }

    const childPath = findProcessPathById(id, node.children || []);

    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
}

/**
 * Árbol del menú "Ajustes" (módulo de administración). Lo pinta el mismo `siaf-process-menu-tree`
 * que el menú de procesos, con otros textos. En el taller no hay módulo de administración: las hojas
 * van como «Próximamente» y no navegan.
 */
export const ADMIN_MENU_TREE: ProcessMenuNode[] = [
  {
    id: 'administracion',
    label: 'Administración',
    expanded: true,
    children: [
      {
        id: 'usuarios-accesos',
        label: 'Usuarios y accesos',
        expanded: true,
        children: [
          { id: 'gestion-usuarios', label: 'Gestión de usuarios', comingSoon: true },
          { id: 'perfiles-funcionales', label: 'Perfiles funcionales', comingSoon: true },
        ],
      },
      {
        id: 'organizacion',
        label: 'Organización',
        children: [
          { id: 'entidades', label: 'Entidades', comingSoon: true },
          { id: 'unidades', label: 'Unidades orgánicas', comingSoon: true },
        ],
      },
    ],
  },
];

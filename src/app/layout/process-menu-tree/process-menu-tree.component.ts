import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

import { IconComponent } from '../../shared/ui/icon/icon.component';
import { DEFAULT_PROCESS_TREE, ProcessMenuNode } from '../../shared/utils/process-tree.util';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';

// El árbol/tipo/utilidad de búsqueda viven en shared/utils/process-tree.util
// (shared no puede depender de layout). Se re-exportan acá para no romper a
// los consumidores existentes que ya importan desde este archivo.
export type { ProcessMenuNode };
export { DEFAULT_PROCESS_TREE, findProcessPathById } from '../../shared/utils/process-tree.util';

/**
 * Árbol canónico de procesos del shell: el menú jerárquico que abre la opción "Procesos" del sidebar.
 *
 * Sus datos por defecto son `DEFAULT_PROCESS_TREE` de `shared/utils/process-tree.util` (este archivo solo
 * re-exporta el tipo y las utilidades). Es el único menú en árbol: el shell también lo usa para "Ajustes" con
 * `ADMIN_MENU_TREE` y otros textos, así que un árbol nuevo es solo otro arreglo de nodos. Cada nodo es un ítem de
 * lista (Figma «A.2-OA-EV-007»): los grupos llevan el ícono de información y el elegido va en negrita sobre el fondo de
 * selección. El campo de búsqueda funciona como paleta de comandos: al escribir, el árbol se cambia por la lista plana
 * de coincidencias bajo «Procesos» (Figma «A.2-OA-EV-008»), sin ir al servidor. Los nodos `comingSoon` solo
 * expanden — nunca emiten `nodeSelected`.
 *
 * @usar
 * - Para el panel Procesos del armazón: `siaf-app-shell` lo abre desde el rail y navega a la `moduleRoute` o
 *   `createRoute` del nodo emitido (plan de cuentas contables, catálogo de eventos, asientos de ajuste, apertura
 *   contable…).
 * - Para el menú Ajustes: el mismo componente con `ADMIN_MENU_TREE` y sus textos (`title`, `subtitle`, `placeholder`,
 *   `searchLabel`), con gestión de usuarios, entidades y auditoría.
 * - Para cualquier menú jerárquico nuevo del armazón: basta otro arreglo de `ProcessMenuNode`.
 * @evitar
 * - Para envolverlo o copiarlo en otro componente de menú: por eso se retiró `siaf-admin-menu`; basta pasarle otros
 *   `nodes` y textos.
 * - Para mostrar datos jerárquicos de solo lectura dentro de una pantalla: usar `siaf-tree-view`.
 * - Para buscar registros en el servidor: usar `siaf-form-table-search` (en Documentos y registros y la bandeja, su
 *   variante `siaf-records-search-toolbar`); este buscador solo filtra la navegación en memoria.
 * @teclado
 * - **Tab**: pasa por el buscador y su lupa, y luego por los nodos visibles en orden. La lupa no hace nada: el filtro
 *   se aplica al escribir.
 * - **Escribir en el buscador**: muestra en vivo la lista de coincidencias, sin distinguir tildes ni mayúsculas;
 *   elegir una limpia el buscador y la muestra en su rama del árbol.
 * - **Enter / Espacio** en un nodo: lo marca y emite `nodeSelected`; si tiene hijos, además los muestra u oculta. Los
 *   nodos `comingSoon` solo expanden.
 * @accesibilidad
 * - **Pendiente · 1.3.1 Información y relaciones (A)**: es un `<aside>` con `h2` y `h3`, pero la jerarquía solo se ve
 *   (sangría y línea a la izquierda): los nodos son botones en `div` anidados, sin `ul`/`li` ni `role="tree"`, y el
 *   lector no anuncia nivel ni cantidad. Además, el `aria-label` del `aside` es fijo («Menu de procesos») y también se
 *   lee en Ajustes.
 * - **1.4.1 Uso del color (A)**: el nodo elegido se distingue por el fondo `bg-states-light-selected`, el color y la
 *   negrita.
 * - **1.4.3 Contraste mínimo (AA)**: en claro, título `text-neutral-high` 16.29:1 y nodos `text-neutral-medium` 14.53:1
 *   sobre blanco; en oscuro el panel usa `bg-surfaces-field` y falta medirlo.
 * - **1.4.11 Contraste no textual (AA)**: el contorno de foco es el azul del kit (`border-states-focus`, 5.35:1 claro
 *   / 10.15:1 oscuro sobre la superficie).
 * - **Pendiente · 2.4.3 Orden del foco (A)**: no toma el foco al abrirse ni cierra con Escape. El armazón lo pinta
 *   después del rail: desde Procesos el Tab pasa antes por Ayuda y Ajustes, y si lo pide una página
 *   (`ShellNavigationService`) queda antes que el botón que lo abrió.
 * - **2.4.7 Foco visible (AA)**: cada nodo muestra un contorno azul de 2 px con `focus-visible`.
 * - **4.1.2 Nombre, función y valor (A)**: los nodos con hijos publican `aria-expanded` y el elegido `aria-current`.
 * - **Pendiente · 4.1.3 Mensajes de estado (AA)**: al buscar no se anuncia cuántas coincidencias hay; sin
 *   coincidencias se muestra «No se encontraron procesos.» con `role="status"`.
 */
@Component({
  selector: 'siaf-process-menu-tree',
  standalone: true,
  imports: [TextFieldComponent, IconComponent, NgTemplateOutlet],
  template: `
    <aside
      class="flex h-[calc(100vh-56px)] w-screen flex-col bg-[var(--sys-color-bg-surfaces-field,var(--sys-color-bg-surfaces-surface))] text-text shadow-siaf-elevation-1 lg:max-w-[370px]"
      aria-label="Menu de procesos"
    >
      <header class="sticky top-0 z-[2] flex min-h-14 w-full items-center bg-[var(--sys-color-bg-surfaces-field,var(--sys-color-bg-surfaces-surface))] p-siaf-md">
        <h2 class="m-0 min-h-6 text-base font-bold uppercase leading-none tracking-[0.02px] text-[var(--sys-color-text-neutral-high)]">
          {{ title }}
        </h2>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto bg-[var(--sys-color-bg-surfaces-field,var(--sys-color-bg-surfaces-surface-highest))] px-siaf-md pt-siaf-xs">
        <!-- Campo del design system: etiqueta flotante y borde de éxito, igual
             que el resto de inputs. A diferencia de los buscadores de datos,
             este filtra la NAVEGACIÓN al teclear (paleta de comandos): el
             tecleo filtra en vivo y no hay viaje al servidor que ahorrar. -->
        <siaf-input
          class="block w-full"
          [label]="placeholder"
          [value]="query"
          trailingIcon="search"
          [trailingButtonLabel]="searchLabel"
          (valueChange)="onQuery($any($event))"
        />

        @if (query.trim()) {
          <!-- Búsqueda (Figma «A.2-OA-EV-008»): lista plana de coincidencias bajo «Procesos». -->
          <section class="flex w-full flex-col gap-siaf-xxs overflow-hidden pt-siaf-xs" [attr.aria-label]="resultsLabel">
            <h3 class="m-0 text-[11px] font-medium uppercase leading-4 tracking-[0.66px] text-[var(--sys-color-text-neutral-low)]">{{ resultsLabel }}</h3>
            @for (node of resultados; track node.id) {
              <button
                class="flex min-h-12 w-full items-center rounded-siaf-sm px-siaf-md py-siaf-sm text-left text-sm leading-normal tracking-[0.0249px] transition duration-150 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
                type="button"
                [class.bg-[var(--sys-color-bg-states-light-selected)]]="selectedId === node.id"
                [class.font-bold]="selectedId === node.id"
                [class.text-[var(--sys-color-text-neutral-activated)]]="selectedId === node.id"
                [class.text-[var(--sys-color-text-neutral-medium)]]="selectedId !== node.id"
                [class.hover:bg-[var(--sys-color-bg-states-light-hover)]]="selectedId !== node.id"
                (click)="activarResultado(node)"
              >
                <span class="min-w-0 flex-1">@for (parte of partesEtiqueta(node.label); track $index) {<span [class.font-bold]="parte.coincide">{{ parte.texto }}</span>}</span>
              </button>
            } @empty {
              <p class="m-0 px-siaf-md py-siaf-sm text-sm text-[var(--sys-color-text-neutral-medium)]" role="status">No se encontraron procesos.</p>
            }
          </section>
        } @else {
          <section class="flex w-full flex-col gap-siaf-md overflow-hidden pt-siaf-lg">
            <h3 class="m-0 text-sm font-medium leading-normal text-[var(--sys-color-text-neutral-medium)]">
              {{ subtitle }}
            </h3>

            <div class="flex w-full flex-col gap-1">
              <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: nodes, level: 0 }" />
            </div>
          </section>
        }
      </div>
    </aside>

    <ng-template #treeTemplate let-items let-level="level">
      @for (node of items; track node.id) {
        <div class="flex w-full flex-col gap-1" [class.pl-siaf-sm]="level > 0">
          <button
            class="flex min-h-12 w-full items-center gap-siaf-md rounded-siaf-sm px-siaf-md py-siaf-sm text-left transition duration-150 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)] active:scale-[0.995]"
            type="button"
            [class.bg-[var(--sys-color-bg-states-light-selected)]]="selectedId === node.id"
            [class.hover:bg-[var(--sys-color-bg-states-light-hover)]]="selectedId !== node.id"
            [class.active:bg-[var(--sys-color-bg-states-light-pressed)]]="selectedId !== node.id"
            [attr.aria-expanded]="hasChildren(node) ? isExpanded(node) : null"
            [attr.aria-current]="selectedId === node.id ? 'page' : null"
            (click)="activate(node)"
          >
            <span
              class="min-w-0 flex-1 text-sm leading-normal"
              [class.font-bold]="selectedId === node.id"
              [class.tracking-[-0.02px]]="selectedId === node.id"
              [class.tracking-[0.0249px]]="selectedId !== node.id"
              [class.text-[var(--sys-color-text-neutral-activated)]]="selectedId === node.id"
              [class.text-[var(--sys-color-text-neutral-medium)]]="selectedId !== node.id"
            >{{ node.label }}</span>

            <!-- Los grupos llevan el ícono de información del Figma; las hojas no. -->
            @if (hasChildren(node) || node.comingSoon) {
              <siaf-icon
                class="shrink-0 self-start text-[var(--sys-color-icon-states-enabled)]"
                name="info"
                [size]="24"
                [attr.title]="node.comingSoon ? 'Próximamente' : null"
              />
            }
          </button>

          @if (hasChildren(node) && isExpanded(node)) {
            <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: node.children || [], level: level + 1 }" />
          }
        </div>
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessMenuTreeComponent implements OnChanges, OnInit {
  @Input() title = 'Procesos';
  @Input() subtitle = 'Seleccionar proceso o procedimiento';
  @Input() placeholder = 'Buscar proceso o procedimiento';
  @Input() searchLabel = 'Buscar proceso o procedimiento';
  /** Encabezado de la lista de resultados de la búsqueda. */
  @Input() resultsLabel = 'Procesos';
  @Input() nodes: ProcessMenuNode[] = DEFAULT_PROCESS_TREE;

  @Output() nodeSelected = new EventEmitter<ProcessMenuNode>();

  query = '';
  selectedId = '';
  private readonly expandedIds = new Set<string>();
  private readonly parentById = new Map<string, string>();
  private readonly activeAncestorIds = new Set<string>();

  ngOnInit(): void {
    this.initializeState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes']) {
      this.initializeState();
    }
  }

  /** Coincidencias de la búsqueda en todo el árbol, como lista plana (sin tildes ni mayúsculas). */
  get resultados(): ProcessMenuNode[] {
    const search = this.normalize(this.query);
    if (!search) return [];
    const encontrados: ProcessMenuNode[] = [];
    const recorrer = (nodes: readonly ProcessMenuNode[]) => {
      for (const node of nodes) {
        if (this.normalize(node.label).includes(search)) encontrados.push(node);
        if (node.children?.length) recorrer(node.children);
      }
    };
    recorrer(this.nodes);
    return encontrados;
  }

  /** Un resultado de la búsqueda: limpia el buscador, abre su rama en el árbol y lo activa. */
  activarResultado(node: ProcessMenuNode): void {
    this.query = '';
    let parentId = this.parentById.get(node.id);
    while (parentId) {
      this.expandedIds.add(parentId);
      parentId = this.parentById.get(parentId);
    }
    if (this.hasChildren(node)) this.expandedIds.delete(node.id);
    this.activate(node);
  }

  activate(node: ProcessMenuNode): void {
    // Los nodos marcados como pendientes solo expanden/colapsan si
    // tienen hijos. No se selecciona ni se emite navegacion para evitar
    // que el shell intente abrir una ruta inexistente.
    if (node.comingSoon) {
      if (this.hasChildren(node)) {
        this.toggle(node);
      }
      return;
    }

    this.selectedId = node.id;
    this.updateActivePath(node.id);

    if (this.hasChildren(node)) {
      this.toggle(node);
    }

    this.nodeSelected.emit(node);
  }

  hasChildren(node: ProcessMenuNode): boolean {
    return Boolean(node.children?.length);
  }

  isExpanded(node: ProcessMenuNode): boolean {
    return this.expandedIds.has(node.id);
  }

  /** Parte la etiqueta en tramos para pintar en negrita las palabras que coinciden con la búsqueda (sin tildes ni mayúsculas). */
  partesEtiqueta(label: string): { texto: string; coincide: boolean }[] {
    const busqueda = this.normalize(this.query);
    if (!busqueda) return [{ texto: label, coincide: false }];

    // Normaliza carácter por carácter para que cada posición siga correspondiendo a la de `label`.
    const normalizado = Array.from(label, (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()).join('');
    if (normalizado.length !== label.length) return [{ texto: label, coincide: false }];

    const partes: { texto: string; coincide: boolean }[] = [];
    let desde = 0;
    for (let i = normalizado.indexOf(busqueda, desde); i !== -1; i = normalizado.indexOf(busqueda, desde)) {
      // La coincidencia se extiende a la palabra completa («config» resalta «Configuración»).
      const inicio = Math.max(desde, normalizado.lastIndexOf(' ', i) + 1);
      const finEspacio = normalizado.indexOf(' ', i + busqueda.length);
      const fin = finEspacio === -1 ? label.length : finEspacio;
      if (inicio > desde) partes.push({ texto: label.slice(desde, inicio), coincide: false });
      partes.push({ texto: label.slice(inicio, fin), coincide: true });
      desde = fin;
    }
    if (desde < label.length) partes.push({ texto: label.slice(desde), coincide: false });
    return partes;
  }

  onQuery(value: string): void {
    this.query = String(value ?? '');
  }

  onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }

  private toggle(node: ProcessMenuNode): void {
    if (this.expandedIds.has(node.id)) {
      this.expandedIds.delete(node.id);
      return;
    }

    this.expandedIds.add(node.id);
  }

  private initializeState(): void {
    this.expandedIds.clear();
    this.parentById.clear();
    this.activeAncestorIds.clear();
    this.selectedId = '';
    this.collectState(this.nodes);

    if (this.selectedId) {
      this.updateActivePath(this.selectedId);
    }
  }

  private collectState(nodes: ProcessMenuNode[], parentId = ''): void {
    for (const node of nodes) {
      if (parentId) {
        this.parentById.set(node.id, parentId);
      }

      // Evita que hijos profundos arranquen abiertos aunque alguien agregue expanded por error.
      if (node.expanded && !parentId) {
        this.expandedIds.add(node.id);
      }

      if (node.selected) {
        this.selectedId = node.id;
      }

      if (node.children?.length) {
        this.collectState(node.children, node.id);
      }
    }
  }

  private updateActivePath(nodeId: string): void {
    this.activeAncestorIds.clear();

    let parentId = this.parentById.get(nodeId);
    while (parentId) {
      this.activeAncestorIds.add(parentId);
      parentId = this.parentById.get(parentId);
    }
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}

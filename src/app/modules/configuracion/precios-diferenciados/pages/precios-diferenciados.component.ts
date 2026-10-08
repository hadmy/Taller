import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { PreciosDiferenciadosApiService } from '../api/precios-diferenciados-api.service';
import { PRECIOS_DIFERENCIADOS_PROCESS_ID, PRECIOS_DIFERENCIADOS_ROUTE } from '../config/precios-diferenciados.rutas';
import { SeleccionarCubsoPanelComponent } from '../components/seleccionar-cubso-panel.component';
import { CatalogoCubso, PrecioDiferenciado } from '../models/precio-diferenciado.model';

/**
 * Configuración de precios diferenciados (Figma «CMN Programación · Configuración»): lista de CUBSO con precios
 * diferenciados por área, con la cantidad de precios ya generados para cada uno. Tres estados:
 * - Al entrar (nodo 5538:60180): solo el «+» y el aviso para usarlo, haya o no CUBSO grabados.
 * - Con CUBSO elegidos en «Seleccionar ítems» y sin grabar (nodo 4683:868177): la tabla de esos CUBSO, con «-» en
 *   precios generados, y «Grabar», que confirma con el modal «¿Grabar?» (nodo 4683:868237).
 * - Lista de CUBSO grabados (nodo 4683:868307), tras «Grabar» o al volver de editar: buscador, selección para
 *   editar o eliminar, tabla y paginación.
 */
@Component({
  selector: 'siaf-precios-diferenciados',
  standalone: true,
  imports: [
    ButtonComponent,
    FormTableSearchComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    SeleccionarCubsoPanelComponent,
    TooltipDirective,
  ],
  templateUrl: './precios-diferenciados.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosDiferenciadosComponent implements OnInit {
  private readonly api = inject(PreciosDiferenciadosApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(
    PRECIOS_DIFERENCIADOS_PROCESS_ID,
    PRECIOS_DIFERENCIADOS_ROUTE,
    'Configuración de precios diferenciados',
  );

  readonly cargando = signal(false);
  readonly eliminando = signal(false);
  readonly busqueda = signal('');
  readonly cubsos = signal<PrecioDiferenciado[]>([]);
  readonly seleccionados = signal<Set<string>>(new Set());
  readonly modalEliminarAbierto = signal(false);

  // «Seleccionar ítems» y los CUBSO elegidos que todavía no se grabaron.
  readonly panelAbierto = signal(false);
  private readonly catalogo = signal<CatalogoCubso[]>([]);
  readonly pendientes = signal<CatalogoCubso[]>([]);
  readonly pendientesSeleccionados = signal<Set<string>>(new Set());
  readonly modalGrabarAbierto = signal(false);
  readonly guardando = signal(false);

  readonly hayPendientes = computed(() => this.pendientes().length > 0);

  /**
   * La lista de CUBSO grabados se muestra recién después de «Grabar», o al volver de «Editar precios diferenciados»
   * (que navega con `state.mostrarLista`); al entrar a la opción se ve el estado inicial con el «+».
   */
  readonly mostrarLista = signal<boolean>(!!this.router.getCurrentNavigation()?.extras.state?.['mostrarLista']);

  /** Estado inicial (Figma, nodo 5538:60180): solo el «+» y el aviso, sin CUBSO elegidos ni lista a la vista. */
  readonly vacio = computed(() => !this.hayPendientes() && (!this.mostrarLista() || (!this.cargando() && this.cubsos().length === 0)));

  /** El panel ofrece el catálogo sin los CUBSO que ya están grabados o elegidos. */
  readonly catalogoDisponible = computed(() => {
    const ya = new Set([...this.cubsos(), ...this.pendientes()].map((c) => c.codigoCubso));
    return this.catalogo().filter((c) => !ya.has(c.codigoCubso));
  });

  readonly todosPendientesSeleccionados = computed(
    () => this.hayPendientes() && this.pendientes().every((c) => this.pendientesSeleccionados().has(c.id)),
  );

  readonly algunosPendientesSeleccionados = computed(
    () => this.pendientesSeleccionados().size > 0 && !this.todosPendientesSeleccionados(),
  );

  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  readonly cubsosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.cubsos();
    return this.cubsos().filter((c) => c.codigoCubso.toLowerCase().includes(texto) || c.descripcion.toLowerCase().includes(texto));
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.cubsosFiltrados().length / this.rowsPerPage())));

  readonly cubsosPaginados = computed(() => {
    const inicio = (this.page() - 1) * this.rowsPerPage();
    return this.cubsosFiltrados().slice(inicio, inicio + this.rowsPerPage());
  });

  readonly todosVisiblesSeleccionados = computed(() => {
    const visibles = this.cubsosPaginados();
    return visibles.length > 0 && visibles.every((c) => this.seleccionados().has(c.id));
  });

  readonly algunosVisiblesSeleccionados = computed(
    () => this.cubsosPaginados().some((c) => this.seleccionados().has(c.id)) && !this.todosVisiblesSeleccionados(),
  );

  /** Con exactamente un CUBSO marcado aparece «Editar»; con ninguno o varios queda oculto. */
  readonly cubsoParaEditar = computed(() => {
    if (this.seleccionados().size !== 1) return null;
    const [id] = this.seleccionados();
    return this.cubsos().find((c) => c.id === id) ?? null;
  });

  /** «Eliminar» se habilita con uno o más CUBSO marcados. */
  readonly hayAlgunoSeleccionado = computed(() => this.seleccionados().size > 0);

  readonly descripcionEliminar = computed(() => {
    const codigos = this.cubsos()
      .filter((c) => this.seleccionados().has(c.id))
      .map((c) => c.codigoCubso);
    if (codigos.length <= 1) return `Se eliminará el CUBSO ${codigos[0] ?? ''}.`;
    return `Se eliminarán los CUBSO ${codigos.join(', ')}.`;
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (cubsos) => {
        this.cubsos.set(cubsos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.page.set(1);
  }

  paginaAnterior(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  paginaSiguiente(): void {
    this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }

  cambiarFilasPorPagina(valor: number): void {
    this.rowsPerPage.set(valor);
    this.page.set(1);
  }

  alternarSeleccion(id: string, marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      if (marcado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  alternarSeleccionVisibles(marcado: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      for (const c of this.cubsosPaginados()) {
        if (marcado) next.add(c.id);
        else next.delete(c.id);
      }
      return next;
    });
  }

  /** «Editar» (lápiz): abre «Editar precios diferenciados» del CUBSO marcado. */
  editarSeleccionado(): void {
    const cubso = this.cubsoParaEditar();
    if (cubso) void this.router.navigateByUrl(`${PRECIOS_DIFERENCIADOS_ROUTE}/${cubso.id}`);
  }

  /** «+»: abre «Seleccionar ítems»; el catálogo se trae la primera vez. */
  abrirPanel(): void {
    if (!this.catalogo().length) this.api.listarCatalogo().subscribe((c) => this.catalogo.set(c));
    this.panelAbierto.set(true);
  }

  /** «Aceptar» del panel: los CUBSO marcados pasan a la tabla, pendientes de «Grabar». */
  agregarPendientes(elegidos: CatalogoCubso[]): void {
    this.pendientes.update((lista) => [...lista, ...elegidos]);
    this.panelAbierto.set(false);
  }

  alternarSeleccionPendiente(id: string, marcado: boolean): void {
    this.pendientesSeleccionados.update((set) => {
      const next = new Set(set);
      if (marcado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  alternarSeleccionPendientes(marcado: boolean): void {
    this.pendientesSeleccionados.set(marcado ? new Set(this.pendientes().map((c) => c.id)) : new Set());
  }

  /** Quita de la tabla los CUBSO marcados que aún no se grabaron (no hay nada que borrar en el servidor). */
  quitarPendientes(): void {
    const ids = this.pendientesSeleccionados();
    this.pendientes.update((lista) => lista.filter((c) => !ids.has(c.id)));
    this.pendientesSeleccionados.set(new Set());
  }

  /** «Aceptar» del modal «¿Grabar?»: graba los CUBSO pendientes y vuelve a la lista. */
  confirmarGrabar(): void {
    if (!this.hayPendientes() || this.guardando()) return;
    this.guardando.set(true);
    this.api.agregar(this.pendientes().map(({ codigoCubso, descripcion }) => ({ codigoCubso, descripcion }))).subscribe({
      next: (cubsos) => {
        this.cubsos.set(cubsos);
        this.mostrarLista.set(true);
        this.pendientes.set([]);
        this.pendientesSeleccionados.set(new Set());
        this.guardando.set(false);
        this.modalGrabarAbierto.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }

  abrirModalEliminar(): void {
    if (!this.hayAlgunoSeleccionado()) return;
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  confirmarEliminar(): void {
    const ids = [...this.seleccionados()];
    if (!ids.length || this.eliminando()) return;
    this.eliminando.set(true);
    forkJoin(ids.map((id) => this.api.eliminar(id))).subscribe({
      next: () => {
        this.cubsos.update((lista) => lista.filter((c) => !ids.includes(c.id)));
        this.seleccionados.set(new Set());
        this.eliminando.set(false);
        this.modalEliminarAbierto.set(false);
      },
      error: () => this.eliminando.set(false),
    });
  }
}

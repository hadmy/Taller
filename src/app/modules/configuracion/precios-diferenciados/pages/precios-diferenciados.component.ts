import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { PrecioDiferenciado } from '../models/precio-diferenciado.model';

/**
 * Configuración de precios diferenciados (Figma «CMN Programación · Configuración», nodo 4524:189505): lista de
 * CUBSO con precios diferenciados por área, con la cantidad de precios ya generados para cada uno.
 */
@Component({
  selector: 'siaf-precios-diferenciados',
  standalone: true,
  imports: [ButtonComponent, FormTableSearchComponent, ModalComponent, PageHeaderComponent, PageShellComponent, PaginationComponent, TooltipDirective],
  templateUrl: './precios-diferenciados.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosDiferenciadosComponent implements OnInit {
  private readonly api = inject(PreciosDiferenciadosApiService);

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

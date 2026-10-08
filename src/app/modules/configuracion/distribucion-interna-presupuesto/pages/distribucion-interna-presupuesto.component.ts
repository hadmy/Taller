import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { DistribucionInternaPresupuestoApiService } from '../api/distribucion-interna-presupuesto-api.service';
import {
  DISTRIBUCION_INTERNA_PRESUPUESTO_FORM_ROUTE,
  DISTRIBUCION_INTERNA_PRESUPUESTO_PROCESS_ID,
  DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE,
} from '../config/distribucion-interna-presupuesto.rutas';
import { DistribucionInternaPresupuesto } from '../models/distribucion-interna-presupuesto.model';

/**
 * Configuración de distribución interna de presupuesto (Figma «CMN Programación · Configuración», nodo
 * 4129:284465): lista de años con la distribución del techo presupuestal por genérica ya configurada. «+» lleva al
 * formulario (elegir año y presupuesto de fase, y repartir el techo entre las áreas usuarias).
 */
@Component({
  selector: 'siaf-distribucion-interna-presupuesto',
  standalone: true,
  imports: [
    ButtonComponent,
    FormTableSearchComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    RecordStatusTagComponent,
    StatusTagComponent,
    TooltipDirective,
  ],
  templateUrl: './distribucion-interna-presupuesto.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistribucionInternaPresupuestoComponent implements OnInit {
  private readonly api = inject(DistribucionInternaPresupuestoApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(
    DISTRIBUCION_INTERNA_PRESUPUESTO_PROCESS_ID,
    DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE,
    'Distribución interna de presupuesto',
  );

  readonly cargando = signal(false);
  readonly eliminando = signal(false);
  readonly busqueda = signal('');
  readonly anios = signal<DistribucionInternaPresupuesto[]>([]);
  readonly seleccionados = signal<Set<string>>(new Set());
  readonly modalEliminarAbierto = signal(false);

  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  readonly aniosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.anios();
    return this.anios().filter((a) => String(a.anio).includes(texto));
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.aniosFiltrados().length / this.rowsPerPage())));

  readonly aniosPaginados = computed(() => {
    const inicio = (this.page() - 1) * this.rowsPerPage();
    return this.aniosFiltrados().slice(inicio, inicio + this.rowsPerPage());
  });

  readonly todosVisiblesSeleccionados = computed(() => {
    const visibles = this.aniosPaginados();
    return visibles.length > 0 && visibles.every((a) => this.seleccionados().has(a.id));
  });

  readonly algunosVisiblesSeleccionados = computed(
    () => this.aniosPaginados().some((a) => this.seleccionados().has(a.id)) && !this.todosVisiblesSeleccionados(),
  );

  /** Con exactamente un año marcado, habilita «Editar»: los otros casos (ninguno o varios) lo dejan deshabilitado. */
  readonly anioParaEditar = computed(() => {
    if (this.seleccionados().size !== 1) return null;
    const [id] = this.seleccionados();
    return this.anios().find((a) => a.id === id) ?? null;
  });

  /** «Eliminar» se habilita con uno o más años marcados. */
  readonly hayAlgunoSeleccionado = computed(() => this.seleccionados().size > 0);

  readonly descripcionEliminar = computed(() => {
    const anios = this.anios()
      .filter((a) => this.seleccionados().has(a.id))
      .map((a) => a.anio)
      .sort((a, b) => a - b);
    if (anios.length <= 1) return `Se eliminará la distribución del año ${anios[0] ?? ''}.`;
    return `Se eliminará la distribución de los años ${anios.join(', ')}.`;
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (anios) => {
        this.anios.set(anios);
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
      for (const a of this.aniosPaginados()) {
        if (marcado) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  }

  irAlFormulario(): void {
    void this.router.navigateByUrl(DISTRIBUCION_INTERNA_PRESUPUESTO_FORM_ROUTE);
  }

  editarSeleccionado(): void {
    const anio = this.anioParaEditar();
    if (!anio) return;
    void this.router.navigate([DISTRIBUCION_INTERNA_PRESUPUESTO_FORM_ROUTE], { queryParams: { anio: anio.anio } });
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
        this.anios.update((lista) => lista.filter((a) => !ids.includes(a.id)));
        this.seleccionados.set(new Set());
        this.eliminando.set(false);
        this.modalEliminarAbierto.set(false);
      },
      error: () => this.eliminando.set(false),
    });
  }
}

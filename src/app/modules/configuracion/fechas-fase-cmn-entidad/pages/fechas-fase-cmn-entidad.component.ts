import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { FechasFaseCmnEntidadApiService } from '../api/fechas-fase-cmn-entidad-api.service';
import { FECHAS_FASE_CMN_ENTIDAD_FORM_ROUTE, FECHAS_FASE_CMN_ENTIDAD_PROCESS_ID, FECHAS_FASE_CMN_ENTIDAD_ROUTE } from '../config/fechas-fase-cmn-entidad.rutas';
import { FechaFaseCmnEntidad } from '../models/fecha-fase-cmn.model';

/**
 * Configuración de fechas de fase del CMN para la entidad (Figma «CMN Programación · Configuración», nodo
 * 3602:458899): lista de años con fechas de fase configuradas. «+» lleva al formulario (elegir año y sus tres
 * fases) que crea el año «En Proceso» o edita uno ya configurado.
 */
@Component({
  selector: 'siaf-fechas-fase-cmn-entidad',
  standalone: true,
  imports: [
    ButtonComponent,
    FormTableSearchComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    RecordStatusTagComponent,
    TooltipDirective,
  ],
  templateUrl: './fechas-fase-cmn-entidad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FechasFaseCmnEntidadComponent implements OnInit {
  private readonly api = inject(FechasFaseCmnEntidadApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(FECHAS_FASE_CMN_ENTIDAD_PROCESS_ID, FECHAS_FASE_CMN_ENTIDAD_ROUTE, 'Configuración de fechas de fase del CMN');

  readonly cargando = signal(false);
  readonly eliminando = signal(false);
  readonly busqueda = signal('');
  readonly anios = signal<FechaFaseCmnEntidad[]>([]);
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
    if (anios.length <= 1) return `Se eliminará la configuración del año ${anios[0] ?? ''}.`;
    return `Se eliminará la configuración de los años ${anios.join(', ')}.`;
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
    void this.router.navigateByUrl(FECHAS_FASE_CMN_ENTIDAD_FORM_ROUTE);
  }

  editarSeleccionado(): void {
    const anio = this.anioParaEditar();
    if (!anio) return;
    void this.router.navigate([FECHAS_FASE_CMN_ENTIDAD_FORM_ROUTE], { queryParams: { anio: anio.anio } });
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

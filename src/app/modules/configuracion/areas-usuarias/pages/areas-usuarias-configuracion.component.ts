import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, BANDERAS_AREA_USUARIA } from '../models/area-usuaria.model';

/**
 * Configuración de áreas usuarias (Figma «CMN Programación · Configuración», nodos 3813:375072 y 3997:188462):
 * tarjeta con «Cancelar» / «Grabar» y la sección «Registros», con la tabla de áreas del pliego y cuatro banderas
 * (¿Genera CMN?, ¿Es ATE?, ¿Es OA?, ¿Es AGA?) que definen su participación en el Cuadro Multianual de Necesidades.
 * Las banderas de un área están inactivas hasta que su configuración se graba (en el detalle con «Editar», o con
 * «Grabar» de esta pantalla); desde entonces aparecen activas. Los checks de selección, antes del código de área,
 * siempre están activos.
 * La lupa (o Enter) del buscador lleva al detalle de la primera área que coincida; «Sincronizar» agrega la siguiente
 * área del pliego con la etiqueta «Nuevo» (Figma, nodo 3867:171301); «Grabar» solo se habilita con cambios respecto de
 * lo cargado.
 */
@Component({
  selector: 'siaf-areas-usuarias-configuracion',
  standalone: true,
  imports: [ButtonComponent, FormTableSearchComponent, PageHeaderComponent, PageShellComponent, PaginationComponent, StatusTagComponent, TooltipDirective],
  templateUrl: './areas-usuarias-configuracion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasUsuariasConfiguracionComponent implements OnInit {
  private readonly api = inject(AreasUsuariasApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE, 'Configuración de áreas usuarias');
  readonly banderas = BANDERAS_AREA_USUARIA;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly sincronizando = signal(false);
  readonly busqueda = signal('');
  readonly areas = signal<AreaUsuaria[]>([]);
  readonly seleccionadas = signal<Set<string>>(new Set());
  private readonly snapshotInicial = signal<string | null>(null);

  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  readonly areasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.areas();
    return this.areas().filter((a) => a.codigo.toLowerCase().includes(texto) || a.denominacion.toLowerCase().includes(texto));
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.areasFiltradas().length / this.rowsPerPage())));

  readonly areasPaginadas = computed(() => {
    const inicio = (this.page() - 1) * this.rowsPerPage();
    return this.areasFiltradas().slice(inicio, inicio + this.rowsPerPage());
  });

  readonly todasVisiblesSeleccionadas = computed(() => {
    const visibles = this.areasPaginadas();
    return visibles.length > 0 && visibles.every((a) => this.seleccionadas().has(a.id));
  });

  readonly algunasVisiblesSeleccionadas = computed(
    () => this.areasPaginadas().some((a) => this.seleccionadas().has(a.id)) && !this.todasVisiblesSeleccionadas(),
  );

  /** Con exactamente un área marcada se habilita «Editar»; con ninguna o varias queda oculto. */
  readonly areaParaEditar = computed(() => {
    if (this.seleccionadas().size !== 1) return null;
    const [id] = this.seleccionadas();
    return this.areas().find((a) => a.id === id) ?? null;
  });

  readonly huboCambios = computed(() => hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario(this.areas())));

  ngOnInit(): void {
    this.cargar();
  }

  /** Trae los registros del servidor y los toma como punto de partida de «Grabar». */
  cargar(): void {
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (areas) => {
        this.areas.set(areas);
        this.snapshotInicial.set(crearSnapshotFormulario(areas));
        this.seleccionadas.set(new Set());
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /**
   * «Sincronizar»: agrega a la lista la siguiente área del pliego que aún no estaba, con la etiqueta «Nuevo».
   * Conserva lo que el usuario ya cambió en la tabla; «Grabar» pasa a estar habilitado por el registro agregado.
   */
  sincronizar(): void {
    if (this.sincronizando()) return;
    this.sincronizando.set(true);
    this.api.sincronizar().subscribe({
      next: ({ area }) => {
        if (!area) {
          this.sincronizando.set(false);
          return;
        }
        this.api.listar().subscribe({
          next: (servidor) => {
            const locales = new Map(this.areas().map((a) => [a.id, a]));
            this.areas.set(servidor.map((a) => locales.get(a.id) ?? a));
            this.sincronizando.set(false);
          },
          error: () => this.sincronizando.set(false),
        });
      },
      error: () => this.sincronizando.set(false),
    });
  }

  /** Lupa (o Enter) del buscador: filtra la tabla y navega al detalle de la primera área que coincida con lo escrito. */
  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.page.set(1);
    const encontrada = this.primeraCoincidencia(texto);
    if (encontrada) void this.router.navigateByUrl(`${AREAS_USUARIAS_ROUTE}/${encontrada.id}`);
  }

  private primeraCoincidencia(texto: string): AreaUsuaria | undefined {
    const valor = texto.trim().toLowerCase();
    if (!valor) return undefined;
    return this.areas().find((a) => a.codigo.toLowerCase().includes(valor) || a.denominacion.toLowerCase().includes(valor));
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

  alternarSeleccion(areaId: string, marcada: boolean): void {
    this.seleccionadas.update((set) => {
      const next = new Set(set);
      if (marcada) next.add(areaId);
      else next.delete(areaId);
      return next;
    });
  }

  alternarSeleccionVisibles(marcadas: boolean): void {
    this.seleccionadas.update((set) => {
      const next = new Set(set);
      for (const a of this.areasPaginadas()) {
        if (marcadas) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  }

  /** «Editar» (lápiz): abre el detalle de datos del área marcada. */
  editarSeleccionada(): void {
    const area = this.areaParaEditar();
    if (area) void this.router.navigateByUrl(`${AREAS_USUARIAS_ROUTE}/${area.id}`);
  }

  alternar(areaId: string, bandera: keyof AreaUsuaria, marcado: boolean): void {
    this.areas.update((lista) => lista.map((a) => (a.id === areaId ? { ...a, [bandera]: marcado } : a)));
  }

  cancelar(): void {
    void this.router.navigateByUrl('/panel');
  }

  grabar(): void {
    if (!this.huboCambios() || this.guardando()) return;
    this.guardando.set(true);
    const cambios = this.areas().map(({ id, generaCmn, esAte, esOa, esAga }) => ({ id, generaCmn, esAte, esOa, esAga }));
    this.api.guardar(cambios).subscribe({
      next: () => {
        this.guardando.set(false);
        // El servidor aplica reglas al grabar (solo un área AGA, se limpia «Nuevo»): se vuelve a leer su resultado.
        this.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }
}

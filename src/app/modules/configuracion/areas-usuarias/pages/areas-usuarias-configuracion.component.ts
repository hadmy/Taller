import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { SnackbarComponent } from '../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SelectionSideNavComponent } from '../../../../shared/components/selection-side-nav/selection-side-nav.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, BANDERAS_AREA_USUARIA } from '../models/area-usuaria.model';

/** Texto del modal «¿Grabar?» (HU-01, MSJ-J-109). */
export const MSJ_CONFIRMAR_GRABAR = 'Se actualizarán los datos de las áreas usuarias';
/** Aviso al grabar (HU-01, MSJ-J-01). */
export const MSJ_GRABADO = 'Se actualizó la configuración de la lista de áreas usuarias';

/**
 * Configuración de áreas usuarias, pestaña de «Configuración del Cuadro Multianual de Necesidades» (Figma «CMN
 * Programación · Configuración», A.1: RC-009, RC-041, RC-045 a RC-050). Sigue el lineamiento gráfico de las listas de
 * configuración:
 * - Abre en **solo lectura**: las banderas (¿Genera CMN?, ¿Es ATE?, ¿Es OA?, ¿Es MAA?) marcadas se ven en azul y no se
 *   pueden cambiar; solo se ve «Editar».
 * - «Editar» pone la grilla en edición y muestra «Sincronizar», «Cancelar» y «Grabar». «Cancelar» descarta los cambios
 *   y vuelve a solo lectura; «Grabar» pide confirmación (MSJ-J-109), graba y vuelve a solo lectura con el aviso MSJ-J-01.
 * - En edición, una casilla en el encabezado de «¿Genera CMN?» la marca o desmarca en todas las áreas editables que
 *   deja ver la búsqueda (todas las páginas); queda en estado intermedio si solo algunas la tienen.
 * - «Sincronizar» abre el panel lateral de unidades organizacionales que todavía no están en la lista: primero en solo
 *   lectura, con «Editar» se eligen y «Aceptar» las incorpora como pendientes de grabar, con «¿Genera CMN?» marcado.
 * - En solo lectura, con un área seleccionada el lápiz abre su detalle y el ícono de lista sus necesidades; con varias,
 *   el lápiz edita en la grilla solo esas áreas.
 */
@Component({
  selector: 'siaf-areas-usuarias-configuracion',
  standalone: true,
  imports: [
    ButtonComponent,
    ConfiguracionTabsComponent,
    FormTableSearchComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    RecordStatusTagComponent,
    SelectionSideNavComponent,
    SnackbarComponent,
    StatusTagComponent,
    TooltipDirective,
  ],
  templateUrl: './areas-usuarias-configuracion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasUsuariasConfiguracionComponent implements OnInit {
  private readonly api = inject(AreasUsuariasApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE, 'Configuración del Cuadro Multianual de Necesidades');
  readonly banderas = BANDERAS_AREA_USUARIA;
  readonly msjConfirmar = MSJ_CONFIRMAR_GRABAR;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly busqueda = signal('');
  /** Lo grabado en el servidor. */
  readonly areas = signal<AreaUsuaria[]>([]);
  /** Copia de trabajo mientras se edita (incluye las unidades incorporadas desde «Sincronizar»). */
  readonly borrador = signal<AreaUsuaria[]>([]);
  readonly modo = signal<'lectura' | 'edicion'>('lectura');
  /** Con el lápiz sobre varias áreas, solo esas se editan; `null` = toda la grilla. */
  readonly soloEditables = signal<Set<string> | null>(null);
  readonly seleccionadas = signal<Set<string>>(new Set());
  private readonly snapshotInicial = signal<string | null>(null);

  readonly modalGrabar = signal(false);
  readonly aviso = signal<string | null>(null);

  // Panel «Sincronizar»
  readonly panelAbierto = signal(false);
  readonly panelEditable = signal(false);
  readonly disponibles = signal<AreaUsuaria[]>([]);
  readonly seleccionPanel = signal<string[]>([]);

  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  readonly enEdicion = computed(() => this.modo() === 'edicion');
  readonly filas = computed(() => (this.enEdicion() ? this.borrador() : this.areas()));

  readonly areasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.filas();
    return this.filas().filter((a) => a.codigo.toLowerCase().includes(texto) || a.denominacion.toLowerCase().includes(texto));
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

  /** Con exactamente un área marcada: su detalle (lápiz) y sus necesidades (ícono de lista). */
  readonly areaUnica = computed(() => {
    if (this.seleccionadas().size !== 1) return null;
    const [id] = this.seleccionadas();
    return this.areas().find((a) => a.id === id) ?? null;
  });

  readonly huboCambios = computed(
    () => this.enEdicion() && hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario(this.borrador())),
  );

  /**
   * Selección masiva de «¿Genera CMN?» (Figma A.1-RC-041 a RC-045): en edición, la casilla del encabezado de la
   * columna alcanza a todas las áreas editables que deja ver la búsqueda, en todas las páginas.
   */
  readonly editablesGeneraCmn = computed(() => this.areasFiltradas().filter((a) => this.editable(a)));

  readonly todasGeneraCmn = computed(() => {
    const lista = this.editablesGeneraCmn();
    return lista.length > 0 && lista.every((a) => a.generaCmn);
  });

  readonly algunasGeneraCmn = computed(() => !this.todasGeneraCmn() && this.editablesGeneraCmn().some((a) => a.generaCmn));

  /** Casilla del encabezado: marca o desmarca «¿Genera CMN?» en todas las áreas editables filtradas. */
  alternarGeneraCmnMasivo(marcado: boolean): void {
    const ids = new Set(this.editablesGeneraCmn().map((a) => a.id));
    this.borrador.update((lista) => lista.map((a) => (ids.has(a.id) ? { ...a, generaCmn: marcado } : a)));
  }

  /** Ids incorporados desde el panel y todavía no grabados. */
  readonly incorporadas = computed(() => {
    const grabadas = new Set(this.areas().map((a) => a.id));
    return new Set(this.borrador().filter((a) => !grabadas.has(a.id)).map((a) => a.id));
  });

  ngOnInit(): void {
    this.cargar();
  }

  /** Trae la lista del servidor y la muestra en solo lectura. */
  cargar(): void {
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (areas) => {
        this.areas.set(areas);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /** ¿La bandera de esta fila se puede cambiar? Solo en edición, y con el lápiz múltiple solo en las áreas elegidas. */
  editable(area: AreaUsuaria): boolean {
    if (!this.enEdicion()) return false;
    const solo = this.soloEditables();
    return !solo || solo.has(area.id);
  }

  /** Fila resaltada: elegida para la edición múltiple o incorporada desde el panel. */
  resaltada(area: AreaUsuaria): boolean {
    return this.enEdicion() ? !!this.soloEditables()?.has(area.id) || this.incorporadas().has(area.id) : this.seleccionadas().has(area.id);
  }

  /** «Editar»: toda la grilla en edición, con la copia de lo grabado como punto de partida de «Grabar». */
  editar(soloIds: Set<string> | null = null): void {
    const copia = this.areas().map((a) => ({ ...a }));
    this.borrador.set(copia);
    this.snapshotInicial.set(crearSnapshotFormulario(copia));
    this.soloEditables.set(soloIds);
    this.modo.set('edicion');
    this.aviso.set(null);
  }

  /** «Cancelar»: descarta los cambios y vuelve a la lista en solo lectura. */
  cancelar(): void {
    this.borrador.set([]);
    this.soloEditables.set(null);
    this.modo.set('lectura');
  }

  /** «Grabar»: pide confirmación (MSJ-J-109). */
  pedirGrabar(): void {
    if (this.huboCambios() && !this.guardando()) this.modalGrabar.set(true);
  }

  /** Confirmación del modal: graba, vuelve a solo lectura y muestra MSJ-J-01. */
  confirmarGrabar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    const cambios = this.borrador().map(({ id, generaCmn, esAte, esOa, esMaa }) => ({ id, generaCmn, esAte, esOa, esMaa }));
    this.api.guardar(cambios).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalGrabar.set(false);
        this.cancelar();
        this.seleccionadas.set(new Set());
        this.aviso.set(MSJ_GRABADO);
        // El servidor aplica reglas al grabar (una sola OA y una sola MAA): se vuelve a leer su resultado.
        this.cargar();
      },
      error: () => {
        this.guardando.set(false);
        this.modalGrabar.set(false);
      },
    });
  }

  /** Cambia una bandera en la copia de trabajo. «¿Es OA?» y «¿Es MAA?» son exclusivas; la regla se aplica al grabar. */
  alternar(areaId: string, bandera: keyof AreaUsuaria, marcado: boolean): void {
    this.borrador.update((lista) => lista.map((a) => (a.id === areaId ? { ...a, [bandera]: marcado } : a)));
  }

  // ─── Panel «Sincronizar» ───────────────────────────────────────

  sincronizar(): void {
    this.panelEditable.set(false);
    this.seleccionPanel.set([]);
    this.panelAbierto.set(true);
    const ya = new Set(this.borrador().map((a) => a.id));
    this.api.disponibles().subscribe((lista) => this.disponibles.set(lista.filter((a) => !ya.has(a.id))));
  }

  editarPanel(): void {
    this.panelEditable.set(true);
  }

  alternarPanel(id: string, marcada: boolean): void {
    this.seleccionPanel.update((ids) => (marcada ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  alternarTodasPanel(marcadas: boolean): void {
    this.seleccionPanel.set(marcadas ? this.disponibles().map((a) => a.id) : []);
  }

  /** «Aceptar»: incorpora las unidades elegidas a la grilla, pendientes de grabar y con «¿Genera CMN?» marcado. */
  aceptarPanel(ids: string[]): void {
    const elegidas = this.disponibles().filter((a) => ids.includes(a.id));
    this.borrador.update((lista) => [...lista, ...elegidas.map((a) => ({ ...a, generaCmn: true, nuevo: true }))]);
    this.cerrarPanel();
  }

  /** Cerrar o «Cancelar»: descarta la selección de esa apertura; lo ya incorporado se mantiene. */
  cerrarPanel(): void {
    this.panelAbierto.set(false);
    this.seleccionPanel.set([]);
  }

  // ─── Búsqueda, paginación y selección ──────────────────────────

  filtrar(texto: string): void {
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

  /** Lápiz: con un área abre su detalle; con varias, edita en la grilla solo esas áreas. */
  editarSeleccionadas(): void {
    const unica = this.areaUnica();
    if (unica) {
      void this.router.navigateByUrl(`${AREAS_USUARIAS_ROUTE}/${unica.id}`);
      return;
    }
    if (this.seleccionadas().size > 1) this.editar(new Set(this.seleccionadas()));
  }

  /** Ícono de lista: detalle de necesidades del área seleccionada. */
  verNecesidades(): void {
    const unica = this.areaUnica();
    if (unica) void this.router.navigate([AREAS_USUARIAS_ROUTE, unica.id], { queryParams: { pestana: 'necesidades' } });
  }
}

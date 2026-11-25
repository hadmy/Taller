import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconDropdownMenuComponent, IconDropdownMenuItem } from '../../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { SideNavComponent } from '../../../../shared/ui/side-nav/side-nav.component';
import { SnackbarComponent } from '../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { TextFieldComponent } from '../../../../shared/ui/text-field/text-field.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { RegistrosSincronizarDialogComponent } from '../components/registros-sincronizar-dialog.component';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, BANDERAS_AREA_USUARIA } from '../models/area-usuaria.model';

/** Aviso al grabar la edición masiva (Figma A.1-RC-038). */
export const msjGrabado = (n: number): string => `Registros actualizados con éxito: ${n}`;

type Bandera = 'generaCmn' | 'esAte' | 'esOa' | 'esMaa';

/**
 * Configuración de áreas usuarias, pestaña de «Configuración del Cuadro Multianual de Necesidades» (Figma «2. REGISTRO
 * CONFIGURACION», A.1-RC-006 a RC-043):
 * - En **solo lectura** las banderas (¿Genera CMN?, ¿Es ATE?, ¿Es OA?, ¿Es MAA?) se muestran con ✓ si están marcadas y
 *   con «-» si no. Cada fila se marca con su casilla; la de arriba marca toda la página.
 * - **Lápiz** (aparece con filas marcadas): con un área abre su detalle; con varias, «Cancelar» y «Grabar» reemplazan a
 *   «Sincronizar» y el lápiz pasa las filas a edición (casillas en sus cuatro banderas). En edición, el lápiz abre
 *   «Edición masiva», que aplica «Generar CMN?» a todas; «Limpiar» lo devuelve a lo grabado. «Cancelar» descarta y
 *   «Grabar» (con cambios y confirmación) actualiza las áreas marcadas y muestra cuántas. El servidor aplica las reglas
 *   de una sola OA y una sola MAA.
 * - «Sincronizar» abre el diálogo «Registros» (Figma A.1-RC-091 a RC-094) con las unidades del pliego que aún no
 *   están en la lista; «Aceptar» las incorpora con «¿Genera CMN?» y la etiqueta «Nuevo».
 * - Un clic en la fila (o Enter) abre el detalle del área para agregar commodities o ítems; la casilla no lo dispara y,
 *   en edición, ninguna fila abre el detalle.
 * - Un área **inactiva** no se configura: con ella marcada, «Más opciones» ofrece «Transferir datos» (Figma
 *   A.1-RC-084 a RC-090), que pasa sus commodities/ítems a un área activa.
 */
@Component({
  selector: 'siaf-areas-usuarias-configuracion',
  standalone: true,
  imports: [
    ButtonComponent,
    ConfiguracionTabsComponent,
    IconComponent,
    IconDropdownMenuComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    RecordStatusTagComponent,
    RegistrosSincronizarDialogComponent,
    SideNavComponent,
    SnackbarComponent,
    StatusTagComponent,
    TextFieldComponent,
    TooltipDirective,
  ],
  templateUrl: './areas-usuarias-configuracion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasUsuariasConfiguracionComponent implements OnInit {
  private readonly api = inject(AreasUsuariasApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly banderas = BANDERAS_AREA_USUARIA as { key: Bandera; label: string; descripcion: string }[];

  /** Anchos de las columnas de banderas (Figma A.1-RC-006). */
  readonly anchoBandera: Record<Bandera, string> = { generaCmn: 'w-[143px]', esAte: 'w-[110px]', esOa: 'w-[110px]', esMaa: 'w-[155px]' };

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly busqueda = signal('');
  readonly areas = signal<AreaUsuaria[]>([]);
  readonly aviso = signal<string | null>(null);

  /** Filas marcadas (por id) y su copia de trabajo mientras se editan en bloque (`null` = solo lectura). */
  readonly marcadas = signal<Set<string>>(new Set());
  readonly borrador = signal<Record<string, AreaUsuaria> | null>(null);
  readonly editando = computed(() => this.borrador() !== null);
  /** Con varias áreas marcadas, «Cancelar» y «Grabar» reemplazan a «Sincronizar» (Figma A.1-RC-035). */
  readonly masiva = computed(() => this.editando() || this.seleccion().length > 1);

  // Panel «Edición masiva» y confirmación de «Grabar»
  readonly panelMasivo = signal(false);
  readonly masivoGeneraCmn = signal(false);
  readonly modalGrabar = signal(false);

  // Diálogo «Registros» de «Sincronizar»
  readonly panelAbierto = signal(false);
  readonly disponibles = signal<AreaUsuaria[]>([]);

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

  readonly seleccion = computed(() => this.areas().filter((a) => this.marcadas().has(a.id)));
  readonly paginaMarcada = computed(() => this.areasPaginadas().length > 0 && this.areasPaginadas().every((a) => this.marcadas().has(a.id)));
  readonly paginaParcial = computed(() => !this.paginaMarcada() && this.areasPaginadas().some((a) => this.marcadas().has(a.id)));
  /** El lápiz necesita solo áreas activas: las inactivas no se configuran. */
  readonly puedeEditar = computed(() => this.seleccion().length > 0 && !this.seleccion().some((a) => this.inactiva(a)));
  /** «Transferir datos»: una sola área inactiva marcada. */
  readonly areaPorTransferir = computed(() => {
    const [area, otra] = this.seleccion();
    return area && !otra && this.inactiva(area) ? area : null;
  });
  readonly masOpciones: IconDropdownMenuItem[] = [{ label: 'Transferir datos', value: 'transferir' }];

  /** Áreas cuya copia de trabajo difiere de lo grabado: sin ninguna, «Grabar» queda deshabilitado. */
  readonly cambiadas = computed(() => {
    const borrador = this.borrador();
    if (!borrador) return [];
    return this.areas()
      .filter((a) => borrador[a.id] && this.banderas.some((b) => !!borrador[a.id][b.key] !== !!a[b.key]))
      .map((a) => borrador[a.id]);
  });

  ngOnInit(): void {
    // Al volver de «Transferir datos», el aviso de éxito llega en el estado de la navegación.
    const aviso = (history.state as { aviso?: string } | null)?.aviso;
    if (aviso) this.aviso.set(aviso);
    this.cargar();
  }

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

  // ─── Selección y edición en bloque ─────────────────────────────

  marcar(area: AreaUsuaria, marcada: boolean): void {
    this.marcadas.update((set) => {
      const siguiente = new Set(set);
      if (marcada) siguiente.add(area.id);
      else siguiente.delete(area.id);
      return siguiente;
    });
  }

  marcarPagina(marcada: boolean): void {
    for (const area of this.areasPaginadas()) this.marcar(area, marcada);
  }

  enEdicion(area: AreaUsuaria): boolean {
    return !!this.borrador()?.[area.id];
  }

  /** Valor a mostrar de una bandera: el de la copia de trabajo si la fila está en edición. */
  valor(area: AreaUsuaria, bandera: Bandera): boolean {
    return !!(this.borrador()?.[area.id] ?? area)[bandera];
  }

  /** Lápiz de la barra: con un área abre su detalle; con varias, la edición en bloque. */
  editarSeleccion(): void {
    if (!this.puedeEditar() || this.guardando()) return;
    const areas = this.seleccion();
    if (areas.length === 1) {
      this.verDetalle(areas[0]);
      return;
    }
    this.aviso.set(null);
    this.borrador.set(Object.fromEntries(areas.map((a) => [a.id, { ...a }])));
  }

  abrirMasiva(): void {
    this.masivoGeneraCmn.set(Object.values(this.borrador() ?? {}).every((a) => a.generaCmn));
    this.panelMasivo.set(true);
  }

  alternar(id: string, bandera: Bandera, marcado: boolean): void {
    this.borrador.update((b) => (b?.[id] ? { ...b, [id]: { ...b[id], [bandera]: marcado } } : b));
  }

  /** «Aplicar» de «Edición masiva»: «¿Genera CMN?» en todas las áreas marcadas. */
  aplicarMasiva(): void {
    for (const id of Object.keys(this.borrador() ?? {})) this.alternar(id, 'generaCmn', this.masivoGeneraCmn());
    this.panelMasivo.set(false);
  }

  /** «Limpiar»: «¿Genera CMN?» vuelve a lo grabado. */
  limpiarMasiva(): void {
    for (const area of this.seleccion()) this.alternar(area.id, 'generaCmn', area.generaCmn);
    this.panelMasivo.set(false);
  }

  /** «Cancelar»: descarta los cambios y la selección y vuelve a solo lectura. */
  cancelarEdicion(): void {
    this.borrador.set(null);
    this.marcadas.set(new Set());
    this.panelMasivo.set(false);
  }

  /** «Grabar» confirmado: actualiza las áreas en edición, vuelve a solo lectura y avisa cuántas fueron. */
  grabar(): void {
    this.modalGrabar.set(false);
    if (!this.cambiadas().length || this.guardando()) return;
    const cambios = Object.values(this.borrador() ?? {}).map(({ id, generaCmn, esAte, esOa, esMaa }) => ({ id, generaCmn, esAte, esOa, esMaa }));
    this.guardando.set(true);
    this.api.guardar(cambios).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cancelarEdicion();
        this.aviso.set(msjGrabado(cambios.length));
        // El servidor aplica las reglas de una sola OA y una sola MAA: se vuelve a leer su resultado.
        this.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  /** Área inactiva del pliego: no se configura; sus commodities/ítems se transfieren a otra área. */
  inactiva(area: AreaUsuaria): boolean {
    return area.activo === false;
  }

  /** Clic en la fila: abre el detalle del área (commodities o ítems); en un área inactiva, «Transferir datos». */
  verDetalle(area: AreaUsuaria): void {
    if (this.editando()) return;
    if (this.inactiva(area)) {
      this.transferir(area);
      return;
    }
    void this.router.navigateByUrl(`${AREAS_USUARIAS_ROUTE}/${area.id}`);
  }

  /** «Más opciones» de la barra. */
  onMasOpciones(accion: string): void {
    const area = this.areaPorTransferir();
    if (accion === 'transferir' && area) this.transferir(area);
  }

  transferir(area: AreaUsuaria): void {
    if (this.editando()) return;
    void this.router.navigateByUrl(`${AREAS_USUARIAS_ROUTE}/${area.id}/transferir`);
  }

  // ─── «Sincronizar»: diálogo «Registros» ────────────────────────

  sincronizar(): void {
    if (this.editando()) return;
    this.disponibles.set([]);
    this.panelAbierto.set(true);
    this.api.disponibles().subscribe((lista) => this.disponibles.set(lista));
  }

  /** «Aceptar»: las unidades elegidas pasan a la lista con «¿Genera CMN?» y la etiqueta «Nuevo». */
  aceptarPanel(ids: string[]): void {
    this.cerrarPanel();
    if (!ids.length) return;
    this.guardando.set(true);
    this.api.incorporar(ids).subscribe({
      next: ({ incorporadas }) => {
        this.guardando.set(false);
        this.aviso.set(`Se sincronizaron ${incorporadas} áreas usuarias`);
        this.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  // ─── Búsqueda y paginación ─────────────────────────────────────

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
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { CatalogosApiService, TipoDocumentoResponse } from '../../../../../core/api/catalogos-api.service';
import { SolicitudResponse, SolicitudesApiService } from '../../../../../core/api/solicitudes-api.service';
import { CurrentUserService } from '../../../../../core/auth/current-user.service';
import { PermissionService } from '../../../../../core/auth/permission.service';
import { ESTADO, MOTIVOS_RECHAZO } from '../../../../../core/models/documento.model';
import { SolicitudesFacadeService } from '../../../../../core/state/solicitudes-facade.service';
import { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { DetailHistoryTabsComponent } from '../../../../../shared/components/detail-history-tabs/detail-history-tabs.component';
import { HistorialSource, buildCurrentComment, buildHistoryEntries } from '../../../../../shared/components/detail-history-tabs/detail-history-tabs.utils';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { RequestApprovalModalsComponent } from '../../../../../shared/components/request-approval-modals/request-approval-modals.component';
import { SelectionColumn, SelectionSideNavComponent } from '../../../../../shared/components/selection-side-nav/selection-side-nav.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudeHeaderState } from '../../../../../shared/components/solicitude-header/solicitude-header.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { TableControlsComponent } from '../../../../../shared/components/table-controls/table-controls.component';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../../shared/ui/action-tracker/action-tracker.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DocumentSummaryCardComponent } from '../../../../../shared/ui/document-summary-card/document-summary-card.component';
import { FlowStatus } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { MessageBoxComponent } from '../../../../../shared/ui/message-box/message-box.component';
import { SnackbarVariant } from '../../../../../shared/ui/snackbar/snackbar.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../../shared/utils/form-snapshot.util';
import { ItemsEstrategicosApiService } from '../../api/items-estrategicos-api.service';
import { PROCESS_ID, PROCESS_ROUTE, REQUEST_SEGMENT } from '../../config/items-estrategicos.rutas';
import {
  CODIGO_DOCUMENTO,
  ETIQUETA_TIPO_ACCION,
  ItemEstrategico,
  ItemEstrategicoCatalogo,
  NOMBRE_DOCUMENTO,
  TIPO_ACCION,
} from '../../models/item-estrategico.model';

/**
 * Solicitud de Ítems Estratégicos (SIE) del CMN, armada sobre el patrón de solicitud del Figma «B.1 Rol Creador»
 * (Registro, Elaborada, Verificada y Observada).
 *
 * El creador elige los ítems del catálogo en «Seleccionar ítems estratégicos» (`siaf-selection-side-nav`), los quita de
 * a uno o en bloque. Con el «+» se abre la tarjeta «Agregar» (Cancelar / Aceptar) y, al aceptar, queda la tabla Año /
 * Cantidad de ítems (Figma «2. Registro de solicitud»); no lleva justificación ni sustento. Grabar: crear la solicitud →
 * guardar los ítems → pasar a ELABORADO (genera el número). El creador edita, verifica o elimina; el aprobador aprueba,
 * observa o rechaza un documento VERIFICADO. Al aprobarse, los ítems pasan a los registros con la vigencia activa.
 */
@Component({
  selector: 'siaf-item-estrategico-request',
  standalone: true,
  imports: [
    ActionTrackerComponent,
    ButtonComponent,
    DetailHistoryTabsComponent,
    DocumentSummaryCardComponent,
    FormTableSearchComponent,
    MessageBoxComponent,
    PaginationComponent,
    RequestApprovalModalsComponent,
    SelectionSideNavComponent,
    SolicitudeFormCardComponent,
    SolicitudeInfoCardComponent,
    SolicitudePageLayoutComponent,
    TableControlsComponent,
  ],
  templateUrl: './item-estrategico-request.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemEstrategicoRequestComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly currentUser = inject(CurrentUserService);
  private readonly permissions = inject(PermissionService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly solicitudesApi = inject(SolicitudesApiService);
  private readonly solicitudesFacade = inject(SolicitudesFacadeService);
  private readonly itemsApi = inject(ItemsEstrategicosApiService);

  readonly heading = NOMBRE_DOCUMENTO;
  readonly tipoAccion = ETIQUETA_TIPO_ACCION;
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, NOMBRE_DOCUMENTO);

  private solicitudId: string | null = null;
  private tiposDocumento: TipoDocumentoResponse[] = [];

  // ── Estado del documento ──────────────────────────────────────────
  /** Última respuesta del backend: de ella salen el estado, los ítems, el historial y la trazabilidad. */
  private readonly solicitud = signal<SolicitudResponse | null>(null);
  readonly estado = computed(() => (this.solicitud()?.estado ?? 'NUEVO').toUpperCase());
  readonly editando = signal(false);
  readonly cargando = signal(false);
  readonly saving = signal(false);

  readonly headerRole = computed<'creator' | 'approver'>(() => (this.permissions.currentRole() === 'approver' ? 'approver' : 'creator'));
  readonly elaborado = computed(() => this.estado() !== 'NUEVO');
  readonly soloLectura = computed(() => this.elaborado() && !this.editando());
  readonly puedeVerificar = computed(() => ['ELABORADO', 'OBSERVADO'].includes(this.estado()));
  readonly numeroDocumento = computed(() => this.solicitud()?.numero ?? '');

  readonly headerState = computed<SolicitudeHeaderState>(() => {
    if (this.editando()) return 'edit';
    switch (this.estado()) {
      case 'APROBADO': return 'approved';
      case 'OBSERVADO': return 'observed';
      case 'RECHAZADO': return 'rejected';
      case 'VERIFICADO': return 'verified';
      case 'ELIMINADO': return 'deleted';
      case 'ELABORADO': return 'elaborated';
      default: return 'new';
    }
  });

  readonly estadoDocumento = computed<FlowStatus>(() => {
    const etiquetas: Record<string, FlowStatus> = {
      APROBADO: ESTADO.APROBADO,
      OBSERVADO: ESTADO.OBSERVADO,
      RECHAZADO: ESTADO.RECHAZADO,
      VERIFICADO: ESTADO.VERIFICADO,
      ELIMINADO: ESTADO.ELIMINADO,
    };
    return etiquetas[this.estado()] ?? ESTADO.ELABORADO;
  });

  // ── Cabecera de la solicitud ──────────────────────────────────────
  readonly camposEntidad = computed<SolicitudeInfoField[]>(() => {
    const usuario = this.currentUser.user();
    return [
      { label: 'Fecha', value: '' },
      { label: 'Entidad', value: (usuario.entidadSiglas ?? usuario.office).toUpperCase() },
    ];
  });

  // ── Ítems de la solicitud ─────────────────────────────────────────
  readonly items = signal<ItemEstrategico[]>([]);
  /** Ítems marcados en la tabla (por código) para quitarlos en bloque. */
  readonly itemsMarcados = signal<Set<string>>(new Set());
  readonly busquedaItems = signal('');
  readonly paginaItems = signal(1);
  readonly filasPorPaginaItems = signal(10);
  readonly opcionesFilasPorPagina = [10, 25, 50];

  readonly itemsFiltrados = computed(() => {
    const texto = this.busquedaItems().trim().toLowerCase();
    if (!texto) return this.items();
    return this.items().filter((i) => i.codigo.includes(texto) || i.descripcion.toLowerCase().includes(texto));
  });
  readonly totalPaginasItems = computed(() => Math.max(1, Math.ceil(this.itemsFiltrados().length / this.filasPorPaginaItems())));
  readonly itemsPaginados = computed(() => {
    const inicio = (this.paginaItems() - 1) * this.filasPorPaginaItems();
    return this.itemsFiltrados().slice(inicio, inicio + this.filasPorPaginaItems());
  });
  readonly paginaItemsCompleta = computed(() => {
    const visibles = this.itemsPaginados();
    return visibles.length > 0 && visibles.every((i) => this.itemsMarcados().has(i.codigo));
  });
  readonly paginaItemsParcial = computed(
    () => this.itemsPaginados().some((i) => this.itemsMarcados().has(i.codigo)) && !this.paginaItemsCompleta(),
  );

  // ── Panel «Seleccionar ítems estratégicos» ────────────────────────
  private readonly catalogo = signal<ItemEstrategicoCatalogo[]>([]);
  readonly panelItemsAbierto = signal(false);
  readonly busquedaPanel = signal('');
  readonly seleccionPanel = signal<string[]>([]);
  readonly paginaPanel = signal(1);
  readonly filasPorPaginaPanel = signal(10);

  readonly columnasPanel: SelectionColumn<ItemEstrategicoCatalogo>[] = [
    { key: 'codigo', label: 'Código', widthClass: 'w-[200px]' },
    { key: 'descripcion', label: 'Descripción' },
  ];

  /** El catálogo sin los ítems que ya están en la solicitud, filtrado por la búsqueda del panel. */
  private readonly catalogoDisponible = computed(() => {
    const enSolicitud = new Set(this.items().map((i) => i.codigo));
    const texto = this.busquedaPanel().trim().toLowerCase();
    return this.catalogo()
      .filter((c) => !enSolicitud.has(c.codigo))
      .filter((c) => !texto || c.codigo.includes(texto) || c.descripcion.toLowerCase().includes(texto));
  });
  readonly totalPaginasPanel = computed(() => Math.max(1, Math.ceil(this.catalogoDisponible().length / this.filasPorPaginaPanel())));
  readonly totalFilasPanel = computed(() => this.catalogoDisponible().length);
  readonly filasPanel = computed(() => {
    const inicio = (this.paginaPanel() - 1) * this.filasPorPaginaPanel();
    return this.catalogoDisponible().slice(inicio, inicio + this.filasPorPaginaPanel());
  });
  // Todas las filas del panel se pueden elegir: ninguna va deshabilitada.
  readonly idsDeshabilitadosPanel = computed<string[]>(() => []);
  private readonly elegiblesPaginaPanel = computed(() => {
    const deshabilitados = new Set(this.idsDeshabilitadosPanel());
    return this.filasPanel().filter((f) => !deshabilitados.has(f.id));
  });
  readonly paginaPanelCompleta = computed(() => {
    const elegibles = this.elegiblesPaginaPanel();
    return elegibles.length > 0 && elegibles.every((f) => this.seleccionPanel().includes(f.id));
  });
  readonly paginaPanelParcial = computed(
    () => this.elegiblesPaginaPanel().some((f) => this.seleccionPanel().includes(f.id)) && !this.paginaPanelCompleta(),
  );

  // ── Modo «Agregar» y tabla Año / Cantidad de ítems (Figma 2. Registro de solicitud) ──
  /** Tarjeta «Agregar»: se eligen y quitan ítems; «Aceptar» los confirma y «Cancelar» vuelve a la lista anterior. */
  readonly modoAgregar = signal(false);
  private respaldoItems: ItemEstrategico[] = [];
  /** Casilla de la única fila de la tabla Año / Cantidad: habilita «Editar». */
  readonly resumenMarcado = signal(false);
  /** Año de la tabla: el siguiente al actual (en 2026 se ve 2027). */
  readonly anioResumen = new Date().getFullYear() + 1;

  // Grabar solo con cambios: la foto se toma al pulsar Editar; sin foto (documento nuevo) se asume que hay cambios.
  private readonly fotoEdicion = signal<string | null>(null);
  private readonly fotoActual = computed(() => crearSnapshotFormulario({ items: this.items().map((i) => i.codigo) }));
  private readonly hayCambios = computed(() => hayCambiosRespectoAlSnapshot(this.fotoEdicion(), this.fotoActual()));

  readonly formValido = computed(() => !this.soloLectura() && !this.modoAgregar() && this.items().length > 0 && this.hayCambios());
  // ── Historial y trazabilidad (del historial de estados) ───────────
  private readonly fuentesHistorial = computed<HistorialSource[]>(() =>
    (this.solicitud()?.historialEstados ?? []).map((h) => ({
      estadoBackend: h.estadoNuevo,
      fechaISO: h.createdAt,
      comentario: h.comentario,
      usuario: h.creador ? `${h.creador.nombres} ${h.creador.apellidoPaterno} ${h.creador.apellidoMaterno}` : '',
      rol: h.perfil?.cfgPerfil?.rol?.nombre ?? '',
    })),
  );
  readonly historial = computed(() => buildHistoryEntries(this.fuentesHistorial()));
  readonly comentarioActual = computed(() => buildCurrentComment(this.estado(), this.fuentesHistorial()));

  readonly trazabilidad = computed<ActionTrackerSummary[]>(() => {
    const historial = this.solicitud()?.historialEstados ?? [];
    // La última vez que pasó por cada estado (tras observar y subsanar, cuenta la verificación nueva).
    const ultimo = (estado: string) => [...historial].reverse().find((h) => h.estadoNuevo === estado);
    const quien = (estado: string, label: string): ActionTrackerSummary => {
      const h = ultimo(estado);
      const nombre = h?.creador ? `${h.creador.nombres} ${h.creador.apellidoPaterno} ${h.creador.apellidoMaterno}` : '';
      return { label, actionBy: nombre.toUpperCase(), date: h ? new Date(h.createdAt).toLocaleString('es-PE') : '' };
    };
    const tercero = this.estado() === 'OBSERVADO'
      ? quien('OBSERVADO', 'Observado por')
      : this.estado() === 'RECHAZADO' ? quien('RECHAZADO', 'Rechazado por') : quien('APROBADO', 'Aprobado por');
    return [quien('ELABORADO', 'Elaborado por'), quien('VERIFICADO', 'Verificado por'), tercero];
  });

  // ── Modales y avisos ──────────────────────────────────────────────
  readonly modalGrabar = signal(false);
  readonly modalVerificar = signal(false);
  readonly modalEliminar = signal(false);
  readonly modalAprobar = signal(false);
  readonly modalObservar = signal(false);
  readonly modalRechazar = signal(false);
  readonly comentario = signal('');
  readonly motivoRechazo = signal('');
  readonly motivosRechazo = [...MOTIVOS_RECHAZO];
  readonly avisoAbierto = signal(false);
  readonly aviso = signal<SnackbarVariant>('creation-elaborated');

  ngOnInit(): void {
    this.catalogosApi.listarTiposDocumento().subscribe((tipos) => (this.tiposDocumento = tipos));
    this.itemsApi.listarCatalogo().subscribe((catalogo) => this.catalogo.set(catalogo));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);

    const estadoNavegacion = history.state as { fromSave?: boolean } | null;
    if (estadoNavegacion?.fromSave) this.mostrarAviso('creation-elaborated');
  }

  // ── Tabla de ítems ────────────────────────────────────────────────
  buscarItems(texto: string): void {
    this.busquedaItems.set(texto);
    this.paginaItems.set(1);
  }

  marcarItem(codigo: string, marcado: boolean): void {
    this.itemsMarcados.update((set) => {
      const next = new Set(set);
      if (marcado) next.add(codigo);
      else next.delete(codigo);
      return next;
    });
  }

  marcarPaginaItems(marcado: boolean): void {
    this.itemsMarcados.update((set) => {
      const next = new Set(set);
      for (const item of this.itemsPaginados()) {
        if (marcado) next.add(item.codigo);
        else next.delete(item.codigo);
      }
      return next;
    });
  }

  quitarItem(codigo: string): void {
    this.items.update((lista) => lista.filter((i) => i.codigo !== codigo));
    this.marcarItem(codigo, false);
    this.ajustarPaginaItems();
  }

  quitarMarcados(): void {
    const marcados = this.itemsMarcados();
    this.items.update((lista) => lista.filter((i) => !marcados.has(i.codigo)));
    this.itemsMarcados.set(new Set());
    this.ajustarPaginaItems();
  }

  paginaItemsAnterior(): void { this.paginaItems.update((p) => Math.max(1, p - 1)); }
  paginaItemsSiguiente(): void { this.paginaItems.update((p) => Math.min(this.totalPaginasItems(), p + 1)); }
  cambiarFilasItems(valor: number): void { this.filasPorPaginaItems.set(valor); this.paginaItems.set(1); }

  /** Tras quitar ítems, la página actual puede quedar vacía. */
  private ajustarPaginaItems(): void {
    this.paginaItems.update((p) => Math.min(p, this.totalPaginasItems()));
  }

  // ── Panel de selección ────────────────────────────────────────────
  abrirPanelItems(): void {
    this.busquedaPanel.set('');
    this.seleccionPanel.set([]);
    this.paginaPanel.set(1);
    this.panelItemsAbierto.set(true);
  }

  buscarEnPanel(texto: string): void {
    this.busquedaPanel.set(texto);
    this.paginaPanel.set(1);
  }

  marcarPaginaPanel(marcado: boolean): void {
    const ids = this.elegiblesPaginaPanel().map((f) => f.id);
    this.seleccionPanel.update((sel) => (marcado ? [...new Set([...sel, ...ids])] : sel.filter((id) => !ids.includes(id))));
  }

  paginaPanelAnterior(): void { this.paginaPanel.update((p) => Math.max(1, p - 1)); }
  paginaPanelSiguiente(): void { this.paginaPanel.update((p) => Math.min(this.totalPaginasPanel(), p + 1)); }
  cambiarFilasPanel(valor: number): void { this.filasPorPaginaPanel.set(valor); this.paginaPanel.set(1); }

  agregarSeleccionados(ids: string[]): void {
    const elegidos = this.catalogo().filter((c) => ids.includes(c.id));
    this.items.update((lista) => [...lista, ...elegidos.map(({ codigo, descripcion }) => ({ codigo, descripcion }))]);
    this.panelItemsAbierto.set(false);
  }

  // ── Formulario ────────────────────────────────────────────────────
  /** «+» de la tarjeta de ítems y «Editar» de la tabla: abre «Agregar» guardando la lista para poder cancelar. */
  abrirAgregar(): void {
    this.respaldoItems = [...this.items()];
    this.itemsMarcados.set(new Set());
    this.busquedaItems.set('');
    this.paginaItems.set(1);
    this.resumenMarcado.set(false);
    this.modoAgregar.set(true);
  }

  cancelarAgregar(): void {
    this.items.set([...this.respaldoItems]);
    this.itemsMarcados.set(new Set());
    this.modoAgregar.set(false);
  }

  aceptarAgregar(): void {
    this.itemsMarcados.set(new Set());
    this.modoAgregar.set(false);
  }
  regresar(): void {
    if (this.editando()) {
      // Cancelar la edición vuelve a los datos grabados.
      this.editando.set(false);
      this.modoAgregar.set(false);
      this.restaurarFormulario(this.solicitud());
      return;
    }
    void this.router.navigate([PROCESS_ROUTE]);
  }

  editar(): void {
    this.editando.set(true);
    this.avisoAbierto.set(false);
    this.fotoEdicion.set(this.fotoActual());
  }

  // ── Grabar ────────────────────────────────────────────────────────
  onConfirmarGrabar(): void {
    this.modalGrabar.set(false);
    const items = this.items();
    const guardarYElaborar = (id: string): Observable<unknown> =>
      this.itemsApi.guardarItems(id, items).pipe(
        switchMap(() => this.solicitudesApi.cambiarEstado(id, { estadoNuevo: 'ELABORADO' })),
      );

    this.saving.set(true);

    if (this.solicitudId) {
      const id = this.solicitudId;
      this.solicitudesApi.actualizar(id, { justificacion: '', organoLinea: this.organo() })
        .pipe(switchMap(() => guardarYElaborar(id)))
        .subscribe({
          next: () => { this.editando.set(false); this.mostrarAviso('creation-elaborated'); this.cargar(id); },
          error: () => this.cargar(id),
        });
      return;
    }

    const tipo = this.tiposDocumento.find((t) => t.codigo === CODIGO_DOCUMENTO);
    if (!tipo) { this.saving.set(false); return; }
    this.solicitudesFacade.crearSolicitud({
      tipoDocumentoId: tipo.id,
      tipoAccion: TIPO_ACCION,
      fechaRequerimiento: new Date().toISOString(),
      organoLinea: this.organo(),
      justificacion: '',
      cuentas: [],
    }).pipe(
      switchMap((creada) => { this.solicitudId = creada.id; return guardarYElaborar(creada.id).pipe(map(() => creada.id)); }),
    ).subscribe({
      next: (id) => { this.saving.set(false); void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, id], { state: { fromSave: true } }); },
      error: () => {
        this.saving.set(false);
        if (this.solicitudId) void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, this.solicitudId]);
      },
    });
  }

  // ── Acciones de estado ────────────────────────────────────────────
  onConfirmarVerificar(): void {
    this.modalVerificar.set(false);
    this.accion((id) => this.solicitudesApi.cambiarEstado(id, { estadoNuevo: 'VERIFICADO' }), 'creation-verified');
  }

  onConfirmarEliminar(): void {
    this.modalEliminar.set(false);
    this.accion((id) => this.solicitudesApi.cambiarEstado(id, { estadoNuevo: 'ELIMINADO' }), 'creation-deleted');
  }

  abrirAprobar(): void { this.comentario.set(''); this.modalAprobar.set(true); }
  abrirObservar(): void { this.comentario.set(''); this.modalObservar.set(true); }
  abrirRechazar(): void { this.comentario.set(''); this.motivoRechazo.set(''); this.modalRechazar.set(true); }

  cerrarModalesAprobador(): void {
    this.modalAprobar.set(false);
    this.modalObservar.set(false);
    this.modalRechazar.set(false);
  }

  onConfirmarAprobar(): void {
    this.modalAprobar.set(false);
    this.accion((id) => this.solicitudesFacade.aprobar(id), 'creation-approved');
  }

  onConfirmarObservar(): void {
    if (!this.comentario().trim()) return;
    this.modalObservar.set(false);
    this.accion((id) => this.solicitudesFacade.observar(id, this.comentario()), 'creation-observed');
  }

  onConfirmarRechazar(): void {
    if (!this.comentario().trim()) return;
    this.modalRechazar.set(false);
    this.accion((id) => this.solicitudesFacade.rechazar(id, this.comentario(), this.motivoRechazo() || undefined), 'creation-rejected');
  }

  /** Verificar, eliminar, aprobar, observar y rechazar: llamar, avisar y recargar. */
  private accion(llamada: (id: string) => Observable<unknown>, aviso: SnackbarVariant): void {
    const id = this.solicitudId;
    if (!id) return;
    this.saving.set(true);
    llamada(id).subscribe({
      next: () => { this.mostrarAviso(aviso); this.cargar(id); },
      error: () => this.saving.set(false),
    });
  }

  private mostrarAviso(variante: SnackbarVariant): void {
    this.aviso.set(variante);
    this.avisoAbierto.set(true);
  }

  private organo(): string {
    return (this.currentUser.user().unidad ?? this.currentUser.office ?? '').toUpperCase();
  }

  // ── Carga ─────────────────────────────────────────────────────────
  private cargar(id: string): void {
    this.cargando.set(true);
    this.solicitudesApi.obtenerDetalle(id).subscribe({
      next: (s) => {
        this.solicitudId = s.id;
        this.solicitud.set(s);
        this.editando.set(false);
        this.fotoEdicion.set(null);
        this.restaurarFormulario(s);
        this.cargando.set(false);
        this.saving.set(false);
      },
      error: () => { this.cargando.set(false); this.saving.set(false); },
    });
  }

  private restaurarFormulario(s: SolicitudResponse | null): void {
    this.items.set([...(s?.detalleItemsEstrategicos?.items ?? [])]);
    this.itemsMarcados.set(new Set());
    this.busquedaItems.set('');
    this.paginaItems.set(1);
    this.modoAgregar.set(false);
    this.resumenMarcado.set(false);
  }
}



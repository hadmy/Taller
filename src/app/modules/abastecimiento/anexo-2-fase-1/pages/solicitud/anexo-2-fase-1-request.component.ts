import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
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
import { RequestApprovalModalsComponent } from '../../../../../shared/components/request-approval-modals/request-approval-modals.component';
import { SelectionColumn, SelectionSideNavComponent } from '../../../../../shared/components/selection-side-nav/selection-side-nav.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudeHeaderRole, SolicitudeHeaderState } from '../../../../../shared/components/solicitude-header/solicitude-header.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { TableControlsComponent } from '../../../../../shared/components/table-controls/table-controls.component';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../../shared/ui/action-tracker/action-tracker.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DocumentSummaryCardComponent } from '../../../../../shared/ui/document-summary-card/document-summary-card.component';
import { FlowStatus } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { LoadingProgressComponent } from '../../../../../shared/ui/loading-progress/loading-progress.component';
import { MessageBoxComponent } from '../../../../../shared/ui/message-box/message-box.component';
import { ReadonlyFieldComponent } from '../../../../../shared/ui/readonly-field/readonly-field.component';
import { SnackbarVariant } from '../../../../../shared/ui/snackbar/snackbar.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../../shared/utils/form-snapshot.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { PROCESS_ID, PROCESS_ROUTE, REQUEST_SEGMENT } from '../../config/anexo-2-fase-1.rutas';
import {
  AreaUsuariaAnexo1,
  CODIGO_DOCUMENTO,
  ContextoAnexo2,
  ETIQUETA_TIPO_ACCION,
  TIPO_ACCION,
  TITULO_SOLICITUD,
} from '../../models/anexo-2-fase-1.model';
import { fechaHora, formatearSoles } from '../../utils/formato.util';

/**
 * Solicitud de CMN - Anexo N.º 02 | Fase 1: Identificación (SA2F1), armada sobre el Figma «A.1 Rol Creador ·
 * 2. Registro de solicitud» (RC-01 y el modal «Seleccionar registros»).
 *
 * Muestra los datos del Anexo 02, el resumen de la consolidación y el marco presupuestario de los tres años del CMN
 * (vienen del backend). El creador elige en «Seleccionar registros» (`siaf-selection-side-nav`) los Anexos 01 de las
 * áreas usuarias que entran al Anexo 02 y los quita de a uno o en bloque. Grabar: crear la solicitud → guardar las
 * áreas → pasar a ELABORADO (genera el número). El creador edita, verifica o elimina; el aprobador aprueba, observa o
 * rechaza un documento VERIFICADO.
 */
@Component({
  selector: 'siaf-anexo-2-fase-1-request',
  standalone: true,
  imports: [
    ActionTrackerComponent,
    ButtonComponent,
    DetailHistoryTabsComponent,
    DocumentSummaryCardComponent,
    LoadingProgressComponent,
    MessageBoxComponent,
    ReadonlyFieldComponent,
    RequestApprovalModalsComponent,
    SelectionSideNavComponent,
    SolicitudeFormCardComponent,
    SolicitudeInfoCardComponent,
    SolicitudePageLayoutComponent,
    TableControlsComponent,
  ],
  templateUrl: './anexo-2-fase-1-request.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Anexo2Fase1RequestComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly currentUser = inject(CurrentUserService);
  private readonly permissions = inject(PermissionService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly solicitudesApi = inject(SolicitudesApiService);
  private readonly solicitudesFacade = inject(SolicitudesFacadeService);
  private readonly anexoApi = inject(Anexo2Fase1ApiService);

  readonly heading = TITULO_SOLICITUD;
  readonly tipoAccion = ETIQUETA_TIPO_ACCION;
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, TITULO_SOLICITUD);
  readonly formatearSoles = formatearSoles;

  private solicitudId: string | null = null;
  private tiposDocumento: TipoDocumentoResponse[] = [];

  // ── Estado del documento ──────────────────────────────────────────
  /** Última respuesta del backend: de ella salen el estado, las áreas, el historial y la trazabilidad. */
  private readonly solicitud = signal<SolicitudResponse | null>(null);
  readonly estado = computed(() => (this.solicitud()?.estado ?? 'NUEVO').toUpperCase());
  readonly editando = signal(false);
  readonly cargando = signal(false);
  readonly saving = signal(false);

  readonly headerRole = computed<SolicitudeHeaderRole>(() => {
    const rol = this.permissions.currentRole();
    return rol === 'approver' || rol === 'reviewer' ? rol : 'creator';
  });
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
      case 'VALIDADO': return 'validated';
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
      VALIDADO: ESTADO.VALIDADO,
      ELIMINADO: ESTADO.ELIMINADO,
    };
    return etiquetas[this.estado()] ?? ESTADO.ELABORADO;
  });

  // ── Contexto del Anexo 02 (datos, resumen y marco presupuestario) ─
  readonly contexto = signal<ContextoAnexo2 | null>(null);

  // Un documento grabado muestra su fecha de creación; uno nuevo, la de apertura (`captureOpenDate`).
  readonly camposCabecera = computed<SolicitudeInfoField[]>(() => [
    { label: 'Fecha', value: fechaHora(this.solicitud()?.createdAt) },
    { label: 'Oficina', value: (this.contexto()?.datos.oficinaAbastecimiento ?? '').toUpperCase() },
  ]);

  readonly camposAnexo = computed(() => {
    const datos = this.contexto()?.datos;
    if (!datos) return [];
    return [
      { caption: 'Entidad', value: datos.entidad },
      { caption: 'Oficina de Abastecimiento', value: datos.oficinaAbastecimiento },
      { caption: 'Referencia presupuestaria', value: datos.referenciaPresupuestaria },
      { caption: 'Fase', value: datos.fase },
      { caption: 'Elaborado por', value: datos.elaboradoPor },
    ];
  });

  readonly tarjetasResumen = computed(() => {
    const r = this.contexto()?.resumen;
    if (!r) return [];
    return [
      { titulo: 'Anexos 01 recibidos', valor: String(r.anexosRecibidos), detalle: 'Aprobados/remitidos por las unidades responsables' },
      { titulo: 'Conformes por OA', valor: String(r.conformes), detalle: 'Incluidos en consolidación' },
      { titulo: 'Observados por OA', valor: String(r.observados), detalle: 'Pendientes de subsanación' },
      { titulo: 'Necesidades', valor: String(r.necesidades), detalle: 'Ítems provenientes de los Anexos 01' },
      { titulo: 'Anexos evaluados por OA', valor: `${r.anexosEvaluados}/${r.anexosRecibidos}`, detalle: 'Conformes u observados' },
    ];
  });

  readonly marcoPresupuestario = computed(() =>
    (this.contexto()?.marcoPresupuestario ?? []).map((m) => ({
      ...m,
      saldo: m.techoPresupuestal - m.consolidadoAnexo1,
      avance: m.techoPresupuestal ? (m.consolidadoAnexo1 / m.techoPresupuestal) * 100 : 0,
    })),
  );

  // ── Áreas usuarias de la solicitud ────────────────────────────────
  readonly areas = signal<AreaUsuariaAnexo1[]>([]);
  /** Áreas marcadas en la tabla (por id) para quitarlas en bloque. */
  readonly areasMarcadas = signal<Set<string>>(new Set());
  readonly paginaAreas = signal(1);
  readonly filasPorPaginaAreas = 25;

  readonly totalPaginasAreas = computed(() => Math.max(1, Math.ceil(this.areas().length / this.filasPorPaginaAreas)));
  readonly areasPaginadas = computed(() => {
    const inicio = (this.paginaAreas() - 1) * this.filasPorPaginaAreas;
    return this.areas().slice(inicio, inicio + this.filasPorPaginaAreas);
  });
  readonly paginaAreasCompleta = computed(() => {
    const visibles = this.areasPaginadas();
    return visibles.length > 0 && visibles.every((a) => this.areasMarcadas().has(a.id));
  });
  readonly paginaAreasParcial = computed(
    () => this.areasPaginadas().some((a) => this.areasMarcadas().has(a.id)) && !this.paginaAreasCompleta(),
  );
  readonly totalItems = computed(() => this.areas().reduce((total, a) => total + a.items, 0));
  readonly totalMonto = computed(() => this.areas().reduce((total, a) => total + a.montoProgramado, 0));

  // ── Panel «Seleccionar registros» ──────────────────────────────────
  readonly panelAbierto = signal(false);
  readonly busquedaPanel = signal('');
  readonly seleccionPanel = signal<string[]>([]);
  readonly paginaPanel = signal(1);
  readonly filasPorPaginaPanel = signal(25);
  readonly opcionesFilasPorPagina = [10, 25, 50];

  readonly columnasPanel: SelectionColumn<AreaUsuariaAnexo1>[] = [
    { key: 'nombre', label: 'Áreas usuarias' },
    { key: 'items', label: 'Ítems', widthClass: 'w-[140px]' },
    { key: 'montoProgramado', label: 'Monto programado A01', widthClass: 'w-[240px]', render: (a) => formatearSoles(a.montoProgramado) },
  ];

  private readonly areasDisponibles = computed(() => {
    const texto = this.busquedaPanel().trim().toLowerCase();
    const recibidas = this.contexto()?.areas ?? [];
    return texto ? recibidas.filter((a) => a.nombre.toLowerCase().includes(texto)) : recibidas;
  });
  readonly totalFilasPanel = computed(() => this.areasDisponibles().length);
  readonly totalPaginasPanel = computed(() => Math.max(1, Math.ceil(this.totalFilasPanel() / this.filasPorPaginaPanel())));
  readonly filasPanel = computed(() => {
    const inicio = (this.paginaPanel() - 1) * this.filasPorPaginaPanel();
    return this.areasDisponibles().slice(inicio, inicio + this.filasPorPaginaPanel());
  });
  readonly paginaPanelCompleta = computed(() => {
    const filas = this.filasPanel();
    return filas.length > 0 && filas.every((f) => this.seleccionPanel().includes(f.id));
  });
  readonly paginaPanelParcial = computed(
    () => this.filasPanel().some((f) => this.seleccionPanel().includes(f.id)) && !this.paginaPanelCompleta(),
  );

  // Grabar solo con cambios: la foto se toma al pulsar Editar; sin foto (documento nuevo) se asume que hay cambios.
  private readonly fotoEdicion = signal<string | null>(null);
  private readonly fotoActual = computed(() => crearSnapshotFormulario({ areas: this.areas().map((a) => a.id) }));
  private readonly hayCambios = computed(() => hayCambiosRespectoAlSnapshot(this.fotoEdicion(), this.fotoActual()));

  readonly formValido = computed(() => !this.soloLectura() && this.areas().length > 0 && this.hayCambios());

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
    return [quien('ELABORADO', 'Elaborado por'), quien('VERIFICADO', 'Verificado por'), quien('VALIDADO', 'Validado por'), tercero];
  });

  // ── Modales y avisos ──────────────────────────────────────────────
  readonly modalGrabar = signal(false);
  readonly modalVerificar = signal(false);
  readonly modalEliminar = signal(false);
  readonly modalValidar = signal(false);
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
    this.anexoApi.obtenerContexto().subscribe((contexto) => this.contexto.set(contexto));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);

    const estadoNavegacion = history.state as { fromSave?: boolean } | null;
    if (estadoNavegacion?.fromSave) this.mostrarAviso('creation-elaborated');
  }

  // ── Tabla de áreas ────────────────────────────────────────────────
  marcarArea(id: string, marcada: boolean): void {
    this.areasMarcadas.update((set) => {
      const next = new Set(set);
      if (marcada) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  marcarPaginaAreas(marcada: boolean): void {
    this.areasMarcadas.update((set) => {
      const next = new Set(set);
      for (const area of this.areasPaginadas()) {
        if (marcada) next.add(area.id);
        else next.delete(area.id);
      }
      return next;
    });
  }

  quitarArea(id: string): void {
    this.areas.update((lista) => lista.filter((a) => a.id !== id));
    this.marcarArea(id, false);
    this.ajustarPaginaAreas();
  }

  quitarMarcadas(): void {
    const marcadas = this.areasMarcadas();
    this.areas.update((lista) => lista.filter((a) => !marcadas.has(a.id)));
    this.areasMarcadas.set(new Set());
    this.ajustarPaginaAreas();
  }

  paginaAreasAnterior(): void { this.paginaAreas.update((p) => Math.max(1, p - 1)); }
  paginaAreasSiguiente(): void { this.paginaAreas.update((p) => Math.min(this.totalPaginasAreas(), p + 1)); }

  /** Tras quitar áreas, la página actual puede quedar vacía. */
  private ajustarPaginaAreas(): void {
    this.paginaAreas.update((p) => Math.min(p, this.totalPaginasAreas()));
  }

  // ── Panel de selección ────────────────────────────────────────────
  /** Abre «Seleccionar registros» con las áreas que ya están en la solicitud marcadas. */
  abrirPanel(): void {
    this.busquedaPanel.set('');
    this.seleccionPanel.set(this.areas().map((a) => a.id));
    this.paginaPanel.set(1);
    this.panelAbierto.set(true);
  }

  buscarEnPanel(texto: string): void {
    this.busquedaPanel.set(texto);
    this.paginaPanel.set(1);
  }

  marcarPaginaPanel(marcada: boolean): void {
    const ids = this.filasPanel().map((f) => f.id);
    this.seleccionPanel.update((sel) => (marcada ? [...new Set([...sel, ...ids])] : sel.filter((id) => !ids.includes(id))));
  }

  paginaPanelAnterior(): void { this.paginaPanel.update((p) => Math.max(1, p - 1)); }
  paginaPanelSiguiente(): void { this.paginaPanel.update((p) => Math.min(this.totalPaginasPanel(), p + 1)); }
  cambiarFilasPanel(valor: number): void { this.filasPorPaginaPanel.set(valor); this.paginaPanel.set(1); }

  /** «Aceptar»: la solicitud queda con las áreas elegidas, en el orden de los Anexos 01 recibidos. */
  aceptarSeleccion(ids: string[]): void {
    this.areas.set((this.contexto()?.areas ?? []).filter((a) => ids.includes(a.id)));
    this.areasMarcadas.set(new Set());
    this.paginaAreas.set(1);
    this.panelAbierto.set(false);
  }

  // ── Formulario ────────────────────────────────────────────────────
  regresar(): void {
    if (this.editando()) {
      // Cancelar la edición vuelve a los datos grabados.
      this.editando.set(false);
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
    const areas = this.areas();
    const guardarYElaborar = (id: string): Observable<unknown> =>
      this.anexoApi.guardarAreas(id, areas).pipe(
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

  abrirValidar(): void { this.comentario.set(''); this.modalValidar.set(true); }
  abrirAprobar(): void { this.comentario.set(''); this.modalAprobar.set(true); }
  abrirObservar(): void { this.comentario.set(''); this.modalObservar.set(true); }
  abrirRechazar(): void { this.comentario.set(''); this.motivoRechazo.set(''); this.modalRechazar.set(true); }

  cerrarModalesAprobador(): void {
    this.modalValidar.set(false);
    this.modalAprobar.set(false);
    this.modalObservar.set(false);
    this.modalRechazar.set(false);
  }

  onConfirmarValidar(): void {
    if (!this.comentario().trim()) return;
    this.modalValidar.set(false);
    this.accion((id) => this.solicitudesFacade.validar(id, this.comentario()), 'creation-validated');
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
    this.areas.set([...(s?.detalleAnexo2Fase1?.areas ?? [])]);
    this.areasMarcadas.set(new Set());
    this.paginaAreas.set(1);
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
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
import { SolicitudeHeaderRole, SolicitudeHeaderState } from '../../../../../shared/components/solicitude-header/solicitude-header.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { TableControlsComponent } from '../../../../../shared/components/table-controls/table-controls.component';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../../shared/ui/action-tracker/action-tracker.component';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { BadgeComponent } from '../../../../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DocumentSummaryCardComponent } from '../../../../../shared/ui/document-summary-card/document-summary-card.component';
import { FlowStatus } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { LoadingProgressComponent } from '../../../../../shared/ui/loading-progress/loading-progress.component';
import { MessageBoxComponent } from '../../../../../shared/ui/message-box/message-box.component';
import { ReadonlyFieldComponent } from '../../../../../shared/ui/readonly-field/readonly-field.component';
import { SnackbarVariant } from '../../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent } from '../../../../../shared/ui/status-tag/status-tag.component';
import { TabItem, TabsComponent } from '../../../../../shared/ui/tabs/tabs.component';
import { ModalComponent } from '../../../../../shared/ui/modal/modal.component';
import { SideNavComponent } from '../../../../../shared/ui/side-nav/side-nav.component';
import { TextAreaControlComponent } from '../../../../../shared/ui/text-area-control/text-area-control.component';
import { TooltipDirective } from '../../../../../shared/ui/tooltip/tooltip.directive';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../../shared/utils/form-snapshot.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { Anexo1PanelComponent } from '../../components/anexo-1-panel.component';
import { ConsolidadoAnexo2TablaComponent } from '../../components/consolidado-anexo-2-tabla.component';
import { DetalleResumen, ResumenDetallePanelComponent } from '../../components/resumen-detalle-panel.component';
import { DESDE_ESCRITORIO, ESCRITORIO_ROUTE, PROCESS_ID, PROCESS_ROUTE, REQUEST_SEGMENT } from '../../config/anexo-2-fase-1.rutas';
import {
  AreaUsuariaAnexo1,
  CODIGO_DOCUMENTO,
  ContextoAnexo2,
  ConsolidadoAnexo2,
  ETIQUETA_TIPO_ACCION,
  FASES_CMN,
  FaseCmn,
  TIPO_ACCION,
  faseCmn,
} from '../../models/anexo-2-fase-1.model';
import { ESTILO_EVALUACION_ANEXO_1 } from '../../utils/evaluacion-anexo-1.util';
import { fechaHora, formatearSoles } from '../../utils/formato.util';

/** Largo máximo del comentario de observación (Figma «Observar registro»: 0/200). */
const MAX_COMENTARIO = 200;

/** Estados en que la OA todavía evalúa los Anexos 01 (la solicitud sigue en manos del creador). */
const ESTADOS_EVALUACION = ['ELABORADO', 'OBSERVADO'];

/**
 * Solicitud de CMN - Anexo N.º 02 | Fase 1: Identificación (SA2F1), armada sobre el Figma «A.1 Rol Creador ·
 * 2. Registro de solicitud» (RC-01 y el modal «Seleccionar registros»).
 *
 * Muestra los datos del Anexo 02, el resumen de la consolidación y el marco presupuestario de los tres años del CMN
 * (vienen del backend). El creador elige en «Seleccionar registros» (`siaf-selection-side-nav`) los Anexos 01 de las
 * áreas usuarias que entran al Anexo 02 y los quita de a uno o en bloque. Grabar: crear la solicitud → guardar las
 * áreas → pasar a ELABORADO (genera el número). El creador edita, verifica o elimina; el aprobador aprueba, observa o
 * rechaza un documento VERIFICADO.
 *
 * La tabla «Registros» (Figma «A.1 Rol Creador · 3. detalle items») muestra el estado de la evaluación de cada Anexo 01
 * y su observación. Con la solicitud grabada en ELABORADO u OBSERVADO, la OA marca filas y las evalúa en bloque:
 * «Completo» (con confirmación, `siaf-modal`) u «Observar» (`siaf-side-nav` con comentario obligatorio); solo cuentan
 * los Anexos 01 pendientes. El ícono de documento de cada fila abre el panel «Anexo N° 01» con sus ítems.
 */
@Component({
  selector: 'siaf-anexo-2-fase-1-request',
  standalone: true,
  imports: [
    ActionTrackerComponent,
    Anexo1PanelComponent,
    ResumenDetallePanelComponent,
    ConsolidadoAnexo2TablaComponent,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    DetailHistoryTabsComponent,
    DocumentSummaryCardComponent,
    FormTableSearchComponent,
    LoadingProgressComponent,
    MessageBoxComponent,
    ModalComponent,
    PaginationComponent,
    ReadonlyFieldComponent,
    RequestApprovalModalsComponent,
    SelectionSideNavComponent,
    SideNavComponent,
    SolicitudeFormCardComponent,
    SolicitudeInfoCardComponent,
    SolicitudePageLayoutComponent,
    StatusTagComponent,
    TableControlsComponent,
    TabsComponent,
    TextAreaControlComponent,
    TooltipDirective,
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

  /**
   * Fase del CMN de la solicitud: al crear, la de la ruta (`data.fase`: Fase 2 y Fase 3 tienen la suya); una solicitud
   * grabada, la que guardó. Cambia el título, las migas de pan y el campo «Fase»; el resto de la pantalla es igual.
   */
  readonly fase = signal<FaseCmn>(1);
  readonly heading = computed(() => FASES_CMN[this.fase()].titulo);
  readonly tipoAccion = ETIQUETA_TIPO_ACCION;
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, this.heading()));
  readonly formatearSoles = formatearSoles;

  private solicitudId: string | null = null;
  /** Se entró desde el escritorio de CMN Programación (`?desde=escritorio`): la flecha de regreso vuelve ahí. */
  private desdeEscritorio = false;
  /** Query params que conservan el origen al pasar de la solicitud nueva a la grabada. */
  private paramsOrigen(): Record<string, string> | undefined {
    return this.desdeEscritorio ? { ...DESDE_ESCRITORIO } : undefined;
  }
  private tiposDocumento: TipoDocumentoResponse[] = [];

  // ── Pestañas de la tarjeta de registros ───────────────────────────
  readonly pestanasRegistros: TabItem[] = [
    { id: 'evaluacion', label: 'Evaluación de Anexos 01' },
    { id: 'consolidado', label: 'Consolidado Anexo 02' },
  ];
  readonly pestanaRegistros = signal<'evaluacion' | 'consolidado'>('evaluacion');
  readonly consolidado = signal<ConsolidadoAnexo2 | null>(null);
  readonly cargandoConsolidado = signal(false);
  /** El consolidado sale del backend: solo hay uno cuando la solicitud ya está grabada. */
  readonly tieneSolicitud = computed(() => !!this.solicitud()?.id);

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
  /** En edición, solo sin cambios por grabar: verificar los descartaría. */
  readonly puedeVerificar = computed(
    () => ['ELABORADO', 'OBSERVADO'].includes(this.estado()) && !(this.editando() && this.hayCambios()) && this.anexosPendientes() === 0,
  );
  /**
   * Anexos 01 de la solicitud aún sin evaluar. La OA los evalúa (Completo o Incompleto) antes de verificar: mientras
   * quede alguno, «Verificar» está deshabilitado y un aviso dice cuántos faltan.
   */
  readonly anexosPendientes = computed(() => this.areas().filter((a) => a.estadoEvaluacion === 'Pendiente').length);
  readonly avisoEvaluarAntesDeVerificar = computed(() => {
    const n = this.anexosPendientes();
    // Solo para quien evalúa (el creador, con la solicitud en ELABORADO u OBSERVADO).
    if (!this.puedeEvaluar() || n === 0) return '';
    return n === 1
      ? 'Falta evaluar 1 Anexo 01. Márquelo como Completo o Incompleto para poder verificar la solicitud.'
      : `Faltan evaluar ${n} Anexos 01. Márquelos como Completo o Incompleto para poder verificar la solicitud.`;
  });
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
      // Cada fase tiene su referencia: APM 2025 (Fase 1), APM 2026 (Fase 2) y PIA 2026 (Fase 3).
      { caption: 'Referencia presupuestaria', value: FASES_CMN[this.fase()].referenciaPresupuestaria },
      { caption: 'Fase', value: FASES_CMN[this.fase()].etiqueta },
      { caption: 'Elaborado por', value: datos.elaboradoPor },
    ];
  });

  /**
   * «Resumen del proceso de consolidación»: se calcula de las áreas usuarias de la solicitud (no de un dato fijo),
   * así que se actualiza al agregar o quitar áreas y al marcar Anexos 01 como Completo o Incompleto. Cada tarjeta
   * guarda las áreas que cuenta, que se ven en su panel de detalle al pulsarla.
   */
  readonly tarjetasResumen = computed(() => {
    const areas = this.areas();
    const conformes = areas.filter((a) => a.estadoEvaluacion === 'Completo');
    const observados = areas.filter((a) => a.estadoEvaluacion === 'Incompleto');
    const evaluados = areas.filter((a) => a.estadoEvaluacion !== 'Pendiente');
    const necesidades = areas.reduce((suma, a) => suma + a.items, 0);
    return [
      { titulo: 'Anexos 01 recibidos', valor: String(areas.length), detalle: 'Aprobados/remitidos por las unidades responsables', areas },
      { titulo: 'Completos por la OA', valor: String(conformes.length), detalle: 'Incluidos en consolidación', areas: conformes },
      { titulo: 'Incompletos por la OA', valor: String(observados.length), detalle: 'Pendientes de subsanación', areas: observados },
      { titulo: 'Total de necesidades', valor: String(necesidades), detalle: 'Necesidades provenientes de los Anexos 01', areas },
      { titulo: 'Anexos evaluados por OA', valor: `${evaluados.length}/${areas.length}`, detalle: 'Completos o incompletos', areas: evaluados },
    ];
  });

  /** Tarjeta del resumen abierta en su panel de detalle (por título; `null` con el panel cerrado). */
  private readonly tarjetaAbierta = signal<string | null>(null);
  /** Detalle de la tarjeta abierta, recalculado con las áreas actuales mientras el panel sigue abierto. */
  readonly detalleResumen = computed<DetalleResumen | null>(() => {
    const tarjeta = this.tarjetasResumen().find((t) => t.titulo === this.tarjetaAbierta());
    return tarjeta ? { titulo: tarjeta.titulo, descripcion: tarjeta.detalle, areas: tarjeta.areas } : null;
  });

  abrirDetalleResumen(titulo: string): void {
    this.tarjetaAbierta.set(titulo);
  }

  cerrarDetalleResumen(): void {
    this.tarjetaAbierta.set(null);
  }

  readonly marcoPresupuestario = computed(() =>
    (this.contexto()?.marcoPresupuestario ?? []).map((m) => ({
      ...m,
      saldo: m.techoPresupuestal - m.consolidadoAnexo1,
      avance: m.techoPresupuestal ? (m.consolidadoAnexo1 / m.techoPresupuestal) * 100 : 0,
    })),
  );

  // ── Áreas usuarias de la solicitud ────────────────────────────────
  readonly areas = signal<AreaUsuariaAnexo1[]>([]);
  /**
   * Áreas usuarias con Anexo 01 recibido que aún no están en la solicitud: su número va en el contador de la lupa
   * «Seleccionar registros» y su aviso en el tooltip, así se nota cuando llegan áreas nuevas por agregar.
   */
  readonly areasPorAgregar = computed(() => {
    const enSolicitud = new Set(this.areas().map((a) => a.id));
    return (this.contexto()?.areas ?? []).filter((a) => !enSolicitud.has(a.id));
  });
  readonly avisoAreasPorAgregar = computed(() => {
    const n = this.areasPorAgregar().length;
    if (n === 0) return 'Todas las áreas usuarias ya están agregadas';
    return n === 1 ? 'Tienes 1 área usuaria pendiente por agregar' : `Tienes ${n} áreas usuarias pendientes por agregar`;
  });
  /** Áreas marcadas en la tabla (por id) para quitarlas o evaluarlas en bloque. */
  readonly areasMarcadas = signal<Set<string>>(new Set());
  readonly paginaAreas = signal(1);
  readonly filasPorPaginaAreas = signal(25);
  readonly busquedaAreas = signal('');
  /** Etiqueta de la evaluación del Anexo 01 (Figma «3. detalle items»). */
  readonly estiloEvaluacion = ESTILO_EVALUACION_ANEXO_1;
  /** El Anexo 01 de un área se ve (modal) y se evalúa cuando ya está grabada en la solicitud y no hay cambios sin grabar. */
  readonly puedeVerDetalle = computed(() => !!this.solicitud()?.id && !(this.editando() && this.hayCambios()));
  private readonly areasGrabadas = computed(() => new Set((this.solicitud()?.detalleAnexo2Fase1?.areas ?? []).map((a) => a.id)));
  readonly areaConDetalle = (areaId: string): boolean => this.puedeVerDetalle() && this.areasGrabadas().has(areaId);

  /** Completo / Incompleto en bloque: el creador, con la solicitud en ELABORADO u OBSERVADO y sin cambios por grabar. */
  readonly puedeEvaluar = computed(
    () => this.headerRole() === 'creator' && ESTADOS_EVALUACION.includes(this.estado()) && this.puedeVerDetalle(),
  );
  /** Marcar filas: para quitarlas (al registrar o editar) o para evaluarlas. */
  readonly puedeMarcarAreas = computed(() => !this.soloLectura() || this.puedeEvaluar());
  /** Las áreas marcadas que todavía se pueden evaluar (Anexo 01 pendiente y ya grabado). */
  readonly pendientesMarcadas = computed(() =>
    this.areas().filter((a) => this.areasMarcadas().has(a.id) && a.estadoEvaluacion === 'Pendiente' && this.areasGrabadas().has(a.id)),
  );

  // ── Panel «Anexo N° 01», «Completo» y «Observar registro» ────────
  readonly anexoAbierto = signal<{ solicitudId: string; areaId: string } | null>(null);
  readonly modalConformes = signal(false);
  readonly panelObservar = signal(false);
  readonly evaluando = signal(false);
  readonly maxComentario = MAX_COMENTARIO;
  readonly comentarioRegistros = signal('');
  readonly comentarioValido = computed(() => {
    const texto = this.comentarioRegistros().trim();
    return texto.length > 0 && texto.length <= MAX_COMENTARIO;
  });

  readonly areasFiltradas = computed(() => {
    const texto = this.busquedaAreas().trim().toLowerCase();
    return texto ? this.areas().filter((a) => a.nombre.toLowerCase().includes(texto)) : this.areas();
  });

  readonly totalPaginasAreas = computed(() => Math.max(1, Math.ceil(this.areasFiltradas().length / this.filasPorPaginaAreas())));
  readonly areasPaginadas = computed(() => {
    const inicio = (this.paginaAreas() - 1) * this.filasPorPaginaAreas();
    return this.areasFiltradas().slice(inicio, inicio + this.filasPorPaginaAreas());
  });
  readonly paginaAreasCompleta = computed(() => {
    const visibles = this.areasPaginadas();
    return visibles.length > 0 && visibles.every((a) => this.areasMarcadas().has(a.id));
  });
  readonly paginaAreasParcial = computed(
    () => this.areasPaginadas().some((a) => this.areasMarcadas().has(a.id)) && !this.paginaAreasCompleta(),
  );

  // ── Panel «Seleccionar registros» ──────────────────────────────────
  readonly panelAbierto = signal(false);
  readonly busquedaPanel = signal('');
  readonly seleccionPanel = signal<string[]>([]);
  readonly paginaPanel = signal(1);
  readonly filasPorPaginaPanel = signal(25);
  readonly opcionesFilasPorPagina = [10, 25, 50];

  readonly columnasPanel: SelectionColumn<AreaUsuariaAnexo1>[] = [
    { key: 'nombre', label: 'Áreas usuarias' },
    { key: 'items', label: 'Necesidades', widthClass: 'w-[140px]' },
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
    this.fase.set(faseCmn(this.route.snapshot.data['fase']));
    this.desdeEscritorio = this.route.snapshot.queryParamMap.get('desde') === DESDE_ESCRITORIO.desde;
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

  quitarMarcadas(): void {
    const marcadas = this.areasMarcadas();
    this.areas.update((lista) => lista.filter((a) => !marcadas.has(a.id)));
    this.areasMarcadas.set(new Set());
    this.ajustarPaginaAreas();
  }

  buscarAreas(texto: string): void {
    this.busquedaAreas.set(texto);
    this.paginaAreas.set(1);
  }

  cambiarFilasAreas(valor: number): void {
    this.filasPorPaginaAreas.set(valor);
    this.paginaAreas.set(1);
  }

  paginaAreasAnterior(): void { this.paginaAreas.update((p) => Math.max(1, p - 1)); }
  paginaAreasSiguiente(): void { this.paginaAreas.update((p) => Math.min(this.totalPaginasAreas(), p + 1)); }

  /** Tras quitar áreas, la página actual puede quedar vacía. */
  private ajustarPaginaAreas(): void {
    this.paginaAreas.update((p) => Math.min(p, this.totalPaginasAreas()));
  }

  /** Abre el panel «Anexo N° 01» del área usuaria. */
  verAnexo1(areaId: string): void {
    const id = this.solicitudId;
    if (!id || !this.areaConDetalle(areaId)) return;
    this.anexoAbierto.set({ solicitudId: id, areaId });
  }

  abrirObservarRegistros(): void {
    this.comentarioRegistros.set('');
    this.panelObservar.set(true);
  }

  confirmarConformes(): void {
    this.modalConformes.set(false);
    this.evaluarMarcadas({ estado: 'Completo' }, 'record-complete');
  }

  confirmarObservacion(): void {
    if (!this.comentarioValido()) return;
    this.panelObservar.set(false);
    this.evaluarMarcadas({ estado: 'Incompleto', comentario: this.comentarioRegistros().trim() }, 'record-incomplete');
  }

  /** Evalúa los Anexos 01 pendientes marcados con la misma respuesta, recarga la solicitud y muestra el aviso. */
  private evaluarMarcadas(evaluacion: { estado: 'Completo' | 'Incompleto'; comentario?: string }, aviso: SnackbarVariant): void {
    const id = this.solicitudId;
    const areas = this.pendientesMarcadas();
    if (!id || areas.length === 0) return;
    this.evaluando.set(true);
    forkJoin(areas.map((a) => this.anexoApi.evaluarAnexo1(id, a.id, evaluacion))).subscribe({
      next: () => { this.evaluando.set(false); this.mostrarAviso(aviso); this.cargar(id); },
      error: () => { this.evaluando.set(false); this.cargar(id); },
    });
  }

  /** Quita un área usuaria desde el ícono de su fila. */
  quitarArea(id: string): void {
    this.areas.update((lista) => lista.filter((a) => a.id !== id));
    this.marcarArea(id, false);
    this.ajustarPaginaAreas();
  }

  // ── Panel de selección ────────────────────────────────────────────
  /** Abre «Seleccionar registros» con las áreas que ya están en la solicitud marcadas. */
  /** Cambia de pestaña; al abrir «Consolidado Anexo 02» lo pide de nuevo, así refleja la última evaluación. */
  cambiarPestanaRegistros(id: string): void {
    const pestana = id === 'consolidado' ? 'consolidado' : 'evaluacion';
    this.pestanaRegistros.set(pestana);
    const solicitudId = this.solicitud()?.id;
    if (pestana !== 'consolidado' || !solicitudId) return;
    this.cargandoConsolidado.set(true);
    this.anexoApi.obtenerConsolidado(solicitudId).subscribe({
      next: (c) => { this.consolidado.set(c); this.cargandoConsolidado.set(false); },
      error: () => { this.consolidado.set(null); this.cargandoConsolidado.set(false); },
    });
  }

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
    // Vuelve a donde se entró: el escritorio de CMN Programación o «Documentos y registros».
    void this.router.navigate([this.desdeEscritorio ? ESCRITORIO_ROUTE : PROCESS_ROUTE]);
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
      this.anexoApi.guardarAreas(id, areas, this.fase()).pipe(
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
      next: (id) => {
        this.saving.set(false);
        void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, id], { state: { fromSave: true }, queryParams: this.paramsOrigen() });
      },
      error: () => {
        this.saving.set(false);
        if (this.solicitudId) void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, this.solicitudId], { queryParams: this.paramsOrigen() });
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
    if (s) this.fase.set(faseCmn(s.detalleAnexo2Fase1?.fase));
    this.areas.set([...(s?.detalleAnexo2Fase1?.areas ?? [])]);
    this.areasMarcadas.set(new Set());
    this.busquedaAreas.set('');
    this.paginaAreas.set(1);
  }
}

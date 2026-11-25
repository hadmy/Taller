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
import { DetailHistoryTabsComponent } from '../../../../../shared/components/detail-history-tabs/detail-history-tabs.component';
import { HistorialSource, buildCurrentComment, buildHistoryEntries } from '../../../../../shared/components/detail-history-tabs/detail-history-tabs.utils';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { RequestApprovalModalsComponent } from '../../../../../shared/components/request-approval-modals/request-approval-modals.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { SolicitudeHeaderRole, SolicitudeHeaderState } from '../../../../../shared/components/solicitude-header/solicitude-header.component';
import { SolicitudeInfoCardComponent, SolicitudeInfoField } from '../../../../../shared/components/solicitude-info-card/solicitude-info-card.component';
import { SolicitudePageLayoutComponent } from '../../../../../shared/components/solicitude-page-layout/solicitude-page-layout.component';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../../shared/ui/action-tracker/action-tracker.component';
import { AlertComponent, AlertTone } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { DocumentSummaryCardComponent } from '../../../../../shared/ui/document-summary-card/document-summary-card.component';
import { FlowStatus } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../../../../shared/ui/modal/modal.component';
import { ReadonlyFieldComponent } from '../../../../../shared/ui/readonly-field/readonly-field.component';
import { SnackbarVariant } from '../../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent } from '../../../../../shared/ui/status-tag/status-tag.component';
import { TabItem, TabsComponent } from '../../../../../shared/ui/tabs/tabs.component';
import { TooltipDirective } from '../../../../../shared/ui/tooltip/tooltip.directive';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../../shared/utils/form-snapshot.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { ConsolidadoAnexo2TablaComponent } from '../../components/consolidado-anexo-2-tabla.component';
import { NecesidadesAreaPanelComponent } from '../../components/necesidades-area-panel.component';
import { PROCESS_ID, PROCESS_ROUTE, REQUEST_SEGMENT } from '../../config/anexo-2-fase-1.rutas';
import {
  AreaModificacion,
  CODIGO_DOCUMENTO,
  ConsolidadoAnexo2,
  DatosAnexo2,
  ETIQUETA_MODIFICACION,
  FASES_CMN,
  FaseCmn,
  ModificacionAnexo2,
  TIPO_ACCION_MODIFICACION,
  VigenteAnexo2,
  faseCmn,
} from '../../models/anexo-2-fase-1.model';
import { fechaCorta, fechaHora, formatearSoles } from '../../utils/formato.util';
import {
  ESTILO_AREA_MODIFICACION,
  areaModificada,
  cambiosDe,
  estadoArea,
  montoNuevo,
  montoVigente,
  resumenModificacion,
} from '../../utils/modificacion-anexo-2.util';

/** Estado del backend → estado de la cabecera de la solicitud. */
const ESTADO_CABECERA: Record<string, SolicitudeHeaderState> = {
  ELABORADO: 'elaborated',
  VERIFICADO: 'verified',
  VALIDADO: 'validated',
  OBSERVADO: 'observed',
  APROBADO: 'approved',
  RECHAZADO: 'rejected',
  ELIMINADO: 'deleted',
};

/**
 * Modificación del Anexo 02 vigente de una fase del CMN (Figma «B. Acción de modificación», roles B.1, B.2 y B.3).
 *
 * - **Creador**: parte del Anexo 02 aprobado; cambia las necesidades de las áreas usuarias que siguen en plazo
 *   (`siaf-necesidades-area-panel`) o las quita, graba y verifica. Sin cambios respecto de lo vigente no se puede grabar.
 * - **Evaluador**: valida, observa o rechaza lo verificado. **Aprobador**: aprueba, observa o rechaza lo validado.
 * - Al aprobar, el registro de la fase queda con los cambios; si se rechaza, el Anexo 02 vigente no cambia.
 */
@Component({
  selector: 'siaf-anexo-2-modificacion',
  standalone: true,
  imports: [
    ActionTrackerComponent,
    AlertComponent,
    ButtonComponent,
    ConsolidadoAnexo2TablaComponent,
    DetailHistoryTabsComponent,
    DocumentSummaryCardComponent,
    FormTableSearchComponent,
    IconComponent,
    ModalComponent,
    NecesidadesAreaPanelComponent,
    ReadonlyFieldComponent,
    RequestApprovalModalsComponent,
    SolicitudeFormCardComponent,
    SolicitudeInfoCardComponent,
    SolicitudePageLayoutComponent,
    StatusTagComponent,
    TabsComponent,
    TooltipDirective,
  ],
  templateUrl: './anexo-2-modificacion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Anexo2ModificacionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly currentUser = inject(CurrentUserService);
  private readonly permissions = inject(PermissionService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly solicitudesApi = inject(SolicitudesApiService);
  private readonly solicitudesFacade = inject(SolicitudesFacadeService);
  private readonly anexoApi = inject(Anexo2Fase1ApiService);

  readonly tipoAccion = ETIQUETA_MODIFICACION;
  readonly soles = formatearSoles;
  readonly fechaCorta = fechaCorta;
  readonly estadoArea = estadoArea;
  readonly estiloArea = ESTILO_AREA_MODIFICACION;
  readonly montoVigente = montoVigente;
  readonly montoNuevo = montoNuevo;
  readonly modificada = areaModificada;

  readonly fase = signal<FaseCmn>(1);
  readonly heading = computed(() => FASES_CMN[this.fase()].titulo);
  readonly breadcrumbs = computed(() => buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, this.heading()));

  private solicitudId: string | null = null;
  private tiposDocumento: TipoDocumentoResponse[] = [];

  // ── Documento ─────────────────────────────────────────────────────
  private readonly solicitud = signal<SolicitudResponse | null>(null);
  readonly modificacion = signal<ModificacionAnexo2 | null>(null);
  readonly vigente = signal<VigenteAnexo2 | null>(null);
  private readonly datos = signal<DatosAnexo2 | null>(null);
  readonly cargando = signal(true);
  readonly saving = signal(false);
  readonly editando = signal(false);

  readonly estado = computed(() => (this.solicitud()?.estado ?? 'NUEVO').toUpperCase());
  readonly elaborado = computed(() => this.estado() !== 'NUEVO');
  readonly numeroDocumento = computed(() => this.solicitud()?.numero ?? '');
  readonly headerRole = computed<SolicitudeHeaderRole>(() => {
    const rol = this.permissions.currentRole();
    return rol === 'approver' || rol === 'reviewer' ? rol : 'creator';
  });
  readonly headerState = computed<SolicitudeHeaderState>(() => (this.editando() ? 'edit' : ESTADO_CABECERA[this.estado()] ?? 'new'));
  readonly estadoDocumento = computed<FlowStatus>(() => {
    const clave = this.estado() as keyof typeof ESTADO;
    return (ESTADO[clave] as FlowStatus | undefined) ?? ESTADO.ELABORADO;
  });

  /** No hay Anexo 02 aprobado que modificar, u otra modificación de la fase está en curso. */
  readonly bloqueo = computed<{ titulo: string; descripcion: string; solicitudId?: string } | null>(() => {
    const v = this.vigente();
    if (this.elaborado() || !v) return null;
    if (v.enProceso) {
      return {
        titulo: 'Ya hay una modificación en curso',
        descripcion: `La modificación N° ${v.enProceso.numero} de la ${FASES_CMN[this.fase()].etiqueta} está en estado ${this.etiqueta(v.enProceso.estado)}. Termine su flujo antes de registrar otra.`,
        solicitudId: v.enProceso.id,
      };
    }
    if (!v.modificacion) {
      return {
        titulo: 'No hay un Anexo 02 para modificar',
        descripcion: `La ${FASES_CMN[this.fase()].etiqueta} aún no tiene un Anexo 02 aprobado. Regístrelo primero como Creación.`,
      };
    }
    return null;
  });

  readonly soloLectura = computed(() => (this.elaborado() && !this.editando()) || !!this.bloqueo());

  readonly avisoDocumento = computed<{ tono: AlertTone; titulo: string; texto: string }>(() => {
    const base = `Anexo 02 N° ${this.modificacion()?.base.numero ?? ''} vigente`;
    const comentario = this.comentarioActual()?.texto ?? '';
    switch (this.estado()) {
      case 'VERIFICADO':
        return { tono: 'info', titulo: 'Modificación verificada', texto: `Modifica el ${base}. Las áreas con el ícono de lápiz cambian; el Evaluador OA valida, observa o rechaza.` };
      case 'VALIDADO':
        return { tono: 'info', titulo: 'Modificación validada', texto: `Modifica el ${base}. El Aprobador OA aprueba, observa o rechaza.` };
      case 'OBSERVADO':
        return { tono: 'warning', titulo: 'Modificación observada', texto: comentario || 'Corrija la modificación y vuelva a verificarla.' };
      case 'APROBADO':
        return { tono: 'success', titulo: 'Modificación aprobada', texto: `El registro de la ${FASES_CMN[this.fase()].etiqueta} se actualizó con estos cambios.` };
      case 'RECHAZADO':
        return { tono: 'error', titulo: 'Modificación rechazada', texto: `El ${base} no cambia. ${comentario}`.trim() };
      case 'ELABORADO':
        return { tono: 'info', titulo: 'Modificación elaborada', texto: `Modifica el ${base}. Verifíquela para enviarla al Evaluador OA.` };
      default:
        return { tono: 'info', titulo: 'Modificación del Anexo 02', texto: `Parte del ${base}. Modifique o quite las necesidades de las áreas usuarias que siguen en plazo.` };
    }
  });

  readonly camposCabecera = computed<SolicitudeInfoField[]>(() => [
    { label: 'Fecha', value: fechaHora(this.solicitud()?.createdAt) },
    { label: 'Oficina', value: (this.datos()?.oficinaAbastecimiento ?? '').toUpperCase() },
  ]);

  readonly camposVigente = computed(() => {
    const base = this.modificacion()?.base;
    return [
      { caption: 'N° de documento', value: base?.numero ?? '—' },
      { caption: 'Fecha de aprobación', value: base ? fechaHora(base.fechaAprobacion) : '—' },
      { caption: 'Fase', value: FASES_CMN[this.fase()].etiqueta },
      { caption: 'Entidad', value: this.datos()?.entidad ?? '—' },
      { caption: 'Referencia presupuestaria', value: FASES_CMN[this.fase()].referenciaPresupuestaria },
      { caption: 'Tipo de modificación', value: 'Datos del Anexo 02' },
    ];
  });

  // ── Áreas usuarias ────────────────────────────────────────────────
  readonly areas = signal<AreaModificacion[]>([]);
  readonly busqueda = signal('');
  readonly areasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return texto ? this.areas().filter((a) => a.nombre.toLowerCase().includes(texto)) : this.areas();
  });
  readonly resumen = computed(() => resumenModificacion(this.areas()));
  readonly tarjetas = computed(() => {
    const r = this.resumen();
    return [
      { titulo: 'Áreas modificadas', valor: String(r.modificadas), detalle: `${r.necesidades} ${r.necesidades === 1 ? 'necesidad cambia' : 'necesidades cambian'}` },
      { titulo: 'Áreas quitadas', valor: String(r.quitadas), detalle: 'Salen del Anexo 02' },
      { titulo: 'Monto vigente', valor: formatearSoles(r.vigente), detalle: 'Anexo 02 aprobado' },
      { titulo: 'Monto con la modificación', valor: formatearSoles(r.nuevo), detalle: 'Si se aprueba' },
      { titulo: 'Variación', valor: `${r.variacion > 0 ? '+ ' : r.variacion < 0 ? '- ' : ''}${formatearSoles(Math.abs(r.variacion))}`, detalle: 'Respecto del vigente' },
    ];
  });
  readonly areasQueQuedan = computed(() => this.areas().filter((a) => !a.quitada).length);
  readonly puedeCambiar = (area: AreaModificacion): boolean => !this.soloLectura() && !area.soloLectura;

  // Consolidado del Anexo 02 con la modificación: lo arma el backend con lo grabado.
  readonly pestanas: TabItem[] = [
    { id: 'areas', label: 'Áreas usuarias' },
    { id: 'consolidado', label: 'Consolidado Anexo 02' },
  ];
  readonly pestana = signal<'areas' | 'consolidado'>('areas');
  readonly consolidado = signal<ConsolidadoAnexo2 | null>(null);
  readonly cargandoConsolidado = signal(false);

  readonly areaAbierta = signal<AreaModificacion | null>(null);
  readonly areaPorQuitar = signal<AreaModificacion | null>(null);

  // Grabar solo con cambios: frente al Anexo 02 vigente y frente a lo último grabado.
  private readonly foto = signal<string | null>(null);
  private readonly fotoActual = computed(() => crearSnapshotFormulario({ cambios: cambiosDe(this.areas()) }));
  private readonly hayCambiosPorGrabar = computed(() => hayCambiosRespectoAlSnapshot(this.foto(), this.fotoActual()));
  readonly sinCambios = computed(() => cambiosDe(this.areas()).length === 0);
  readonly formValido = computed(() => !this.soloLectura() && !this.sinCambios() && this.hayCambiosPorGrabar());
  readonly puedeVerificar = computed(
    () => ['ELABORADO', 'OBSERVADO'].includes(this.estado()) && !(this.editando() && this.hayCambiosPorGrabar()),
  );

  // ── Historial y trazabilidad ──────────────────────────────────────
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
    const historial = [...(this.solicitud()?.historialEstados ?? [])].reverse();
    const quien = (estado: string, label: string): ActionTrackerSummary => {
      const h = historial.find((x) => x.estadoNuevo === estado);
      const nombre = h?.creador ? `${h.creador.nombres} ${h.creador.apellidoPaterno} ${h.creador.apellidoMaterno}` : '';
      return { label, actionBy: nombre.toUpperCase(), date: h ? new Date(h.createdAt).toLocaleString('es-PE') : '' };
    };
    const finales: Record<string, string> = { OBSERVADO: 'Observado por', RECHAZADO: 'Rechazado por' };
    const ultimo = finales[this.estado()] ? quien(this.estado(), finales[this.estado()]) : quien('APROBADO', 'Aprobado por');
    return [quien('ELABORADO', 'Elaborado por'), quien('VERIFICADO', 'Verificado por'), quien('VALIDADO', 'Validado por'), ultimo];
  });

  // ── Modales y avisos ──────────────────────────────────────────────
  readonly modalGrabar = signal(false);
  readonly modalCancelar = signal(false);
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
  readonly avisoTono = signal<'success' | 'error'>('success');
  readonly avisoMensaje = signal('');

  ngOnInit(): void {
    this.catalogosApi.listarTiposDocumento().subscribe((tipos) => (this.tiposDocumento = tipos));
    this.anexoApi.obtenerContexto().subscribe((contexto) => this.datos.set(contexto.datos));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargar(id);
    } else {
      this.fase.set(faseCmn(this.route.snapshot.data['fase']));
      this.anexoApi.obtenerVigente(this.fase()).subscribe({
        next: (vigente) => {
          this.vigente.set(vigente);
          this.ponerModificacion(vigente.modificacion);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
    }
    if ((history.state as { fromSave?: boolean } | null)?.fromSave) this.mostrarAviso('creation-elaborated');
  }

  cambiarPestana(id: string): void {
    this.pestana.set(id === 'consolidado' ? 'consolidado' : 'areas');
    if (id !== 'consolidado' || !this.solicitudId) return;
    this.cargandoConsolidado.set(true);
    this.anexoApi.obtenerConsolidado(this.solicitudId).subscribe({
      next: (c) => { this.consolidado.set(c); this.cargandoConsolidado.set(false); },
      error: () => { this.consolidado.set(null); this.cargandoConsolidado.set(false); },
    });
  }

  // ── Áreas ─────────────────────────────────────────────────────────
  abrirArea(area: AreaModificacion): void {
    this.areaAbierta.set(area);
  }

  aceptarArea(area: AreaModificacion): void {
    this.reemplazar(area);
    this.areaAbierta.set(null);
    this.mostrarMensaje(`Se modificaron las necesidades de ${area.nombre}`);
  }

  pedirQuitar(area: AreaModificacion): void {
    if (this.puedeCambiar(area) && this.areasQueQuedan() > 1) this.areaPorQuitar.set(area);
  }

  confirmarQuitar(): void {
    const area = this.areaPorQuitar();
    this.areaPorQuitar.set(null);
    if (!area) return;
    this.reemplazar({ ...area, quitada: true });
    this.mostrarMensaje(`Se quitaron las necesidades de ${area.nombre}`);
  }

  /** Vuelve el área a como está en el Anexo 02 vigente. */
  deshacer(area: AreaModificacion): void {
    this.reemplazar({ ...area, quitada: false, items: area.items.map((i) => ({ ...i, monto: i.montoVigente })) });
  }

  private reemplazar(area: AreaModificacion): void {
    this.areas.update((lista) => lista.map((a) => (a.id === area.id ? area : a)));
  }

  // ── Formulario ────────────────────────────────────────────────────
  regresar(): void {
    if (!this.soloLectura() && !this.sinCambios() && this.hayCambiosPorGrabar()) {
      this.modalCancelar.set(true);
      return;
    }
    this.salir();
  }

  confirmarCancelar(): void {
    this.modalCancelar.set(false);
    this.salir();
  }

  /** En edición vuelve a lo grabado; si no, a donde se entró. */
  private salir(): void {
    if (this.editando()) {
      this.editando.set(false);
      this.ponerModificacion(this.modificacion());
      return;
    }
    void this.router.navigate([PROCESS_ROUTE]);
  }

  editar(): void {
    this.editando.set(true);
    this.avisoAbierto.set(false);
    this.foto.set(this.fotoActual());
  }

  verEnCurso(id: string): void {
    void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, id]);
  }

  onConfirmarGrabar(): void {
    this.modalGrabar.set(false);
    const modificacion = this.modificacion();
    if (!modificacion || !this.formValido()) return;
    const cuerpo = { fase: this.fase(), baseId: modificacion.base.documentoId, areas: cambiosDe(this.areas()) };
    const guardarYElaborar = (id: string): Observable<unknown> =>
      this.anexoApi.guardarModificacion(id, cuerpo).pipe(switchMap(() => this.solicitudesApi.cambiarEstado(id, { estadoNuevo: 'ELABORADO' })));
    this.saving.set(true);

    if (this.solicitudId) {
      const id = this.solicitudId;
      guardarYElaborar(id).subscribe({
        next: () => { this.editando.set(false); this.mostrarAviso('creation-elaborated'); this.cargar(id); },
        error: (err) => this.mostrarError(err),
      });
      return;
    }

    const tipo = this.tiposDocumento.find((t) => t.codigo === CODIGO_DOCUMENTO);
    if (!tipo) { this.saving.set(false); return; }
    this.solicitudesFacade.crearSolicitud({
      tipoDocumentoId: tipo.id,
      tipoAccion: TIPO_ACCION_MODIFICACION,
      fechaRequerimiento: new Date().toISOString(),
      organoLinea: (this.currentUser.user().unidad ?? this.currentUser.office ?? '').toUpperCase(),
      justificacion: '',
      cuentas: [],
    }).pipe(
      switchMap((creada) => guardarYElaborar(creada.id).pipe(map(() => creada.id))),
    ).subscribe({
      next: (id) => {
        this.saving.set(false);
        void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, id], { state: { fromSave: true } });
      },
      error: (err) => this.mostrarError(err),
    });
  }

  // ── Acciones de estado ────────────────────────────────────────────
  onConfirmarVerificar(): void {
    this.modalVerificar.set(false);
    this.accion((id) => this.solicitudesApi.cambiarEstado(id, { estadoNuevo: 'VERIFICADO' }), 'modification-verified');
  }

  onConfirmarEliminar(): void {
    this.modalEliminar.set(false);
    this.accion((id) => this.solicitudesApi.cambiarEstado(id, { estadoNuevo: 'ELIMINADO' }), 'modification-deleted');
  }

  abrir(modal: { set(valor: boolean): void }): void {
    this.comentario.set('');
    this.motivoRechazo.set('');
    modal.set(true);
  }

  cerrarModalesRespuesta(): void {
    for (const modal of [this.modalValidar, this.modalAprobar, this.modalObservar, this.modalRechazar]) modal.set(false);
  }

  onConfirmarValidar(): void {
    if (!this.comentario().trim()) return;
    this.cerrarModalesRespuesta();
    this.accion((id) => this.solicitudesFacade.validar(id, this.comentario()), 'creation-validated');
  }

  onConfirmarAprobar(): void {
    this.cerrarModalesRespuesta();
    this.accion((id) => this.solicitudesFacade.aprobar(id), 'modification-approved');
  }

  onConfirmarObservar(): void {
    if (!this.comentario().trim()) return;
    this.cerrarModalesRespuesta();
    this.accion((id) => this.solicitudesFacade.observar(id, this.comentario()), 'modification-observed');
  }

  onConfirmarRechazar(): void {
    if (!this.comentario().trim()) return;
    this.cerrarModalesRespuesta();
    this.accion((id) => this.solicitudesFacade.rechazar(id, this.comentario(), this.motivoRechazo() || undefined), 'modification-rejected');
  }

  private accion(llamada: (id: string) => Observable<unknown>, aviso: SnackbarVariant): void {
    const id = this.solicitudId;
    if (!id) return;
    this.saving.set(true);
    llamada(id).subscribe({
      next: () => { this.mostrarAviso(aviso); this.cargar(id); },
      error: (err) => this.mostrarError(err),
    });
  }

  // ── Avisos ────────────────────────────────────────────────────────
  private mostrarAviso(variante: SnackbarVariant): void {
    this.aviso.set(variante);
    this.avisoTono.set('success');
    this.avisoMensaje.set('');
    this.avisoAbierto.set(true);
  }

  private mostrarMensaje(texto: string): void {
    this.mostrarAviso('custom');
    this.avisoMensaje.set(texto);
  }

  private mostrarError(err: { error?: { message?: string } } | null): void {
    this.saving.set(false);
    this.mostrarAviso('custom');
    this.avisoTono.set('error');
    this.avisoMensaje.set(err?.error?.message ?? 'No se pudo completar la acción.');
  }

  // ── Carga ─────────────────────────────────────────────────────────
  private cargar(id: string): void {
    this.cargando.set(true);
    this.solicitudesApi.obtenerDetalle(id).pipe(
      switchMap((s) => this.anexoApi.obtenerModificacion(id).pipe(map((m) => ({ s, m })))),
    ).subscribe({
      next: ({ s, m }) => {
        this.solicitudId = s.id;
        this.solicitud.set(s);
        this.fase.set(m.fase);
        this.editando.set(false);
        this.ponerModificacion(m);
        this.cargando.set(false);
        this.saving.set(false);
      },
      error: () => { this.cargando.set(false); this.saving.set(false); },
    });
  }

  private ponerModificacion(m: ModificacionAnexo2 | null): void {
    this.modificacion.set(m);
    this.areas.set(m?.areas ?? []);
    this.busqueda.set('');
    this.pestana.set('areas');
    this.foto.set(null);
  }

  private etiqueta(estado: string): string {
    return ESTADO[estado as keyof typeof ESTADO] ?? estado;
  }
}

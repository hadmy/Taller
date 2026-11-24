import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { PermissionService } from '../../../../../core/auth/permission.service';
import { respondeSolicitudes } from '../../../../../core/auth/role.model';
import { ESTADO } from '../../../../../core/models/documento.model';
import { SolicitudesFacadeService } from '../../../../../core/state/solicitudes-facade.service';
import { SolicitudesStateService } from '../../../../../core/state/solicitudes-state.service';
import { DocumentsRecordsPageComponent } from '../../../../../shared/components/documents-records-page/documents-records-page.component';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import type { DocumentsQuery, DocumentsRecordsConfig, DocumentsRecordsRow } from '../../../../../shared/types/documents-records.types';
import { createNewDocumentIdsSignal } from '../../../../../shared/utils/new-document-ids.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { HistorialRegistroPanelComponent } from '../../components/historial-registro-panel.component';
import { NOMBRE_PROCESO, REQUEST_ROUTE } from '../../config/anexo-2-fase-1.rutas';
import { CMN_PROGRAMACION_DOCUMENTS_CONFIG } from '../../config/cmn-programacion-documents.config';
import {
  CODIGO_DOCUMENTO,
  FASES_CMN,
  NOMBRE_DOCUMENTO,
  ProgramadoAnio,
  RegistroAnexo2,
  etiquetaTipoAccion,
  nombreDocumentoFase,
  nombreRegistroFase,
} from '../../models/anexo-2-fase-1.model';
import { formatearSoles } from '../../utils/formato.util';

/** Entidad como en el Figma: «011 - Ministerio de Educación» (el estado la trae como «siglas nombre»). */
function entidadConCodigo(codigo: string, entidad: string): string {
  if (!entidad) return '—';
  const nombre = entidad.includes(' ') ? entidad.slice(entidad.indexOf(' ') + 1) : entidad;
  return codigo ? `${codigo} - ${nombre}` : nombre;
}

/** Fecha como en el Figma: «19/08/2026» (el estado la trae como «19/8/2026»). */
function fechaDosDigitos(fecha: string): string {
  return fecha.split('/').map((parte) => parte.padStart(2, '0')).join('/');
}

/** Celda «Programado» de un año: el monto, el presupuesto de la fase (APM o PIA), el avance y el saldo. */
function filaProgramado(registro: RegistroAnexo2, p: ProgramadoAnio): [string, string][] {
  const clave = `programado${p.anio}`;
  const referencia = FASES_CMN[registro.fase].referenciaPresupuestaria.split(' ')[0];
  return [
    [clave, formatearSoles(p.monto)],
    [`${clave}Techo`, `${referencia}: ${formatearSoles(p.techo)}`],
    [`${clave}Avance`, String(p.techo ? (p.monto / p.techo) * 100 : 0)],
    [`${clave}Saldo`, `Saldo: ${formatearSoles(p.techo - p.monto)}`],
  ];
}

/**
 * «Documentos y registros» de CMN Programación (Figma «A.2-OA-EV-009»). La pantalla entera la arma
 * `siaf-documents-records-page`: esta página carga la bandeja (solicitudes del Anexo N.º 02) y los registros (uno por
 * fase con Anexo 02 aprobado) y los pasa como filas. El reloj de un registro abre sus versiones aprobadas.
 */
@Component({
  selector: 'siaf-cmn-programacion-documents',
  standalone: true,
  imports: [AlertComponent, DocumentsRecordsPageComponent, HistorialRegistroPanelComponent],
  template: `
    <siaf-documents-records-page
      [config]="pageConfig()"
      [loading]="cargando()"
      (documentsQueryChange)="onDocumentsQuery($event)"
      (recordHistoryOpened)="abrirHistorial($event)"
    >
      <siaf-alert
        records-header
        class="mb-siaf-md block"
        tone="info"
        title="Un registro por fase"
        description="Cada Anexo 02 aprobado es un registro. Una modificación aprobada actualiza ese mismo registro y queda en su historial."
      />
    </siaf-documents-records-page>
    <siaf-historial-registro-panel [registro]="registroAbierto()" (closed)="registroAbierto.set(null)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmnProgramacionDocumentsComponent implements OnInit {
  private readonly solicitudesState = inject(SolicitudesStateService);
  private readonly solicitudesFacade = inject(SolicitudesFacadeService);
  private readonly permissions = inject(PermissionService);
  private readonly anexoApi = inject(Anexo2Fase1ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nuevos = createNewDocumentIdsSignal();

  private readonly registros = signal<RegistroAnexo2[]>([]);
  readonly cargando = signal(true);
  readonly registroAbierto = signal<RegistroAnexo2 | null>(null);

  ngOnInit(): void {
    // Bandeja según el rol (el aprobador además refresca cada 30 s), solo con las solicitudes del Anexo N.º 02.
    this.solicitudesFacade.iniciarBandeja(this.permissions.currentRole(), this.destroyRef, [CODIGO_DOCUMENTO], { page: 1, limit: 10 });
    this.anexoApi.listarRegistros().subscribe({
      next: (registros) => { this.registros.set(registros); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  /** Búsqueda y paginación de la pestaña Documentos (Enter, lupa o cambio de página). */
  onDocumentsQuery(q: DocumentsQuery): void {
    const query = { search: q.search, page: q.page, limit: q.limit };
    if (respondeSolicitudes(this.permissions.currentRole())) this.solicitudesFacade.cargarBandejaAprobador([CODIGO_DOCUMENTO], query);
    else this.solicitudesFacade.cargarBandejaCreador([CODIGO_DOCUMENTO], query);
  }

  abrirHistorial(fila: DocumentsRecordsRow): void {
    this.registroAbierto.set(this.registros().find((r) => r.id === fila['recordId']) ?? null);
  }

  readonly pageConfig = computed((): DocumentsRecordsConfig => {
    const solicitudes = respondeSolicitudes(this.permissions.currentRole())
      ? this.solicitudesState.bandejaAprobador()
      : this.solicitudesState.bandejaCreador();
    const nuevos = this.nuevos();

    const documentRows: DocumentsRecordsRow[] = solicitudes.map((s) => {
      const validado = [...s.historial].reverse().find((h) => h.estado === ESTADO.VALIDADO);
      const aprobado = [...s.historial].reverse().find((h) => h.estado === ESTADO.APROBADO);
      return {
        document: s.faseCmn ? nombreDocumentoFase(s.faseCmn) : s.tipoDocumento,
        documentId: s.id,
        isNew: nuevos.has(s.id),
        number: s.numero || '—',
        actionType: etiquetaTipoAccion(s.tipoAccion),
        status: s.estado,
        system: NOMBRE_PROCESO,
        date: fechaDosDigitos(s.fecha),
        entity: entidadConCodigo(s.entidadCodigo, s.entidad),
        creator: s.creador,
        requesterArea: s.unidad,
        evaluationDate: validado?.fecha ?? '—',
        evaluationUser: validado?.usuario ?? '—',
        approvalDate: aprobado?.fecha ?? '—',
        approvalUser: aprobado?.usuario ?? '—',
        linkRoute: `${REQUEST_ROUTE}/${s.id}`,
      };
    });

    const recordRows: DocumentsRecordsRow[] = this.registros().map((r) => ({
      recordId: r.id,
      numeroRegistro: r.numero,
      registro: nombreRegistroFase(r.fase),
      fase: FASES_CMN[r.fase].etiqueta,
      necesidades: `${r.necesidades} consolidadas`,
      areas: String(r.areas),
      estado: 'Activo',
      ...Object.fromEntries(r.programado.flatMap((p) => filaProgramado(r, p))),
      fechaRegistro: fechaDosDigitos(new Date(r.fechaAprobacion).toLocaleDateString('es-PE')),
      document: NOMBRE_DOCUMENTO,
      documentId: r.documentoId,
    }));

    return {
      ...CMN_PROGRAMACION_DOCUMENTS_CONFIG,
      documentRows,
      recordRows,
      serverQuery: { total: this.solicitudesState.bandejaTotal() },
    };
  });
}

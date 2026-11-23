import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { PermissionService } from '../../../../../core/auth/permission.service';
import { respondeSolicitudes } from '../../../../../core/auth/role.model';
import { ESTADO } from '../../../../../core/models/documento.model';
import { SolicitudesFacadeService } from '../../../../../core/state/solicitudes-facade.service';
import { SolicitudesStateService } from '../../../../../core/state/solicitudes-state.service';
import { DocumentsRecordsPageComponent } from '../../../../../shared/components/documents-records-page/documents-records-page.component';
import type { DocumentsQuery, DocumentsRecordsConfig, DocumentsRecordsRow } from '../../../../../shared/types/documents-records.types';
import { createNewDocumentIdsSignal } from '../../../../../shared/utils/new-document-ids.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { NOMBRE_PROCESO, REQUEST_ROUTE } from '../../config/anexo-2-fase-1.rutas';
import { CMN_PROGRAMACION_DOCUMENTS_CONFIG } from '../../config/cmn-programacion-documents.config';
import { CODIGO_DOCUMENTO, ETIQUETA_TIPO_ACCION, NOMBRE_DOCUMENTO, RegistroAnexo2, TIPO_ACCION } from '../../models/anexo-2-fase-1.model';
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

/**
 * «Documentos y registros» de CMN Programación (Figma «A.2-OA-EV-009»). La pantalla entera la arma
 * `siaf-documents-records-page`: esta página carga la bandeja (solicitudes del Anexo N.º 02) y las áreas usuarias de
 * los anexos aprobados (registros) y los pasa como filas.
 */
@Component({
  selector: 'siaf-cmn-programacion-documents',
  standalone: true,
  imports: [DocumentsRecordsPageComponent],
  template: `
    <siaf-documents-records-page
      [config]="pageConfig()"
      [loading]="cargando()"
      (documentsQueryChange)="onDocumentsQuery($event)"
    />
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

  readonly pageConfig = computed((): DocumentsRecordsConfig => {
    const solicitudes = respondeSolicitudes(this.permissions.currentRole())
      ? this.solicitudesState.bandejaAprobador()
      : this.solicitudesState.bandejaCreador();
    const nuevos = this.nuevos();

    const documentRows: DocumentsRecordsRow[] = solicitudes.map((s) => {
      const validado = [...s.historial].reverse().find((h) => h.estado === ESTADO.VALIDADO);
      const aprobado = [...s.historial].reverse().find((h) => h.estado === ESTADO.APROBADO);
      return {
        document: s.tipoDocumento,
        documentId: s.id,
        isNew: nuevos.has(s.id),
        number: s.numero || '—',
        actionType: s.tipoAccion === TIPO_ACCION ? ETIQUETA_TIPO_ACCION : s.tipoAccion,
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
      area: r.area,
      items: String(r.items),
      monto: formatearSoles(r.montoProgramado),
      fechaRegistro: fechaDosDigitos(new Date(r.fechaAprobacion).toLocaleDateString('es-PE')),
      // Para el historial del registro: la solicitud que lo incluyó.
      document: NOMBRE_DOCUMENTO,
      documentId: r.documentoId,
      number: r.numeroDocumento,
      actionType: ETIQUETA_TIPO_ACCION,
      linkRoute: `${REQUEST_ROUTE}/${r.documentoId}`,
    }));

    return {
      ...CMN_PROGRAMACION_DOCUMENTS_CONFIG,
      documentRows,
      recordRows,
      serverQuery: { total: this.solicitudesState.bandejaTotal() },
    };
  });
}

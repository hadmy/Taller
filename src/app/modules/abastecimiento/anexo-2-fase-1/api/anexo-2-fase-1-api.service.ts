import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import {
  AreaUsuariaAnexo1,
  ConsolidadoAnexo2,
  ContextoAnexo2,
  DetalleAnexo1,
  EvaluacionAnexo1Request,
  FaseCmn,
  GuardarModificacionRequest,
  ModificacionAnexo2,
  RegistroAnexo2,
  SolicitudEscritorioCmn,
  VigenteAnexo2,
} from '../models/anexo-2-fase-1.model';

/**
 * Endpoints propios de la Solicitud de CMN - Anexo N.º 02 (Fase 1). En el taller los responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class Anexo2Fase1ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  /** Datos del Anexo 02, resumen de la consolidación, marco presupuestario y Anexos 01 recibidos. */
  obtenerContexto(): Observable<ContextoAnexo2> {
    return this.http.get<ContextoAnexo2>(`${this.base}/cmn/anexo-2-fase-1/contexto`);
  }

  /** Un registro por Anexo 02 aprobado de cada fase: pestaña Registros de CMN Programación. */
  listarRegistros(): Observable<RegistroAnexo2[]> {
    return this.http.get<RegistroAnexo2[]>(`${this.base}/cmn/anexo-2-fase-1/registros`);
  }

  /** Anexo 02 vigente de la fase y lo que se puede modificar; avisa si ya hay una modificación en curso. */
  obtenerVigente(fase: FaseCmn): Observable<VigenteAnexo2> {
    return this.http.get<VigenteAnexo2>(`${this.base}/cmn/anexo-2/vigente`, { params: { fase } });
  }

  /** Modificación grabada en una solicitud: lo vigente al registrarla y lo que cambia. */
  obtenerModificacion(solicitudId: string): Observable<ModificacionAnexo2> {
    return this.http.get<ModificacionAnexo2>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/modificacion`);
  }

  /** Guarda (o reemplaza) los cambios de una solicitud de Modificación. */
  guardarModificacion(solicitudId: string, cambios: GuardarModificacionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/modificacion`, cambios);
  }

  /** «Bandeja de solicitudes» del escritorio de CMN Programación: las solicitudes del Anexo N.º 02 de la entidad. */
  listarEscritorio(): Observable<SolicitudEscritorioCmn[]> {
    return this.http.get<SolicitudEscritorioCmn[]>(`${this.base}/cmn/anexo-2/escritorio`);
  }

  /** Guarda (o reemplaza) las áreas usuarias incluidas en la solicitud, con la fase del CMN de la solicitud. */
  guardarAreas(solicitudId: string, areas: AreaUsuariaAnexo1[], fase: FaseCmn = 1): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1`, { areas, fase });
  }

  /** «Anexo N° 01» (panel lateral): el área usuaria de la solicitud, sus ítems y si todavía se puede evaluar. */
  obtenerDetalleAnexo1(solicitudId: string, areaId: string): Observable<DetalleAnexo1> {
    return this.http.get<DetalleAnexo1>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/areas/${areaId}`);
  }

  /** «Consolidado del Anexo N.º 02» de la solicitud (los Anexos 01 ya revisados por la OA). */
  obtenerConsolidado(solicitudId: string): Observable<ConsolidadoAnexo2> {
    return this.http.get<ConsolidadoAnexo2>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/consolidado`);
  }

  /** «Completo» / «Incompleto» del Anexo 01 de un área usuaria. */
  evaluarAnexo1(solicitudId: string, areaId: string, evaluacion: EvaluacionAnexo1Request): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/areas/${areaId}/evaluacion`,
      evaluacion,
    );
  }
}

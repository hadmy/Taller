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
  RegistroAnexo2,
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

  /** Áreas usuarias de los Anexos 02 aprobados: pestaña Registros de CMN Programación. */
  listarRegistros(): Observable<RegistroAnexo2[]> {
    return this.http.get<RegistroAnexo2[]>(`${this.base}/cmn/anexo-2-fase-1/registros`);
  }

  /** Guarda (o reemplaza) las áreas usuarias incluidas en la solicitud. */
  guardarAreas(solicitudId: string, areas: AreaUsuariaAnexo1[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1`, { areas });
  }

  /** «Detalle del Anexo 1»: el área usuaria de la solicitud, sus ítems y si todavía se puede evaluar. */
  obtenerDetalleAnexo1(solicitudId: string, areaId: string): Observable<DetalleAnexo1> {
    return this.http.get<DetalleAnexo1>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/areas/${areaId}`);
  }

  /** «Consolidado del Anexo N.º 02» de la solicitud (los Anexos 01 ya revisados por la OA). */
  obtenerConsolidado(solicitudId: string): Observable<ConsolidadoAnexo2> {
    return this.http.get<ConsolidadoAnexo2>(`${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/consolidado`);
  }

  /** «Conforme» / «No conforme» del Anexo 01 de un área usuaria. */
  evaluarAnexo1(solicitudId: string, areaId: string, evaluacion: EvaluacionAnexo1Request): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/solicitudes/${solicitudId}/anexo-2-fase-1/areas/${areaId}/evaluacion`,
      evaluacion,
    );
  }
}

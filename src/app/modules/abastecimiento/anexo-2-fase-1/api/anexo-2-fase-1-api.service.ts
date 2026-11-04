import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { AreaUsuariaAnexo1, ContextoAnexo2, RegistroAnexo2 } from '../models/anexo-2-fase-1.model';

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
}

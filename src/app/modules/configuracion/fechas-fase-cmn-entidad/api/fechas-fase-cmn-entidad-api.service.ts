import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { FaseFecha, FechaFaseCmnEntidad } from '../models/fecha-fase-cmn.model';

export interface GuardarFechaFaseCmnEntidad {
  anio: number;
  fase1: FaseFecha;
  fase2: FaseFecha;
  fase3: FaseFecha;
}

/**
 * Endpoints de la configuración de fechas de fase del CMN para la entidad. En el taller los responde el backend
 * simulado (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class FechasFaseCmnEntidadApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  listar(): Observable<FechaFaseCmnEntidad[]> {
    return this.http.get<FechaFaseCmnEntidad[]>(`${this.base}/configuracion/fechas-fase-cmn-entidad`);
  }

  /** Crea el año si no existe, o reemplaza sus fechas de fase si ya estaba configurado. */
  guardar(datos: GuardarFechaFaseCmnEntidad): Observable<FechaFaseCmnEntidad> {
    return this.http.put<FechaFaseCmnEntidad>(`${this.base}/configuracion/fechas-fase-cmn-entidad`, datos);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuracion/fechas-fase-cmn-entidad/${id}`);
  }
}

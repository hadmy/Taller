import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { EtapasFase, FechaFaseCmnDplaip } from '../models/fecha-fase-cmn.model';

export interface GuardarFechaFaseCmnDplaip {
  anio: number;
  fase1: EtapasFase;
  fase2: EtapasFase;
  fase3: EtapasFase;
}

/**
 * Endpoints de la configuración de fechas de fase del CMN - DPLAIP. En el taller los responde el backend
 * simulado (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class FechasFaseCmnDplaipApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  listar(): Observable<FechaFaseCmnDplaip[]> {
    return this.http.get<FechaFaseCmnDplaip[]>(`${this.base}/configuracion/fechas-fase-cmn-dplaip`);
  }

  /** Crea el año si no existe, o reemplaza sus fechas de fase si ya estaba configurado. */
  guardar(datos: GuardarFechaFaseCmnDplaip): Observable<FechaFaseCmnDplaip> {
    return this.http.put<FechaFaseCmnDplaip>(`${this.base}/configuracion/fechas-fase-cmn-dplaip`, datos);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuracion/fechas-fase-cmn-dplaip/${id}`);
  }
}

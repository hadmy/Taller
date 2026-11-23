import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { FilaDashboardCmn, FiltrosDashboard } from '../models/dashboard-cmn.model';

/**
 * Endpoint del «Dashboard» de Reportes. En el taller lo responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real sería la misma URL.
 */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  /** Ítems del Anexo 01 de las áreas usuarias del CMN, uno por año, con los filtros elegidos. */
  filas(filtros: FiltrosDashboard): Observable<FilaDashboardCmn[]> {
    let params = new HttpParams();
    if (filtros.anios?.length) params = params.set('anios', filtros.anios.join(','));
    if (filtros.areas?.length) params = params.set('areas', filtros.areas.join(','));
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    return this.http.get<FilaDashboardCmn[]>(`${this.base}/reportes/dashboard-cmn`, { params });
  }
}

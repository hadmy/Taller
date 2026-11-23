import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { SeguimientoEntidad } from '../models/seguimiento-entidad.model';
import { SeguimientoNacional } from '../models/seguimiento-nacional.model';

/**
 * Endpoint del «Seguimiento nacional del CMN Programación». En el taller lo responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real sería la misma URL.
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoNacionalApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  /** Todas las Entidades con su situación en la fase `fase` del periodo `periodo`. */
  obtener(periodo: string, fase: number): Observable<SeguimientoNacional> {
    const params = new HttpParams().set('periodo', periodo).set('fase', fase);
    return this.http.get<SeguimientoNacional>(`${this.base}/reportes/seguimiento-nacional-cmn`, { params });
  }

  /** «Resumen de la Entidad»: áreas usuarias, Anexos N.º 01, necesidades y techos de las tres fases. */
  obtenerEntidad(): Observable<SeguimientoEntidad> {
    return this.http.get<SeguimientoEntidad>(`${this.base}/reportes/seguimiento-entidad-cmn`);
  }
}

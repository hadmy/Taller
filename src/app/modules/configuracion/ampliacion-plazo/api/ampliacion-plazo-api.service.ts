import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { AmpliacionPlazo } from '../models/ampliacion-plazo.model';

/** Solicitudes de ampliación de plazo. En el taller las responde el backend simulado. */
@Injectable({ providedIn: 'root' })
export class AmpliacionPlazoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${APP_CONFIG.api.baseUrl}/configuracion/ampliaciones-plazo`;

  /** Las propias (Área usuaria) o todas (Abastecimiento), según el rol de la sesión. */
  listar(): Observable<AmpliacionPlazo[]> {
    return this.http.get<AmpliacionPlazo[]>(this.base);
  }

  registrar(etapaId: string, motivo: string): Observable<AmpliacionPlazo> {
    return this.http.post<AmpliacionPlazo>(this.base, { etapaId, motivo });
  }

  aceptar(id: string, fechaAmpliacion: string): Observable<AmpliacionPlazo> {
    return this.http.post<AmpliacionPlazo>(`${this.base}/${id}/aceptar`, { fechaAmpliacion });
  }

  rechazar(id: string, motivoRechazo: string): Observable<AmpliacionPlazo> {
    return this.http.post<AmpliacionPlazo>(`${this.base}/${id}/rechazar`, { motivoRechazo });
  }
}

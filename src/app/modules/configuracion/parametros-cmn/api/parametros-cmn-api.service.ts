import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { ParametrosCmn } from '../models/parametros-cmn.model';

/** Parámetros generales del CMN. En el taller los responde el backend simulado. */
@Injectable({ providedIn: 'root' })
export class ParametrosCmnApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${APP_CONFIG.api.baseUrl}/configuracion/parametros-cmn`;

  obtener(): Observable<ParametrosCmn> {
    return this.http.get<ParametrosCmn>(this.url);
  }

  /** Cambia solo los parámetros recibidos. */
  guardar(cambios: Partial<ParametrosCmn>): Observable<ParametrosCmn> {
    return this.http.put<ParametrosCmn>(this.url, cambios);
  }
}

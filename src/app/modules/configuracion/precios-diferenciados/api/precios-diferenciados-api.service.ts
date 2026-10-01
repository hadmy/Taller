import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { PrecioDiferenciado } from '../models/precio-diferenciado.model';

/**
 * Endpoints de la configuración de precios diferenciados. En el taller los responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class PreciosDiferenciadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  listar(): Observable<PrecioDiferenciado[]> {
    return this.http.get<PrecioDiferenciado[]>(`${this.base}/configuracion/precios-diferenciados`);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuracion/precios-diferenciados/${id}`);
  }
}

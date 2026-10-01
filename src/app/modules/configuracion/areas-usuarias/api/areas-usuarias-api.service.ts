import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { AreaUsuaria, AreaUsuariaItem } from '../models/area-usuaria.model';

export interface AreaUsuariaDetalle {
  area: AreaUsuaria;
  items: AreaUsuariaItem[];
}

/**
 * Endpoints de la configuración de áreas usuarias. En el taller los responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class AreasUsuariasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  listar(): Observable<AreaUsuaria[]> {
    return this.http.get<AreaUsuaria[]>(`${this.base}/configuracion/areas-usuarias`);
  }

  /** Reemplaza las cuatro banderas de las áreas indicadas. */
  guardar(cambios: Pick<AreaUsuaria, 'id' | 'generaCmn' | 'esAte' | 'esOa' | 'esAga'>[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/configuracion/areas-usuarias`, { areas: cambios });
  }

  /** Área con sus commodities/ítems a pedir: pantalla de detalle. */
  obtenerDetalle(areaId: string): Observable<AreaUsuariaDetalle> {
    return this.http.get<AreaUsuariaDetalle>(`${this.base}/configuracion/areas-usuarias/${areaId}/detalle`);
  }
}

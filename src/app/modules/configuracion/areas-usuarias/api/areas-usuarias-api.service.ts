import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { AreaUsuaria, AreaUsuariaItem, CatalogoItem } from '../models/area-usuaria.model';

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

  /** «Sincronizar»: trae del pliego la siguiente área que aún no está en la lista (`null` si no hay más). */
  sincronizar(): Observable<{ area: AreaUsuaria | null }> {
    return this.http.post<{ area: AreaUsuaria | null }>(`${this.base}/configuracion/areas-usuarias/sincronizar`, {});
  }

  /** Reemplaza las cuatro banderas de las áreas indicadas. */
  guardar(cambios: Pick<AreaUsuaria, 'id' | 'generaCmn' | 'esAte' | 'esOa' | 'esMaa'>[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/configuracion/areas-usuarias`, { areas: cambios });
  }

  /** Catálogo de commodities e ítems del que se elige en «Buscar commodities u ítems». */
  listarCatalogo(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.base}/configuracion/areas-usuarias/catalogo-items`);
  }

  /** Reemplaza los commodities/ítems del área (ambas pestañas). */
  guardarItems(areaId: string, items: AreaUsuariaItem[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/configuracion/areas-usuarias/${areaId}/items`, { items });
  }

  /** Área con sus commodities/ítems a pedir: pantalla de detalle. */
  obtenerDetalle(areaId: string): Observable<AreaUsuariaDetalle> {
    return this.http.get<AreaUsuariaDetalle>(`${this.base}/configuracion/areas-usuarias/${areaId}/detalle`);
  }
}

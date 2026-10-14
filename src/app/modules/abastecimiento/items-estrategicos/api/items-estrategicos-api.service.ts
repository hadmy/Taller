import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { ItemEstrategico, ItemEstrategicoCatalogo, ItemEstrategicoRegistro } from '../models/item-estrategico.model';

/**
 * Endpoints propios de la Solicitud de Ítems Estratégicos. En el taller los responde el backend simulado
 * (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class ItemsEstrategicosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  /** Guarda (o reemplaza) la lista de ítems propuestos en la solicitud. */
  guardarItems(solicitudId: string, items: ItemEstrategico[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/solicitudes/${solicitudId}/items-estrategicos`, { items });
  }

  /** Catálogo de ítems que se pueden proponer como estratégicos. */
  listarCatalogo(): Observable<ItemEstrategicoCatalogo[]> {
    return this.http.get<ItemEstrategicoCatalogo[]>(`${this.base}/items-estrategicos/catalogo`);
  }

  /** Ítems estratégicos aprobados: pestaña Registros. */
  listarRegistros(): Observable<ItemEstrategicoRegistro[]> {
    return this.http.get<ItemEstrategicoRegistro[]>(`${this.base}/items-estrategicos`);
  }
}

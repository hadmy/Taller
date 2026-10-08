import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { CatalogoCubso, PrecioArea, PrecioDiferenciado } from '../models/precio-diferenciado.model';

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

  /** Catálogo CUBSO del panel «Seleccionar ítems». */
  listarCatalogo(): Observable<CatalogoCubso[]> {
    return this.http.get<CatalogoCubso[]>(`${this.base}/configuracion/precios-diferenciados/catalogo-cubso`);
  }

  /** Graba los CUBSO elegidos como un solo registro (el primero, con el total elegido) y devuelve la lista completa. */
  agregar(cubsos: Pick<CatalogoCubso, 'codigoCubso' | 'descripcion'>[]): Observable<PrecioDiferenciado[]> {
    return this.http.post<PrecioDiferenciado[]>(`${this.base}/configuracion/precios-diferenciados`, { cubsos });
  }

  /** Un CUBSO con sus precios por área, para «Editar precios diferenciados». */
  obtener(id: string): Observable<PrecioDiferenciado> {
    return this.http.get<PrecioDiferenciado>(`${this.base}/configuracion/precios-diferenciados/${id}`);
  }

  /** Reemplaza los precios por área del CUBSO. */
  guardarPrecios(id: string, precios: Omit<PrecioArea, 'id'>[]): Observable<PrecioDiferenciado> {
    return this.http.put<PrecioDiferenciado>(`${this.base}/configuracion/precios-diferenciados/${id}/precios`, { precios });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuracion/precios-diferenciados/${id}`);
  }
}

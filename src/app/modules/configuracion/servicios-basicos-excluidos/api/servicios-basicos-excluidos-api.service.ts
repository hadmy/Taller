import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { EntidadServicioBasico, ServicioBasico } from '../models/servicio-basico.model';

/**
 * Endpoints de la configuración de servicios básicos excluidos de la ley. En el taller los responde el backend
 * simulado (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class ServiciosBasicosExcluidosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  /** Servicios básicos ya vinculados. */
  listar(): Observable<ServicioBasico[]> {
    return this.http.get<ServicioBasico[]>(`${this.base}/configuracion/servicios-basicos-excluidos`);
  }

  /** Catálogo del que se elige en «Seleccionar ítems». */
  listarCatalogo(): Observable<ServicioBasico[]> {
    return this.http.get<ServicioBasico[]>(`${this.base}/configuracion/servicios-basicos-excluidos/catalogo`);
  }

  /** Entidades que se pueden asignar a un servicio vinculado («Asignar entidades»). */
  listarEntidades(): Observable<EntidadServicioBasico[]> {
    return this.http.get<EntidadServicioBasico[]>(`${this.base}/configuracion/servicios-basicos-excluidos/entidades`);
  }

  /** Reemplaza los servicios básicos vinculados, con sus entidades asignadas. */
  guardar(items: ServicioBasico[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/configuracion/servicios-basicos-excluidos`, { items });
  }
}

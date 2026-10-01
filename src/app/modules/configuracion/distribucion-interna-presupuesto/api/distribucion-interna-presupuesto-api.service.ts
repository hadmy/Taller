import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { DistribucionFilaOu, DistribucionGenerica, DistribucionInternaPresupuesto } from '../models/distribucion-interna-presupuesto.model';

export interface GuardarDistribucionInternaPresupuesto {
  anio: number;
  presupuestoFase: string;
  filas: { id: string; montos: Record<string, number> }[];
}

/** Contexto fijo (área usuaria titular, genéricas y filas de la grilla) para armar un año nuevo. */
export interface PlantillaDistribucion {
  areaUsuariaTitular: { codigo: string; denominacion: string };
  entidadUe: string;
  periodo: number;
  genericas: DistribucionGenerica[];
  filas: DistribucionFilaOu[];
}

/**
 * Endpoints de la configuración de distribución interna de presupuesto. En el taller los responde el backend
 * simulado (`src/app/mock/mock-backend.interceptor.ts`); con un backend real serían las mismas URLs.
 */
@Injectable({ providedIn: 'root' })
export class DistribucionInternaPresupuestoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.api.baseUrl;

  listar(): Observable<DistribucionInternaPresupuesto[]> {
    return this.http.get<DistribucionInternaPresupuesto[]>(`${this.base}/configuracion/distribucion-interna-presupuesto`);
  }

  /** Área usuaria titular, genéricas habilitadas y filas de la grilla: el contexto fijo para configurar un año nuevo. */
  plantilla(): Observable<PlantillaDistribucion> {
    return this.http.get<PlantillaDistribucion>(`${this.base}/configuracion/distribucion-interna-presupuesto/plantilla`);
  }

  /** Crea el año si no existe, o reemplaza los montos asignados por área usuaria si ya estaba configurado. */
  guardar(datos: GuardarDistribucionInternaPresupuesto): Observable<DistribucionInternaPresupuesto> {
    return this.http.put<DistribucionInternaPresupuesto>(`${this.base}/configuracion/distribucion-interna-presupuesto`, datos);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuracion/distribucion-interna-presupuesto/${id}`);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../core/config/app.config';
import { FavoritoReporte } from './favorito-reporte.model';

/** Favoritos del usuario en un reporte; cada operación devuelve la lista actualizada. */
@Injectable({ providedIn: 'root' })
export class FavoritosReporteApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${APP_CONFIG.api.baseUrl}/reportes`;

  listar(reporte: string): Observable<FavoritoReporte[]> {
    return this.http.get<FavoritoReporte[]>(`${this.base}/${reporte}/favoritos`);
  }

  guardar(reporte: string, favorito: FavoritoReporte): Observable<FavoritoReporte[]> {
    return this.http.post<FavoritoReporte[]>(`${this.base}/${reporte}/favoritos`, favorito);
  }

  eliminar(reporte: string, id: string): Observable<FavoritoReporte[]> {
    return this.http.delete<FavoritoReporte[]>(`${this.base}/${reporte}/favoritos/${id}`);
  }
}

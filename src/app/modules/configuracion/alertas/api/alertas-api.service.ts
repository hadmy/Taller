import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_CONFIG } from '../../../../core/config/app.config';
import { AlertaCmn, DatosAlerta } from '../models/alerta-cmn.model';

/** Alertas configuradas del CMN. En el taller las responde el backend simulado. */
@Injectable({ providedIn: 'root' })
export class AlertasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${APP_CONFIG.api.baseUrl}/configuracion/alertas`;

  listar(): Observable<AlertaCmn[]> {
    return this.http.get<AlertaCmn[]>(this.base);
  }

  /** Crea la alerta o, con `id`, la cambia. */
  guardar(datos: DatosAlerta, id: string | null): Observable<AlertaCmn> {
    return this.http.post<AlertaCmn>(this.base, { ...datos, id });
  }

  inactivar(id: string): Observable<AlertaCmn> {
    return this.http.post<AlertaCmn>(`${this.base}/${id}/inactivar`, {});
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

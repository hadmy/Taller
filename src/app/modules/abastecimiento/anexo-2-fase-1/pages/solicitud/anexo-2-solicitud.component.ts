import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { SolicitudesApiService } from '../../../../../core/api/solicitudes-api.service';
import { TIPO_ACCION_MODIFICACION } from '../../models/anexo-2-fase-1.model';
import { Anexo2Fase1RequestComponent } from './anexo-2-fase-1-request.component';
import { Anexo2ModificacionComponent } from './anexo-2-modificacion.component';

/**
 * Solicitud de CMN - Anexo N.º 02 de cualquier fase: abre la pantalla de su tipo de acción. Una solicitud nueva lo trae
 * en la URL (`?actionType=modificacion`, como lo manda «Crear documento»); una grabada, en la propia solicitud.
 */
@Component({
  selector: 'siaf-anexo-2-solicitud',
  standalone: true,
  imports: [Anexo2Fase1RequestComponent, Anexo2ModificacionComponent],
  template: `
    <!-- \`track\` por solicitud: pasar de un documento a otro (p. ej. desde una notificación) arma la pantalla de nuevo. -->
    @for (vista of vistas(); track vista.clave) {
      @if (vista.modificacion) {
        <siaf-anexo-2-modificacion />
      } @else {
        <siaf-anexo-2-fase-1-request />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Anexo2SolicitudComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly solicitudesApi = inject(SolicitudesApiService);

  readonly vistas = signal<{ clave: string; modificacion: boolean }[]>([]);

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, query]) => ({ id: params.get('id'), accion: query.get('actionType') })),
        distinctUntilChanged((a, b) => a.id === b.id && a.accion === b.accion),
        switchMap(({ id, accion }) => {
          if (!id) return of({ clave: `nueva-${accion}`, modificacion: accion === TIPO_ACCION_MODIFICACION });
          return this.solicitudesApi.obtenerDetalle(id).pipe(
            map((s) => ({ clave: id, modificacion: s.tipoAccion === TIPO_ACCION_MODIFICACION })),
            // La pantalla de la Creación ya maneja una solicitud que no existe.
            catchError(() => of({ clave: id, modificacion: false })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((vista) => this.vistas.set([vista]));
  }
}

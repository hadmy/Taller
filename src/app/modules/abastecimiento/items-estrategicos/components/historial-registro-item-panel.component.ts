import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SolicitudResponse, SolicitudesApiService } from '../../../../core/api/solicitudes-api.service';
import { EstadoDocumento } from '../../../../core/models/documento.model';
import { ActionTrackerComponent, ActionTrackerSummary } from '../../../../shared/ui/action-tracker/action-tracker.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { StepItem, StepsComponent } from '../../../../shared/ui/steps/steps.component';
import { fechaHora } from '../../../../shared/utils/fecha-hora.util';
import { ETIQUETA_TIPO_ACCION, ItemEstrategicoRegistro, NOMBRE_DOCUMENTO } from '../models/item-estrategico.model';

/**
 * «Historial del registro» de una necesidad estratégica (Figma «A.1-RC-050»): a la izquierda la versión del registro y, a
 * la derecha, la solicitud que lo creó, los datos del ítem y quién la elaboró, verificó, validó y aprobó.
 */
@Component({
  selector: 'siaf-historial-registro-item-panel',
  standalone: true,
  imports: [ActionTrackerComponent, RecordStatusTagComponent, SidePanelComponent, StepsComponent],
  template: `
    <siaf-side-panel [open]="!!datos()" title="Historial del registro" [showFooter]="false" (closed)="closed.emit()">
      @if (datos(); as r) {
        <div class="grid w-full grid-cols-1 gap-siaf-xl lg:grid-cols-[246px_minmax(0,1fr)]">
          <siaf-steps variant="cards" [steps]="versiones()" [activeStep]="1" />

          <div class="flex min-w-0 flex-col gap-siaf-sm">
            <section class="flex flex-col gap-siaf-lg rounded-siaf-md border border-[var(--sys-color-divider-strong)] px-siaf-lg py-siaf-md" data-historial-documento>
              <dl class="m-0 grid gap-siaf-lg md:grid-cols-3">
                <div class="md:col-span-3">
                  <dt [class]="etiqueta">Documento</dt>
                  <dd [class]="valor">{{ documento }}</dd>
                </div>
                <div>
                  <dt [class]="etiqueta">N° de documento</dt>
                  <dd [class]="valor">{{ r.numeroDocumento }}</dd>
                </div>
                <div>
                  <dt [class]="etiqueta">Tipo de acción</dt>
                  <dd [class]="valor">{{ tipoAccion }}</dd>
                </div>
                <div>
                  <dt [class]="etiqueta">Estado del registro</dt>
                  <dd class="m-0 mt-siaf-xs"><siaf-record-status-tag [status]="r.vigente ? 'Activo' : 'Inactivo'" size="small" /></dd>
                </div>
              </dl>
            </section>

            <section class="flex flex-col gap-siaf-lg rounded-siaf-md border border-[var(--sys-color-divider-strong)] px-siaf-lg py-siaf-lg" data-historial-item>
              <h3 class="m-0 text-base font-bold uppercase leading-normal tracking-[0.02px] text-text">Necesidad estratégica</h3>
              <dl class="m-0 grid gap-siaf-lg md:grid-cols-3">
                <div>
                  <dt [class]="etiqueta">Código CUBSO</dt>
                  <dd [class]="valor">{{ r.codigo }}</dd>
                </div>
                <div class="md:col-span-2">
                  <dt [class]="etiqueta">Descripción</dt>
                  <dd [class]="valor">{{ r.descripcion }}</dd>
                </div>
              </dl>
            </section>

            <section class="rounded-siaf-md border border-[var(--sys-color-divider-strong)]">
              <siaf-action-tracker [summaryItems]="trazabilidad()" />
            </section>
          </div>
        </div>
      }
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialRegistroItemPanelComponent {
  private readonly solicitudesApi = inject(SolicitudesApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly documento = NOMBRE_DOCUMENTO;
  readonly tipoAccion = ETIQUETA_TIPO_ACCION;
  readonly etiqueta = 'block text-[11px] font-medium uppercase leading-normal tracking-[0.66px] text-text-muted';
  readonly valor = 'm-0 mt-siaf-xxs break-words text-sm leading-normal text-text';

  readonly datos = signal<ItemEstrategicoRegistro | null>(null);
  private readonly solicitud = signal<SolicitudResponse | null>(null);

  @Input() set registro(valor: ItemEstrategicoRegistro | null) {
    this.datos.set(valor);
    this.solicitud.set(null);
    if (!valor) return;
    this.solicitudesApi.obtenerDetalle(valor.documentoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => {
      // Solo si sigue abierto el mismo registro.
      if (this.datos()?.documentoId === s.id) this.solicitud.set(s);
    });
  }
  @Output() closed = new EventEmitter<void>();

  /** Hoy un registro tiene una sola versión: la de su creación. */
  readonly versiones = computed<StepItem[]>(() => {
    const r = this.datos();
    if (!r) return [];
    return [
      {
        label: r.numeroDocumento,
        fields: [
          { label: 'N° de documento', value: r.numeroDocumento },
          { label: 'Tipo de acción', value: ETIQUETA_TIPO_ACCION },
          // Con el año corto, como el Figma: la tarjeta mide 200 px.
          { label: 'Fecha', value: fechaHora(r.fechaRegistro).replace(/\d\d(\d\d)\s+/, '$1 ') },
        ],
      },
    ];
  });

  readonly trazabilidad = computed<ActionTrackerSummary[]>(() => {
    const historial = [...(this.solicitud()?.historialEstados ?? [])].reverse();
    // La última vez que pasó por cada estado (tras observar y subsanar, cuenta la nueva).
    const quien = (estado: EstadoDocumento, label: string): ActionTrackerSummary => {
      const h = historial.find((x) => x.estadoNuevo === estado);
      const c = h?.creador;
      return { label, actionBy: c ? `${c.nombres} ${c.apellidoPaterno} ${c.apellidoMaterno}`.toUpperCase() : '', date: fechaHora(h?.createdAt) };
    };
    return [
      quien('ELABORADO', 'Elaborado por'),
      quien('VERIFICADO', 'Verificado por'),
      quien('VALIDADO', 'Validado por'),
      quien('APROBADO', 'Aprobado por'),
    ];
  });
}

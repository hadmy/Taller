import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { FlowStatusTagComponent } from '../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../shared/ui/summary-card/summary-card.component';
import { REQUEST_ROUTE } from '../config/anexo-2-fase-1.rutas';
import { RegistroAnexo2, etiquetaTipoAccion, nombreRegistroFase } from '../models/anexo-2-fase-1.model';
import { fechaHora } from '../utils/formato.util';

const FILAS = 10;

/**
 * «Historial del registro» de CMN Programación (Figma «B.1-RC-017»): las versiones aprobadas de un Anexo 02 (la creación
 * y sus modificaciones) con número, tipo de acción, fecha de aprobación y estado. El número abre la solicitud.
 */
@Component({
  selector: 'siaf-historial-registro-panel',
  standalone: true,
  imports: [FlowStatusTagComponent, PaginationComponent, SidePanelComponent, SummaryCardComponent],
  template: `
    <siaf-side-panel [open]="!!datos()" title="Historial del registro" [showFooter]="false" (closed)="closed.emit()">
      @if (datos(); as r) {
        <div class="flex flex-col gap-siaf-md">
          <siaf-summary-card [fields]="campos()" [bordered]="true" [showClose]="false" />
          <table class="w-full border-collapse text-sm text-[var(--sys-color-text-neutral-medium)]">
            <thead>
              <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">N° de documento</th>
                <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Tipo de acción</th>
                <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de aprobación</th>
                <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (version of pagina(); track version.documentoId) {
                <tr class="border-b border-[var(--sys-color-divider-default)]" [attr.data-version]="version.numero">
                  <td class="px-siaf-md py-siaf-sm">
                    <button type="button" class="cursor-pointer text-text hover:text-brand-primary" [attr.aria-label]="'Abrir el documento ' + version.numero" (click)="abrir(version.documentoId)">
                      {{ version.numero }}
                    </button>
                  </td>
                  <td class="px-siaf-md py-siaf-sm">{{ accion(version.tipoAccion) }}</td>
                  <td class="whitespace-pre px-siaf-md py-siaf-sm">{{ fecha(version.fechaAprobacion) }}</td>
                  <td class="px-siaf-md py-siaf-sm"><siaf-flow-status-tag status="Aprobado" size="small" /></td>
                </tr>
              }
            </tbody>
          </table>
          <siaf-pagination
            navigation="Activate"
            position="Bottom"
            [page]="numeroPagina()"
            [pageSize]="filas"
            [totalItems]="r.versiones.length"
            [totalPages]="totalPaginas()"
            (previous)="numeroPagina.set(numeroPagina() - 1)"
            (next)="numeroPagina.set(numeroPagina() + 1)"
          />
        </div>
      }
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialRegistroPanelComponent {
  private readonly router = inject(Router);

  readonly filas = FILAS;
  readonly accion = etiquetaTipoAccion;
  readonly fecha = fechaHora;
  readonly datos = signal<RegistroAnexo2 | null>(null);
  readonly numeroPagina = signal(1);

  @Input() set registro(valor: RegistroAnexo2 | null) {
    this.datos.set(valor);
    this.numeroPagina.set(1);
  }
  @Output() closed = new EventEmitter<void>();

  readonly campos = computed<SummaryCardField[]>(() => {
    const r = this.datos();
    if (!r) return [];
    return [
      { label: 'Registro', value: nombreRegistroFase(r.fase) },
      { label: 'N° de registro', value: r.numero },
      { label: 'Estado del registro', value: 'Activo' },
    ];
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil((this.datos()?.versiones.length ?? 0) / FILAS)));
  readonly pagina = computed(() => {
    const inicio = (this.numeroPagina() - 1) * FILAS;
    return (this.datos()?.versiones ?? []).slice(inicio, inicio + FILAS);
  });

  abrir(documentoId: string): void {
    void this.router.navigate([REQUEST_ROUTE, documentoId]);
  }
}

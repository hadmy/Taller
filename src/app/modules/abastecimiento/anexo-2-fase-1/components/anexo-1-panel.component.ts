import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';

import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SidePanelComponent } from '../../../../shared/ui/side-panel/side-panel.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../shared/ui/summary-card/summary-card.component';
import { Anexo2Fase1ApiService } from '../api/anexo-2-fase-1-api.service';
import { DetalleAnexo1 } from '../models/anexo-2-fase-1.model';
import { ESTILO_EVALUACION_ANEXO_1 } from '../utils/evaluacion-anexo-1.util';
import { fechaCorta, formatearSoles } from '../utils/formato.util';

/**
 * «ANEXO N° 01» de un área usuaria de la Solicitud de CMN - Anexo N.º 02 (Figma «A.1 Rol Creador · 3. detalle items»,
 * frame «Content · Evaluación»). Se abre con el ícono de documento de la fila en la tabla «Registros».
 *
 * Panel lateral de solo lectura (`siaf-side-panel`, sin pie) con el estado de la evaluación (y el comentario si se observó), el área usuaria con su monto y
 * plazo (`siaf-summary-card`) y los ítems del Anexo 01 con búsqueda y paginación locales. La evaluación (Conforme /
 * Observar) se hace en bloque desde la tabla, no aquí. Cada vez que se abre vuelve a pedir el detalle al backend.
 */
@Component({
  selector: 'siaf-anexo-1-panel',
  standalone: true,
  imports: [FormTableSearchComponent, PaginationComponent, SidePanelComponent, StatusTagComponent, SummaryCardComponent],
  template: `
    <siaf-side-panel [open]="abierto()" title="Anexo N° 01" [showFooter]="false" (closed)="closed.emit()">
      @if (cargando() && !detalle()) {
        <div class="siaf-skeleton-pulse h-4 w-40 rounded bg-[var(--sys-color-bg-surfaces-surface-low)]"></div>
      } @else if (noExiste()) {
        <p class="m-0 text-sm text-[var(--sys-color-text-neutral-medium)]">No se encontró el Anexo 01 de esta área usuaria.</p>
      } @else if (detalle(); as d) {
        <div class="flex flex-col gap-siaf-md">
          <!-- Estado y, si se observó, la observación en la misma fila y con el mismo margen. -->
          <div class="grid items-start gap-x-siaf-lg gap-y-siaf-md border-b border-[var(--sys-color-divider-default)] px-siaf-md pb-siaf-md sm:grid-cols-3">
            <div class="flex flex-col items-start gap-siaf-xs">
              <span class="text-xs text-[var(--sys-color-text-neutral-medium)]">Estado</span>
              <siaf-status-tag appearance="soft" size="small" [tone]="estiloEvaluacion[d.area.estadoEvaluacion].tone">
                {{ estiloEvaluacion[d.area.estadoEvaluacion].texto }}
              </siaf-status-tag>
            </div>
            @if (d.area.comentarioEvaluacion) {
              <div class="flex min-w-0 flex-col items-start gap-siaf-xs sm:col-span-2">
                <span class="text-xs text-[var(--sys-color-text-neutral-medium)]">Comentario de observación</span>
                <p class="m-0 text-sm text-[var(--sys-color-text-neutral-high)]">{{ d.area.comentarioEvaluacion }}</p>
              </div>
            }
          </div>

          <siaf-summary-card [fields]="camposArea()" [bordered]="true" [showClose]="false" />

          <siaf-form-table-search
            [value]="busqueda()"
            placeholder="Buscar"
            ariaLabel="Buscar ítems del Anexo 01"
            [showActions]="false"
            (valueChange)="buscar($event)"
          />

          <div class="overflow-auto">
            <table class="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                  <th class="w-64 border-b border-[var(--sys-color-divider-strong)] px-siaf-xl py-siaf-sm text-left">Ítems</th>
                  <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Descripción</th>
                  <th class="w-80 border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Monto programado A01</th>
                </tr>
              </thead>
              <tbody>
                @for (item of itemsPaginados(); track item.id) {
                  <tr class="border-b border-[var(--sys-color-divider-default)]">
                    <td class="px-siaf-xl py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ item.item }}</td>
                    <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ item.descripcion }}</td>
                    <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ soles(item.montoProgramado) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-low)]" colspan="3">No hay ítems que coincidan con la búsqueda.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <siaf-pagination
            navigation="Activate"
            position="Bottom"
            [rowPage]="true"
            [page]="pagina()"
            [pageSize]="filasPorPagina()"
            [totalItems]="itemsFiltrados().length"
            [totalPages]="totalPaginas()"
            [rowsPerPage]="filasPorPagina()"
            [rowsPerPageOptions]="opcionesFilasPorPagina"
            (previous)="paginaAnterior()"
            (next)="paginaSiguiente()"
            (rowsPerPageChange)="cambiarFilas($event)"
          />
        </div>
      }
    </siaf-side-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Anexo1PanelComponent {
  private readonly api = inject(Anexo2Fase1ApiService);

  readonly estiloEvaluacion = ESTILO_EVALUACION_ANEXO_1;
  readonly soles = formatearSoles;
  readonly opcionesFilasPorPagina = [10, 25, 50];

  readonly abierto = signal(false);
  readonly cargando = signal(false);
  readonly noExiste = signal(false);
  readonly detalle = signal<DetalleAnexo1 | null>(null);

  private solicitudId = '';
  private areaId = '';

  /** Solicitud y área usuaria del Anexo 01 a mostrar; al abrir se pide su detalle. */
  @Input() set anexo(valor: { solicitudId: string; areaId: string } | null) {
    this.abierto.set(!!valor);
    if (!valor) return;
    this.solicitudId = valor.solicitudId;
    this.areaId = valor.areaId;
    this.cargar();
  }
  @Output() closed = new EventEmitter<void>();

  readonly camposArea = computed<SummaryCardField[]>(() => {
    const area = this.detalle()?.area;
    if (!area) return [];
    return [
      { label: 'Área usuaria', value: area.nombre },
      { label: 'Monto programado A01', value: formatearSoles(area.montoProgramado) },
      { label: 'Plazo para modificación', value: `Hasta ${fechaCorta(area.plazoModificacion)}` },
    ];
  });

  // ── Ítems: búsqueda y paginación locales ──────────────────────────
  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly filasPorPagina = signal(25);

  readonly itemsFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const items = this.detalle()?.items ?? [];
    return texto ? items.filter((i) => i.item.includes(texto) || i.descripcion.toLowerCase().includes(texto)) : items;
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.itemsFiltrados().length / this.filasPorPagina())));
  readonly itemsPaginados = computed(() => {
    const inicio = (this.pagina() - 1) * this.filasPorPagina();
    return this.itemsFiltrados().slice(inicio, inicio + this.filasPorPagina());
  });

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  cambiarFilas(valor: number): void {
    this.filasPorPagina.set(valor);
    this.pagina.set(1);
  }

  paginaAnterior(): void { this.pagina.update((p) => Math.max(1, p - 1)); }
  paginaSiguiente(): void { this.pagina.update((p) => Math.min(this.totalPaginas(), p + 1)); }

  private cargar(): void {
    this.cargando.set(true);
    this.noExiste.set(false);
    this.detalle.set(null);
    this.busqueda.set('');
    this.pagina.set(1);
    this.api.obtenerDetalleAnexo1(this.solicitudId, this.areaId).subscribe({
      next: (detalle) => { this.detalle.set(detalle); this.cargando.set(false); },
      error: () => { this.noExiste.set(true); this.cargando.set(false); },
    });
  }
}

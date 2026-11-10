import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PageShellComponent } from '../../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { TableControlsComponent } from '../../../../../shared/components/table-controls/table-controls.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../../../shared/ui/modal/modal.component';
import { ReadonlyFieldComponent } from '../../../../../shared/ui/readonly-field/readonly-field.component';
import { SideNavComponent } from '../../../../../shared/ui/side-nav/side-nav.component';
import { StatusTagComponent } from '../../../../../shared/ui/status-tag/status-tag.component';
import { SummaryCardComponent, SummaryCardField } from '../../../../../shared/ui/summary-card/summary-card.component';
import { TextAreaControlComponent } from '../../../../../shared/ui/text-area-control/text-area-control.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { PROCESS_ID, PROCESS_ROUTE, REQUEST_SEGMENT } from '../../config/anexo-2-fase-1.rutas';
import { DetalleAnexo1, EvaluacionAnexo1Request } from '../../models/anexo-2-fase-1.model';
import { ESTILO_EVALUACION_ANEXO_1 } from '../../utils/evaluacion-anexo-1.util';
import { formatearSoles } from '../../utils/formato.util';

/** Largo máximo del comentario de observación (Figma «Observar registro»: 0/200). */
const MAX_COMENTARIO = 200;

/**
 * «Detalle del Anexo 1» de un área usuaria incluida en la Solicitud de CMN - Anexo N.º 02 (Figma «A.1 Rol Creador ·
 * 3. Detalle items», frames «A.1-RC-031-Registro-Configuración»). Se llega desde la tabla «Registros» de la solicitud.
 *
 * Muestra el estado de la evaluación, el área usuaria con su monto y plazo (`siaf-summary-card`) y los ítems del
 * Anexo 01. Mientras el Anexo 01 está pendiente y la solicitud sigue en manos del creador (ELABORADO u OBSERVADO):
 * - «Conforme» pide confirmación («¿Dar Conformidad?», `siaf-modal`) y lo deja **Conforme**.
 * - «No conforme» abre «Observar registro» (`siaf-side-nav`) con el comentario obligatorio y lo deja **No Conforme**.
 * Ya evaluado, los botones desaparecen y la pantalla queda de solo lectura.
 */
@Component({
  selector: 'siaf-detalle-anexo-1',
  standalone: true,
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    FormTableSearchComponent,
    ModalComponent,
    PageShellComponent,
    PaginationComponent,
    ReadonlyFieldComponent,
    SideNavComponent,
    StatusTagComponent,
    SummaryCardComponent,
    TableControlsComponent,
    TextAreaControlComponent,
  ],
  templateUrl: './detalle-anexo-1.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleAnexo1Component implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Anexo2Fase1ApiService);

  readonly titulo = 'Detalle del Anexo 1';
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, this.titulo);
  readonly formatearSoles = formatearSoles;
  readonly estiloEvaluacion = ESTILO_EVALUACION_ANEXO_1;
  readonly maxComentario = MAX_COMENTARIO;

  private solicitudId = '';
  private areaId = '';

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly noExiste = signal(false);
  readonly detalle = signal<DetalleAnexo1 | null>(null);

  readonly area = computed(() => this.detalle()?.area ?? null);
  readonly evaluable = computed(() => !!this.detalle()?.evaluable);

  readonly camposArea = computed<SummaryCardField[]>(() => {
    const area = this.area();
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
  readonly opcionesFilasPorPagina = [10, 25, 50];

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

  // ── Conforme / No conforme ────────────────────────────────────────
  readonly modalConforme = signal(false);
  readonly panelObservar = signal(false);
  readonly comentario = signal('');
  readonly comentarioValido = computed(() => {
    const texto = this.comentario().trim();
    return texto.length > 0 && texto.length <= MAX_COMENTARIO;
  });

  ngOnInit(): void {
    this.solicitudId = this.route.snapshot.paramMap.get('id') ?? '';
    this.areaId = this.route.snapshot.paramMap.get('areaId') ?? '';
    this.cargar();
  }

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

  /** Flecha de la cabecera: vuelve a la solicitud. */
  regresar(): void {
    void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, this.solicitudId]);
  }

  abrirObservar(): void {
    this.comentario.set('');
    this.panelObservar.set(true);
  }

  confirmarConforme(): void {
    this.modalConforme.set(false);
    this.evaluar({ estado: 'Conforme' });
  }

  confirmarObservacion(): void {
    if (!this.comentarioValido()) return;
    this.panelObservar.set(false);
    this.evaluar({ estado: 'No conforme', comentario: this.comentario().trim() });
  }

  private evaluar(evaluacion: EvaluacionAnexo1Request): void {
    this.guardando.set(true);
    this.api.evaluarAnexo1(this.solicitudId, this.areaId, evaluacion).subscribe({
      next: () => this.cargar(),
      error: () => this.guardando.set(false),
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.obtenerDetalleAnexo1(this.solicitudId, this.areaId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
        this.guardando.set(false);
      },
      error: () => {
        this.noExiste.set(true);
        this.cargando.set(false);
        this.guardando.set(false);
      },
    });
  }
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, como el plazo del Figma («Hasta 23/08/2026»). */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso;
}

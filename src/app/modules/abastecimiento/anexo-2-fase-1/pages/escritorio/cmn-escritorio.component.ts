import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CurrentUserService } from '../../../../../core/auth/current-user.service';
import { PermissionService } from '../../../../../core/auth/permission.service';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormTableSearchComponent } from '../../../../../shared/components/form-table-search/form-table-search.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { SolicitudeFormCardComponent } from '../../../../../shared/components/solicitude-form-card/solicitude-form-card.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { FlowStatus, FlowStatusTagComponent } from '../../../../../shared/ui/flow-status-tag/flow-status-tag.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { DESDE_ESCRITORIO, ESCRITORIO_PROCESS_ID, ESCRITORIO_ROUTE, REQUEST_ROUTE, REQUEST_ROUTE_POR_FASE } from '../../config/anexo-2-fase-1.rutas';
import { ANIOS_CMN, FASES_CMN, FaseCmn, SolicitudEscritorioCmn } from '../../models/anexo-2-fase-1.model';
import { fechaHora } from '../../utils/formato.util';

/** Estado del backend → etiqueta de `siaf-flow-status-tag` (la solicitud nueva, aún sin elaborar, va como Pendiente). */
const ETIQUETA_ESTADO: Record<string, FlowStatus> = {
  NUEVO: 'Pendiente',
  ELABORADO: 'Elaborado',
  VERIFICADO: 'Verificado',
  VALIDADO: 'Validado',
  OBSERVADO: 'Observado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

const ROL_LEGIBLE: Record<string, string> = { creator: 'Creador', reviewer: 'Evaluador', approver: 'Aprobador' };
const FASES: FaseCmn[] = [1, 2, 3];
const FILAS_POR_PAGINA = 10;

/** Nombre corto de la solicitud de cada fase, para las tarjetas y la columna «Documento». */
export function nombreSolicitudFase(fase: FaseCmn): string {
  return `Anexo N.º 02 · Fase ${fase}: ${FASES_CMN[fase].nombre}`;
}

/**
 * «Escritorio virtual» de CMN Programación: la entrada a las fases del CMN y la bandeja de sus solicitudes.
 *
 * - **Procesos**: una tarjeta por fase (Solicitud de CMN - Anexo N.º 02, Fases 1, 2 y 3). Para el rol creador cada
 *   tarjeta es un botón que abre una solicitud nueva de esa fase; los demás roles las ven como información.
 * - **Bandeja de solicitudes**: las Solicitudes de CMN - Anexo N.º 02 de la entidad, con su fase, número, fecha, áreas y
 *   necesidades, responsable actual y estado; se buscan por texto, se paginan abajo y el ojo abre la solicitud.
 *
 * Los datos los da `GET /cmn/anexo-2/escritorio` (backend simulado) y se piden de nuevo cada vez que se entra.
 */
@Component({
  selector: 'siaf-cmn-escritorio',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ButtonComponent,
    FlowStatusTagComponent,
    FormTableSearchComponent,
    IconComponent,
    PaginationComponent,
    SolicitudeFormCardComponent,
  ],
  template: `
    <div class="min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)] text-text">
      <section class="bg-surface">
        <siaf-breadcrumb class="block" [items]="breadcrumbs" />
        <header class="flex min-h-[72px] flex-col px-siaf-md pb-siaf-sm pt-siaf-sm">
          <h1 class="m-0 text-sm font-bold uppercase leading-normal text-text">Escritorio virtual</h1>
          <p class="m-0 text-[10px] font-medium uppercase leading-normal tracking-[0.66px] text-text-muted">{{ subtitulo() }}</p>
        </header>
      </section>

      <div class="flex flex-col gap-siaf-md p-siaf-md">
        <!-- ── Procesos: una tarjeta por fase del CMN ── -->
        <siaf-solicitude-form-card title="Procesos · CMN Programación">
          <ul class="m-0 grid list-none gap-siaf-md p-0 md:grid-cols-3">
            @for (tarjeta of tarjetas(); track tarjeta.fase) {
              <li class="flex">
                <button
                  type="button"
                  class="flex w-full flex-col gap-siaf-xs rounded-siaf-md border border-[var(--sys-color-divider-strong)] bg-surface p-siaf-md text-left transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)] enabled:cursor-pointer enabled:hover:bg-[var(--sys-color-bg-states-light-hover)] disabled:cursor-default"
                  [disabled]="!puedeCrear()"
                  [attr.aria-label]="tarjeta.titulo + (puedeCrear() ? '. Crear una solicitud nueva' : '')"
                  (click)="crear(tarjeta.fase)"
                >
                  <span class="mb-siaf-xs flex size-11 items-center justify-center rounded-siaf-md bg-[var(--sys-color-bg-feedback-light-info)] text-[var(--sys-color-text-feedback-info)]">
                    <siaf-icon name="description" [size]="24" />
                  </span>
                  <strong class="text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ tarjeta.titulo }}</strong>
                  <span class="text-xs text-[var(--sys-color-text-neutral-medium)]">{{ tarjeta.descripcion }}</span>
                  <span class="text-xs text-[var(--sys-color-text-neutral-medium)]">{{ tarjeta.resumen }}</span>
                  <span class="text-[10px] font-medium uppercase tracking-[0.66px] text-text-muted">Roles: Creador · Evaluador · Aprobador</span>
                </button>
              </li>
            }
          </ul>
          @if (!puedeCrear()) {
            <p class="m-0 mt-siaf-sm text-xs text-[var(--sys-color-text-neutral-medium)]">Las solicitudes nuevas las registra el rol creador.</p>
          }
        </siaf-solicitude-form-card>

        <!-- ── Bandeja de solicitudes del Anexo N.º 02 ── -->
        <siaf-solicitude-form-card title="Bandeja de solicitudes" [loading]="cargando()">
          <siaf-form-table-search
            class="mb-siaf-md block"
            [showActions]="false"
            ariaLabel="Buscar en la bandeja de solicitudes"
            [value]="busqueda()"
            (typing)="buscar($event)"
            (valueChange)="buscar($event)"
          />
          @if (filtradas().length === 0) {
            <p class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-[var(--sys-color-text-neutral-medium)]">
              {{ busqueda() ? 'No hay solicitudes que coincidan con la búsqueda.' : 'Aún no hay solicitudes del Anexo N.º 02.' }}
            </p>
          } @else {
            <div class="overflow-auto">
              <table class="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Documento</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Número</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Necesidades</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Responsable actual</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Estado</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fila of pagina(); track fila.id) {
                    <tr class="border-b border-[var(--sys-color-divider-default)] text-[var(--sys-color-text-neutral-high)]">
                      <td class="px-siaf-md py-siaf-sm">{{ nombre(fila.fase) }}</td>
                      <td class="px-siaf-md py-siaf-sm">{{ fila.numero || '—' }}</td>
                      <td class="whitespace-nowrap px-siaf-md py-siaf-sm">{{ fecha(fila.fecha) }}</td>
                      <td class="px-siaf-md py-siaf-sm">{{ fila.necesidades }} necesidades · {{ fila.areas }} {{ fila.areas === 1 ? 'área' : 'áreas' }}</td>
                      <td class="px-siaf-md py-siaf-sm">{{ fila.responsable ? fila.responsable.nombre + ' (' + fila.responsable.rol + ')' : '—' }}</td>
                      <td class="px-siaf-md py-siaf-sm"><siaf-flow-status-tag [status]="estado(fila.estado)" /></td>
                      <td class="px-siaf-md py-siaf-xs text-right">
                        <siaf-button
                          variant="text"
                          size="sm"
                          icon="visibility"
                          [iconOnly]="true"
                          [ariaLabel]="'Ver la solicitud ' + (fila.numero || nombre(fila.fase))"
                          (click)="ver(fila.id)"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <siaf-pagination
              navigation="Activate"
              position="Bottom"
              [page]="paginaActual()"
              [pageSize]="filasPorPagina"
              [totalItems]="filtradas().length"
              [totalPages]="totalPaginas()"
              (previous)="irAPagina(paginaActual() - 1)"
              (next)="irAPagina(paginaActual() + 1)"
            />
          }
        </siaf-solicitude-form-card>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmnEscritorioComponent implements OnInit {
  private readonly anexoApi = inject(Anexo2Fase1ApiService);
  private readonly permissions = inject(PermissionService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(ESCRITORIO_PROCESS_ID, ESCRITORIO_ROUTE);
  readonly filasPorPagina = FILAS_POR_PAGINA;

  readonly solicitudes = signal<SolicitudEscritorioCmn[]>([]);
  readonly cargando = signal(true);
  readonly busqueda = signal('');
  readonly paginaActual = signal(1);

  /** Solo el creador registra solicitudes: para él las tarjetas abren una nueva. */
  readonly puedeCrear = computed(() => this.permissions.can('document.create'));

  readonly subtitulo = computed(() => {
    const u = this.currentUser.user();
    return ['CMN Programación', u.unidad || u.office, ROL_LEGIBLE[this.permissions.currentRole()] ?? ''].filter(Boolean).join(' · ');
  });

  readonly tarjetas = computed(() =>
    FASES.map((fase) => {
      const deLaFase = this.solicitudes().filter((s) => s.fase === fase);
      const aprobadas = deLaFase.filter((s) => s.estado === 'APROBADO').length;
      return {
        fase,
        titulo: nombreSolicitudFase(fase),
        descripcion: `Cuadro Multianual de Necesidades · Trienio ${ANIOS_CMN[0]}–${ANIOS_CMN[ANIOS_CMN.length - 1]}`,
        resumen: deLaFase.length
          ? `${deLaFase.length} ${deLaFase.length === 1 ? 'solicitud' : 'solicitudes'} · ${aprobadas} ${aprobadas === 1 ? 'aprobada' : 'aprobadas'}`
          : 'Sin solicitudes aún',
      };
    }),
  );

  /** Busca en el documento, número, estado y responsable. */
  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.solicitudes();
    return this.solicitudes().filter((s) =>
      [nombreSolicitudFase(s.fase), s.numero, ETIQUETA_ESTADO[s.estado] ?? s.estado, s.responsable?.nombre ?? '', s.responsable?.rol ?? '']
        .join(' ')
        .toLowerCase()
        .includes(texto),
    );
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / FILAS_POR_PAGINA)));
  readonly pagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * FILAS_POR_PAGINA;
    return this.filtradas().slice(inicio, inicio + FILAS_POR_PAGINA);
  });

  ngOnInit(): void {
    this.anexoApi.listarEscritorio().subscribe({
      next: (filas) => { this.solicitudes.set(filas); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.paginaActual.set(1);
  }

  irAPagina(pagina: number): void {
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  /** Tarjeta de una fase: abre una solicitud nueva de esa fase (como «Crear documento»). */
  crear(fase: FaseCmn): void {
    if (!this.puedeCrear()) return;
    void this.router.navigate([REQUEST_ROUTE_POR_FASE[fase]], { queryParams: { actionType: 'creacion', ...DESDE_ESCRITORIO } });
  }

  ver(id: string): void {
    void this.router.navigate([REQUEST_ROUTE, id], { queryParams: DESDE_ESCRITORIO });
  }

  nombre(fase: FaseCmn): string {
    return nombreSolicitudFase(fase);
  }

  fecha(iso: string): string {
    return fechaHora(iso).replace(/\s+/, ' ');
  }

  estado(codigo: string): FlowStatus {
    return ETIQUETA_ESTADO[codigo] ?? 'Elaborado';
  }
}

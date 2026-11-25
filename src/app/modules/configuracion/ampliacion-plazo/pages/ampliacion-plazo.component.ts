import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PermissionService } from '../../../../core/auth/permission.service';
import { respondeSolicitudes } from '../../../../core/auth/role.model';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { DateTimePickerComponent } from '../../../../shared/ui/date-time-picker/date-time-picker.component';
import { MessageBoxComponent } from '../../../../shared/ui/message-box/message-box.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { SnackbarComponent } from '../../../../shared/ui/snackbar/snackbar.component';
import { StatusTagComponent } from '../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { fechaCorta } from '../../shared/etapas-cmn';
import { AmpliacionPlazoApiService } from '../api/ampliacion-plazo-api.service';
import { AMPLIACION_PLAZO_FORM_ROUTE } from '../config/ampliacion-plazo.rutas';
import { AmpliacionPlazo, MAXIMO_MOTIVO, errorFechaAmpliacion } from '../models/ampliacion-plazo.model';

/**
 * «Ampliaciones de plazo» (Figma A.8). El Área usuaria (en el taller, el rol creador) ve sus solicitudes y registra otras
 * con «+»; Abastecimiento (evaluador y aprobador) ve las de todas las áreas, fija la fecha de ampliación y las acepta, o
 * las rechaza con su motivo.
 */
@Component({
  selector: 'siaf-ampliacion-plazo',
  standalone: true,
  imports: [
    ButtonComponent,
    ConfiguracionTabsComponent,
    DateTimePickerComponent,
    FormTableSearchComponent,
    MessageBoxComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    SnackbarComponent,
    StatusTagComponent,
    TooltipDirective,
  ],
  template: `
    <siaf-modal
      [open]="modal() === 'aceptar'"
      variant="save"
      [showIllustration]="true"
      title="¿Grabar configuración?"
      description="Los registros se grabarán exitosamente"
      confirmLabel="Aceptar"
      [confirmDisabled]="ocupado()"
      (canceled)="cerrar()"
      (closed)="cerrar()"
      (confirmed)="aceptar()"
    />
    <siaf-modal
      [open]="modal() === 'rechazar'"
      variant="reject"
      title="¿Rechazar ampliación de plazo?"
      description="Ingrese el motivo del rechazo. La solicitud quedará en situación Rechazado."
      reasonLabel="Motivo del rechazo"
      [reason]="motivoRechazo()"
      [reasonMaxLength]="maximo"
      [confirmDisabled]="ocupado() || !motivoRechazo().trim()"
      (reasonChange)="motivoRechazo.set($event)"
      (canceled)="cerrar()"
      (closed)="cerrar()"
      (confirmed)="rechazar()"
    />

    <siaf-page-shell [breadcrumbs]="breadcrumbs">
      <siaf-page-header pageHeader [title]="titulo" />
      <siaf-configuracion-tabs activa="ampliacion-fecha" />

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-md overflow-auto rounded-b-siaf-md bg-surface p-siaf-lg">
        <header class="flex min-h-10 items-center justify-between">
          <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Ampliaciones de plazo</h2>
          @if (!evalua) {
            <siaf-button variant="filled" icon="add" [iconOnly]="true" ariaLabel="Registrar solicitud de ampliación de plazo" (click)="registrar()" />
          }
        </header>

        @if (!evalua && !cargando() && !ampliaciones().length) {
          <message-box text="Aún no existen solicitudes de ampliación de plazo registradas. Haga clic en el botón (+) para registrar una solicitud." />
        } @else {
          <siaf-form-table-search [value]="busqueda()" placeholder="Buscar" ariaLabel="Buscar ampliación de plazo" (valueChange)="buscar($event)" />

          <!-- Crece con el calendario abierto: si no, la tabla recortaría el de las últimas filas. -->
          <div class="siaf-table-scroll shrink-0 rounded-siaf-md border border-[var(--sys-color-divider-default)] !max-h-none has-[[data-capa-cierre]]:pb-[300px]">
            @if (evalua) {
              <table class="w-full min-w-[1140px] border-collapse text-sm" data-bandeja-oa>
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-[135px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Área usuaria</th>
                    <th class="w-[230px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Etapa</th>
                    <th class="w-[115px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha fin de etapa</th>
                    <th class="w-[115px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de registro</th>
                    <th class="w-[210px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de ampliación</th>
                    <th class="w-[110px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Situación</th>
                    <th class="w-[130px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Motivo de ampliación</th>
                    <th class="w-[130px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Motivo de rechazo</th>
                    <th class="w-[104px] border-l border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of pagina(); track a.id) {
                    <tr class="border-b border-[var(--sys-color-divider-default)] align-top last:border-b-0" [class.bg-[var(--sys-color-bg-states-light-selected)]]="activa() === a.id" [attr.data-ampliacion]="a.id">
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ a.areaUsuaria }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ a.etapa }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fecha(a.fechaFinEtapa) }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fecha(a.fechaRegistro) }}</td>
                      <td class="px-siaf-md py-siaf-xs">
                        @if (a.situacion === 'Pendiente') {
                          <siaf-date-time-picker
                            [value]="fechas()[a.id] ?? ''"
                            placeholder="DD/MM/YYYY"
                            [hideFloatingLabel]="true"
                            [defaultToToday]="false"
                            [fullWidth]="true"
                            [error]="errorFecha(a)"
                            (valueChange)="cambiarFecha(a, $event)"
                          />
                        } @else {
                          <siaf-date-time-picker [value]="a.fechaAmpliacion" placeholder="-" [hideFloatingLabel]="true" [defaultToToday]="false" [fullWidth]="true" [disabled]="true" />
                        }
                      </td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ a.situacion }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]"><span class="line-clamp-2" [siafTooltip]="a.motivo" tooltipMode="always" tabindex="0">{{ a.motivo }}</span></td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">
                        @if (a.motivoRechazo) {
                          <span class="line-clamp-2" [siafTooltip]="a.motivoRechazo" tooltipMode="always" tabindex="0">{{ a.motivoRechazo }}</span>
                        } @else {
                          -
                        }
                      </td>
                      <td class="border-l border-[var(--sys-color-divider-default)] px-siaf-xs py-siaf-xs">
                        <div class="flex">
                          <siaf-button variant="text" size="sm" icon="check" [iconOnly]="true" [ariaLabel]="'Aceptar la ampliación de ' + a.areaUsuaria" [disabled]="a.situacion !== 'Pendiente'" siafTooltip="Aceptar" tooltipMode="always" (click)="pedirAceptar(a)" />
                          <siaf-button variant="text" size="sm" icon="highlight_off" [iconOnly]="true" [ariaLabel]="'Rechazar la ampliación de ' + a.areaUsuaria" [disabled]="a.situacion !== 'Pendiente'" siafTooltip="Rechazar" tooltipMode="always" (click)="pedirRechazar(a)" />
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="9">{{ cargando() ? 'Cargando solicitudes…' : 'No se encontraron solicitudes.' }}</td></tr>
                  }
                </tbody>
              </table>
            } @else {
              <table class="w-full min-w-[900px] border-collapse text-sm" data-lista-au>
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-[320px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Etapa</th>
                    <th class="w-[180px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de registro</th>
                    <th class="w-[190px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de ampliación</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Motivo</th>
                    <th class="w-[160px] border-l border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Situación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of pagina(); track a.id) {
                    <tr class="border-b border-[var(--sys-color-divider-default)] last:border-b-0" [attr.data-ampliacion]="a.id">
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ a.etapa }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fecha(a.fechaRegistro) }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fecha(a.fechaAmpliacion) || '-' }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">
                        {{ a.motivo }}
                        @if (a.motivoRechazo) {
                          <span class="block text-xs">Motivo de rechazo: {{ a.motivoRechazo }}</span>
                        }
                      </td>
                      <td class="border-l border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm">
                        @switch (a.situacion) {
                          @case ('Aceptado') { <siaf-status-tag tone="success" appearance="outline" icon="check_circle" size="small">Aceptado</siaf-status-tag> }
                          @case ('Rechazado') { <siaf-status-tag tone="danger" appearance="outline" icon="cancel" size="small">Rechazado</siaf-status-tag> }
                          @default { <siaf-status-tag tone="default" appearance="outline" icon="pending" size="small">Pendiente</siaf-status-tag> }
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="5">{{ cargando() ? 'Cargando solicitudes…' : 'No se encontraron solicitudes.' }}</td></tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <siaf-pagination
            navigation="Activate"
            position="Bottom"
            [rowPage]="true"
            [page]="numeroPagina()"
            [pageSize]="filas()"
            [totalItems]="filtradas().length"
            [totalPages]="totalPaginas()"
            [rowsPerPage]="filas()"
            [rowsPerPageOptions]="[10, 25, 50, 100]"
            (previous)="numeroPagina.set(numeroPagina() - 1)"
            (next)="numeroPagina.set(numeroPagina() + 1)"
            (rowsPerPageChange)="cambiarFilas($event)"
          />
        }
      </div>
    </siaf-page-shell>

    <siaf-snackbar [open]="!!aviso()" variant="custom" tone="neutral" [message]="aviso()" (closed)="aviso.set('')" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmpliacionPlazoComponent implements OnInit {
  private readonly api = inject(AmpliacionPlazoApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly fecha = fechaCorta;
  readonly maximo = MAXIMO_MOTIVO;
  /** Abastecimiento: evalúa las solicitudes. */
  readonly evalua = respondeSolicitudes(inject(PermissionService).currentRole());

  readonly ampliaciones = signal<AmpliacionPlazo[]>([]);
  readonly cargando = signal(true);
  readonly ocupado = signal(false);
  readonly busqueda = signal('');
  readonly aviso = signal(String((history.state as { aviso?: string } | null)?.aviso ?? ''));

  /** Fecha de ampliación escrita en cada fila pendiente. */
  readonly fechas = signal<Partial<Record<string, string>>>({});
  /** Filas cuya fecha ya se intentó usar: muestran su error. */
  private readonly revisadas = signal<ReadonlySet<string>>(new Set());
  /** Fila en la que se está trabajando. */
  readonly activa = signal('');
  readonly modal = signal<'aceptar' | 'rechazar' | null>(null);
  readonly motivoRechazo = signal('');

  readonly numeroPagina = signal(1);
  readonly filas = signal(25);
  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.ampliaciones().filter((a) =>
      [a.areaUsuaria, a.etapa, fechaCorta(a.fechaRegistro), fechaCorta(a.fechaAmpliacion), a.motivo, a.motivoRechazo, a.situacion].join(' ').toLowerCase().includes(texto),
    );
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.filas())));
  readonly pagina = computed(() => this.filtradas().slice((this.numeroPagina() - 1) * this.filas(), this.numeroPagina() * this.filas()));

  ngOnInit(): void {
    this.api.listar().subscribe({
      next: (lista) => {
        this.ampliaciones.set(lista);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.numeroPagina.set(1);
  }

  cambiarFilas(n: number): void {
    this.filas.set(n);
    this.numeroPagina.set(1);
  }

  registrar(): void {
    void this.router.navigateByUrl(AMPLIACION_PLAZO_FORM_ROUTE);
  }

  cambiarFecha(a: AmpliacionPlazo, fecha: string): void {
    this.activa.set(a.id);
    this.fechas.update((f) => ({ ...f, [a.id]: fecha }));
    if (fecha) this.revisar(a);
  }

  errorFecha(a: AmpliacionPlazo): string {
    return this.revisadas().has(a.id) ? errorFechaAmpliacion(this.fechas()[a.id] ?? '', a) : '';
  }

  pedirAceptar(a: AmpliacionPlazo): void {
    this.activa.set(a.id);
    this.revisar(a);
    if (!errorFechaAmpliacion(this.fechas()[a.id] ?? '', a)) this.modal.set('aceptar');
  }

  pedirRechazar(a: AmpliacionPlazo): void {
    this.activa.set(a.id);
    this.motivoRechazo.set('');
    this.modal.set('rechazar');
  }

  cerrar(): void {
    this.modal.set(null);
  }

  aceptar(): void {
    this.evaluar(this.api.aceptar(this.activa(), this.fechas()[this.activa()] ?? ''));
  }

  rechazar(): void {
    this.evaluar(this.api.rechazar(this.activa(), this.motivoRechazo().trim()));
  }

  private revisar(a: AmpliacionPlazo): void {
    this.revisadas.update((r) => new Set(r).add(a.id));
  }

  private evaluar(peticion: ReturnType<AmpliacionPlazoApiService['aceptar']>): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    peticion.subscribe({
      next: (cambiada) => {
        this.ampliaciones.update((lista) => lista.map((a) => (a.id === cambiada.id ? cambiada : a)));
        this.ocupado.set(false);
        this.cerrar();
        this.activa.set('');
        this.aviso.set('Los registros se grabaron correctamente.');
      },
      error: () => {
        this.ocupado.set(false);
        this.cerrar();
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconDropdownMenuComponent } from '../../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { RecordStatusTagComponent } from '../../../../shared/ui/record-status-tag/record-status-tag.component';
import { SnackbarComponent } from '../../../../shared/ui/snackbar/snackbar.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { etapaCmn, fechaCorta } from '../../shared/etapas-cmn';
import { AlertasApiService } from '../api/alertas-api.service';
import { ALERTAS_FORM_ROUTE } from '../config/alertas.rutas';
import { AlertaCmn } from '../models/alerta-cmn.model';

/**
 * «Alertas configuradas» (Figma A.7-RC-007 a RC-023): la lista con su etapa, fecha de registro, motivo y estado. «+» crea
 * una alerta; con una marcada se edita, elimina o inactiva.
 */
@Component({
  selector: 'siaf-alertas',
  standalone: true,
  imports: [
    ButtonComponent,
    ConfiguracionTabsComponent,
    FormTableSearchComponent,
    IconDropdownMenuComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    RecordStatusTagComponent,
    SnackbarComponent,
    TooltipDirective,
  ],
  template: `
    <siaf-modal
      [open]="modal() === 'inactivar'"
      variant="custom"
      title="Inactivar registro"
      description="El registro será inactivado"
      confirmLabel="Aceptar"
      [confirmDisabled]="ocupado()"
      (canceled)="modal.set(null)"
      (closed)="modal.set(null)"
      (confirmed)="inactivar()"
    />
    <siaf-modal
      [open]="modal() === 'eliminar'"
      variant="custom"
      icon="delete"
      title="¿Eliminar la alerta seleccionada?"
      [description]="seleccionadas().size === 1 ? 'Se eliminará la alerta seleccionada.' : 'Se eliminarán las ' + seleccionadas().size + ' alertas seleccionadas.'"
      confirmLabel="Eliminar"
      [confirmDisabled]="ocupado()"
      (canceled)="modal.set(null)"
      (closed)="modal.set(null)"
      (confirmed)="eliminar()"
    />

    <siaf-page-shell [breadcrumbs]="breadcrumbs">
      <siaf-page-header pageHeader [title]="titulo" />
      <siaf-configuracion-tabs activa="alertas" />

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-md overflow-auto rounded-b-siaf-md bg-surface p-siaf-lg">
        <header class="flex items-center justify-between">
          <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Alertas configuradas</h2>
          <siaf-button variant="filled" icon="add" [iconOnly]="true" ariaLabel="Crear alerta" (click)="crear()" />
        </header>

        <siaf-form-table-search [value]="busqueda()" placeholder="Buscar" ariaLabel="Buscar alerta" (valueChange)="buscar($event)" />

        <div class="flex min-h-10 items-center gap-siaf-xs">
          <input
            class="size-4 accent-[var(--sys-color-icon-states-enabled)]"
            type="checkbox"
            aria-label="Seleccionar todas las alertas"
            [checked]="todas()"
            [indeterminate]="algunas()"
            [disabled]="!pagina().length"
            (change)="marcarTodas($any($event.target).checked)"
          />
          @if (unica()) {
            <siaf-button variant="text" size="sm" icon="edit" [iconOnly]="true" ariaLabel="Editar" siafTooltip="Editar" tooltipMode="always" (click)="editar()" />
          }
          @if (seleccionadas().size) {
            <siaf-button variant="text" size="sm" icon="delete_outline" [iconOnly]="true" ariaLabel="Eliminar" siafTooltip="Eliminar" tooltipMode="always" (click)="modal.set('eliminar')" />
          }
          @if (unica()?.estado === 'Activo') {
            <siaf-icon-dropdown-menu icon="more_vert" ariaLabel="Más opciones" [items]="[{ label: 'Inactivar', value: 'inactivar' }]" [menuWidth]="160" (selected)="modal.set('inactivar')" />
          }
        </div>

        <div class="siaf-table-scroll rounded-siaf-md border border-[var(--sys-color-divider-default)]">
          <table class="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                <th class="w-12 border-b border-[var(--sys-color-divider-strong)] p-siaf-sm"></th>
                <th class="w-[320px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Etapa</th>
                <th class="w-[180px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de registro</th>
                <th class="w-[190px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fecha de ampliación</th>
                <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Motivo</th>
                <th class="w-[150px] border-l border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (a of pagina(); track a.id) {
                <tr class="border-b border-[var(--sys-color-divider-default)] last:border-b-0" [class.bg-[var(--sys-color-bg-states-light-selected)]]="seleccionadas().has(a.id)" [attr.data-alerta]="a.id">
                  <td class="p-siaf-sm">
                    <input class="size-4 accent-[var(--sys-color-icon-states-enabled)]" type="checkbox" [attr.aria-label]="'Seleccionar ' + a.nombre" [checked]="seleccionadas().has(a.id)" (change)="marcar(a.id, $any($event.target).checked)" />
                  </td>
                  <td class="max-w-[320px] truncate px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]" siafTooltip>{{ etapa(a) }}</td>
                  <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ fecha(a.fechaRegistro) }}</td>
                  <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">-</td>
                  <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ a.motivo }}</td>
                  <td class="border-l border-[var(--sys-color-divider-default)] px-siaf-md py-siaf-sm"><siaf-record-status-tag [status]="a.estado" size="small" /></td>
                </tr>
              } @empty {
                <tr><td class="p-siaf-lg text-center text-[var(--sys-color-text-neutral-medium)]" colspan="6">{{ cargando() ? 'Cargando alertas…' : 'No se encontraron alertas.' }}</td></tr>
              }
            </tbody>
          </table>
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
      </div>
    </siaf-page-shell>

    <siaf-snackbar [open]="!!aviso()" variant="custom" tone="neutral" [message]="aviso()" (closed)="aviso.set('')" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent implements OnInit {
  private readonly api = inject(AlertasApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly fecha = fechaCorta;

  readonly alertas = signal<AlertaCmn[]>([]);
  readonly cargando = signal(true);
  readonly ocupado = signal(false);
  readonly busqueda = signal('');
  readonly seleccionadas = signal<ReadonlySet<string>>(new Set());
  readonly modal = signal<'inactivar' | 'eliminar' | null>(null);
  /** Al volver de grabar, el formulario deja aquí su aviso. */
  readonly aviso = signal(String((history.state as { aviso?: string } | null)?.aviso ?? ''));

  readonly numeroPagina = signal(1);
  readonly filas = signal(25);

  readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.alertas().filter((a) => [this.etapa(a), fechaCorta(a.fechaRegistro), a.motivo, a.estado].join(' ').toLowerCase().includes(texto));
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.filas())));
  readonly pagina = computed(() => this.filtradas().slice((this.numeroPagina() - 1) * this.filas(), this.numeroPagina() * this.filas()));

  readonly todas = computed(() => this.pagina().length > 0 && this.pagina().every((a) => this.seleccionadas().has(a.id)));
  readonly algunas = computed(() => !this.todas() && this.pagina().some((a) => this.seleccionadas().has(a.id)));
  /** La alerta marcada cuando es una sola. */
  readonly unica = computed(() => (this.seleccionadas().size === 1 ? (this.alertas().find((a) => this.seleccionadas().has(a.id)) ?? null) : null));

  ngOnInit(): void {
    this.api.listar().subscribe({
      next: (alertas) => {
        this.alertas.set(alertas);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  etapa(a: AlertaCmn): string {
    return etapaCmn(a.etapaId)?.nombre ?? '';
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.numeroPagina.set(1);
  }

  cambiarFilas(n: number): void {
    this.filas.set(n);
    this.numeroPagina.set(1);
  }

  marcar(id: string, marcada: boolean): void {
    const nuevas = new Set(this.seleccionadas());
    if (marcada) nuevas.add(id);
    else nuevas.delete(id);
    this.seleccionadas.set(nuevas);
  }

  marcarTodas(marcadas: boolean): void {
    const nuevas = new Set(this.seleccionadas());
    for (const a of this.pagina()) {
      if (marcadas) nuevas.add(a.id);
      else nuevas.delete(a.id);
    }
    this.seleccionadas.set(nuevas);
  }

  crear(): void {
    void this.router.navigateByUrl(ALERTAS_FORM_ROUTE);
  }

  editar(): void {
    const alerta = this.unica();
    if (alerta) void this.router.navigate([ALERTAS_FORM_ROUTE], { queryParams: { id: alerta.id } });
  }

  inactivar(): void {
    const alerta = this.unica();
    if (!alerta || this.ocupado()) return;
    this.ocupado.set(true);
    this.api.inactivar(alerta.id).subscribe({
      next: (cambiada) => this.terminar(this.alertas().map((a) => (a.id === cambiada.id ? cambiada : a)), 'El registro se inactivó correctamente.'),
      error: () => this.ocupado.set(false),
    });
  }

  eliminar(): void {
    const ids = [...this.seleccionadas()];
    if (!ids.length || this.ocupado()) return;
    this.ocupado.set(true);
    forkJoin(ids.map((id) => this.api.eliminar(id))).subscribe({
      next: () => this.terminar(this.alertas().filter((a) => !ids.includes(a.id)), 'El registro se eliminó correctamente.'),
      error: () => this.ocupado.set(false),
    });
  }

  private terminar(alertas: AlertaCmn[], aviso: string): void {
    this.alertas.set(alertas);
    this.seleccionadas.set(new Set());
    this.numeroPagina.set(1);
    this.ocupado.set(false);
    this.modal.set(null);
    this.aviso.set(aviso);
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { SnackbarComponent } from '../../../../shared/ui/snackbar/snackbar.component';
import { TextFieldComponent } from '../../../../shared/ui/text-field/text-field.component';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { ParametrosCmnApiService } from '../api/parametros-cmn-api.service';
import { MAXIMO_PREDEFINIDOS, opcionesHasta } from '../models/parametros-cmn.model';

/** «Parámetros DPLAIP» (Figma A.9): los años que el sistema incorpora al inicio de la programación. */
@Component({
  selector: 'siaf-parametros-dplaip',
  standalone: true,
  imports: [AlertComponent, ButtonComponent, ConfiguracionTabsComponent, ModalComponent, PageHeaderComponent, PageShellComponent, SnackbarComponent, TextFieldComponent],
  template: `
    <siaf-modal
      [open]="modal()"
      variant="save"
      [showIllustration]="true"
      title="¿Grabar configuración?"
      description="El registro se grabará"
      confirmLabel="Aceptar"
      [confirmDisabled]="guardando()"
      (canceled)="modal.set(false)"
      (closed)="modal.set(false)"
      (confirmed)="confirmar()"
    />

    <siaf-page-shell [breadcrumbs]="breadcrumbs">
      <siaf-page-header pageHeader [title]="titulo" />
      <siaf-configuracion-tabs activa="parametros-dplaip" />

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-md overflow-auto rounded-b-siaf-md bg-surface p-siaf-lg">
        <header class="flex items-center justify-between gap-siaf-md">
          <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Años de programación</h2>
          <div class="flex gap-siaf-xs">
            <siaf-button variant="outline" [disabled]="!hayCambios()" (click)="valor.set(grabado())">Cancelar</siaf-button>
            <siaf-button variant="filled" [disabled]="!hayCambios() || guardando()" (click)="modal.set(true)">Grabar</siaf-button>
          </div>
        </header>
        <div class="max-w-[280px]">
          <siaf-input
            label="Años Predefinidos"
            type="select"
            [required]="true"
            [autoSuccess]="false"
            [options]="opciones"
            [value]="valor()"
            hint="Cantidad de años que el sistema incorporará inicialmente a la programación."
            (valueChange)="valor.set($any($event).toString())"
            data-anios-predefinidos
          />
        </div>
        <siaf-alert tone="info" description="Este valor corresponde al período de programación establecido por la normativa vigente. Si la normativa cambia, DPLAIP podrá actualizar este parámetro." />
      </div>
    </siaf-page-shell>

    <siaf-snackbar [open]="aviso()" variant="custom" tone="neutral" message="Los registros se grabaron correctamente." (closed)="aviso.set(false)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosDplaipComponent implements OnInit {
  private readonly api = inject(ParametrosCmnApiService);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly opciones = opcionesHasta(MAXIMO_PREDEFINIDOS);

  readonly grabado = signal('');
  readonly valor = signal('');
  readonly modal = signal(false);
  readonly guardando = signal(false);
  readonly aviso = signal(false);
  readonly hayCambios = computed(() => !!this.valor() && this.valor() !== this.grabado());

  ngOnInit(): void {
    this.api.obtener().subscribe((p) => this.cargar(p.aniosPredefinidos));
  }

  confirmar(): void {
    if (this.guardando() || !this.hayCambios()) return;
    this.guardando.set(true);
    this.api.guardar({ aniosPredefinidos: Number(this.valor()) }).subscribe({
      next: (p) => {
        this.cargar(p.aniosPredefinidos);
        this.guardando.set(false);
        this.modal.set(false);
        this.aviso.set(true);
      },
      error: () => {
        this.guardando.set(false);
        this.modal.set(false);
      },
    });
  }

  private cargar(anios: number | null): void {
    const texto = anios === null ? '' : String(anios);
    this.grabado.set(texto);
    this.valor.set(texto);
  }
}

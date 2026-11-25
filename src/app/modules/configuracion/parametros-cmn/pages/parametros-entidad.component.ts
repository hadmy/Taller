import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { SnackbarComponent } from '../../../../shared/ui/snackbar/snackbar.component';
import { SwitchComponent } from '../../../../shared/ui/switch/switch.component';
import { TabItem, TabsComponent } from '../../../../shared/ui/tabs/tabs.component';
import { TextFieldComponent } from '../../../../shared/ui/text-field/text-field.component';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { ParametrosCmnApiService } from '../api/parametros-cmn-api.service';
import { ANIOS_NORMATIVA, FASES_VALIDACION, MAXIMO_ADICIONALES, ParametrosCmn, opcionesHasta, pasosDelFlujo } from '../models/parametros-cmn.model';

/**
 * «Parámetros Entidad» (Figma A.10), en dos pestañas: «Años de programación» (los predefinidos por la DPLAIP, solo lectura,
 * y el máximo de adicionales) y «Validaciones» (qué fases llevan un segundo validador del Anexo 2, con su flujo). «Grabar»
 * guarda las dos.
 */
@Component({
  selector: 'siaf-parametros-entidad',
  standalone: true,
  imports: [
    AlertComponent,
    ButtonComponent,
    ConfiguracionTabsComponent,
    IconComponent,
    KpiCardComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    SnackbarComponent,
    SwitchComponent,
    TabsComponent,
    TextFieldComponent,
  ],
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
      <siaf-page-header pageHeader [title]="titulo">
        <div actions class="flex gap-siaf-sm">
          <siaf-button variant="outline" icon="close" (click)="descartar()">Cancelar</siaf-button>
          <siaf-button variant="filled" icon="save" [disabled]="!hayCambios() || guardando()" (click)="modal.set(true)">Grabar</siaf-button>
        </div>
      </siaf-page-header>
      <siaf-configuracion-tabs activa="parametros-entidad" />

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-md overflow-auto rounded-b-siaf-md bg-surface p-siaf-lg">
        <siaf-tabs [tabs]="pestanas" [activeId]="pestana()" ariaLabel="Parámetros de la Entidad" idBase="parametros-entidad" (activeIdChange)="pestana.set($event)" />

        @if (actual(); as p) {
          @if (pestana() === 'anios') {
            <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Años de programación</h2>
            <div class="grid gap-siaf-lg md:grid-cols-2">
              <siaf-input label="Años Predefinidos" [required]="true" [disabled]="true" [autoSuccess]="false" [value]="predefinidos() + ' años'" hint="Establecidos por DPLAIP de acuerdo con la normativa vigente." />
              <siaf-input
                label="Máximo de años adicionales"
                type="select"
                [required]="true"
                [autoSuccess]="false"
                [options]="opciones"
                [value]="'' + p.maximoAdicionales"
                hint="Cantidad máxima de años (de 1 a 20) que el usuario podrá agregar a los años predefinidos."
                (valueChange)="cambiar({ maximoAdicionales: +$any($event) })"
                data-maximo-adicionales
              />
            </div>
            <h3 class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Vista previa</h3>
            <div class="grid gap-siaf-md rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-lowest)] p-siaf-lg md:grid-cols-3" data-vista-previa-anios>
              <siaf-kpi-card title="Años Predefinidos" [amount]="'' + predefinidos()" [showIcon]="false" [showProgress]="false" />
              <siaf-kpi-card title="Años Adicionales" [amount]="'' + p.maximoAdicionales" [showIcon]="false" [showProgress]="false" />
              <siaf-kpi-card title="Máximo Total Permitido" [amount]="'' + (predefinidos() + p.maximoAdicionales)" [showIcon]="false" [showProgress]="false" />
            </div>
            <siaf-alert tone="info" description="La entidad no puede modificar la cantidad de años predefinidos establecida por DPLAIP. Solo puede determinar el máximo de años adicionales que permitirá incorporar." />
          } @else {
            <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Validación adicional de Anexos 2</h2>
            <div class="siaf-table-scroll shrink-0">
              <table class="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr class="bg-[var(--sys-color-bg-surfaces-surface-high)] text-xs font-bold uppercase text-[var(--sys-color-text-neutral-high)]">
                    <th class="w-[200px] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Fase</th>
                    <th class="border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Anexo 2</th>
                    <th class="w-[40%] border-b border-[var(--sys-color-divider-strong)] px-siaf-md py-siaf-sm text-left">Requiere validación adicional</th>
                  </tr>
                </thead>
                <tbody>
                  @for (f of fases; track f.numero) {
                    <tr class="border-b border-[var(--sys-color-divider-default)]">
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">F{{ f.numero }}</td>
                      <td class="px-siaf-md py-siaf-sm text-[var(--sys-color-text-neutral-medium)]">{{ f.nombre }}</td>
                      <td class="px-siaf-md py-siaf-sm">
                        <siaf-switch [ariaLabel]="'Validación adicional en ' + f.nombre" [checked]="p.validacionAdicional[f.numero]" (checkedChange)="cambiarValidacion(f.numero, $event)" [attr.data-fase]="f.numero" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <h3 class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Vista previa flujo configurado</h3>
            <div class="flex flex-col gap-siaf-lg rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-lowest)] p-siaf-lg" data-vista-previa-flujo>
              @for (f of fases; track f.numero) {
                <section class="flex flex-col gap-siaf-sm" [attr.aria-label]="'Flujo de la fase ' + f.numero" [attr.data-flujo]="f.numero">
                  <h4 class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">F{{ f.numero }} - {{ f.nombre }}</h4>
                  <ol class="m-0 flex list-none flex-col items-stretch gap-siaf-sm p-0 md:flex-row">
                    @for (paso of pasos(p.validacionAdicional[f.numero]); track paso.rol; let ultimo = $last) {
                      <li class="flex min-w-0 items-center gap-siaf-sm md:flex-1">
                        <siaf-kpi-card class="min-w-0 flex-1 self-stretch" [title]="paso.rol" [amount]="paso.cargo" [showIcon]="false" [showProgress]="false" />
                        @if (!ultimo) {
                          <siaf-icon class="shrink-0" name="arrow_forward" [size]="20" />
                        }
                      </li>
                    }
                  </ol>
                </section>
              }
            </div>
            <siaf-alert tone="info" description="La validación adicional corresponde a un segundo validador que interviene antes de la aprobación por parte del Jefe AGA." />
          }
        }
      </div>
    </siaf-page-shell>

    <siaf-snackbar [open]="aviso()" variant="custom" tone="neutral" message="Los registros se grabaron correctamente." (closed)="aviso.set(false)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosEntidadComponent implements OnInit {
  private readonly api = inject(ParametrosCmnApiService);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly opciones = opcionesHasta(MAXIMO_ADICIONALES);
  readonly fases = FASES_VALIDACION;
  readonly pasos = pasosDelFlujo;
  readonly pestanas: TabItem[] = [
    { id: 'anios', label: 'Años de programación' },
    { id: 'validaciones', label: 'Validaciones' },
  ];
  readonly pestana = signal('anios');

  readonly grabado = signal<ParametrosCmn | null>(null);
  readonly actual = signal<ParametrosCmn | null>(null);
  readonly modal = signal(false);
  readonly guardando = signal(false);
  readonly aviso = signal(false);

  readonly predefinidos = computed(() => this.grabado()?.aniosPredefinidos ?? ANIOS_NORMATIVA);
  readonly hayCambios = computed(() => JSON.stringify(this.actual()) !== JSON.stringify(this.grabado()));

  ngOnInit(): void {
    this.api.obtener().subscribe((p) => this.cargar(p));
  }

  cambiar(parte: Partial<ParametrosCmn>): void {
    this.actual.update((p) => (p ? { ...p, ...parte } : p));
  }

  cambiarValidacion(fase: 1 | 2 | 3, activa: boolean): void {
    const p = this.actual();
    if (p) this.cambiar({ validacionAdicional: { ...p.validacionAdicional, [fase]: activa } });
  }

  /** Vuelve a lo grabado. */
  descartar(): void {
    this.actual.set(this.grabado());
  }

  confirmar(): void {
    const p = this.actual();
    if (!p || this.guardando() || !this.hayCambios()) return;
    this.guardando.set(true);
    this.api.guardar({ maximoAdicionales: p.maximoAdicionales, validacionAdicional: p.validacionAdicional }).subscribe({
      next: (nuevo) => {
        this.cargar(nuevo);
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

  private cargar(p: ParametrosCmn): void {
    this.grabado.set(p);
    this.actual.set(p);
  }
}

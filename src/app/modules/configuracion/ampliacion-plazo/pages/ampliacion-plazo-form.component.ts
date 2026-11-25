import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CurrentUserService } from '../../../../core/auth/current-user.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { TextAreaControlComponent } from '../../../../shared/ui/text-area-control/text-area-control.component';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { ETAPAS_CMN, fechaCorta, hoyIso } from '../../shared/etapas-cmn';
import { AmpliacionPlazoApiService } from '../api/ampliacion-plazo-api.service';
import { AMPLIACION_PLAZO_ROUTE } from '../config/ampliacion-plazo.rutas';
import { MAXIMO_MOTIVO } from '../models/ampliacion-plazo.model';

/** Etapa en curso del Área usuaria en el taller (Figma A.8-RC-009). */
const ETAPA_EN_CURSO = ETAPAS_CMN.find((e) => e.id === 'f2-a1')!;

/** «Solicitud de ampliación de plazo» del Área usuaria (Figma A.8-RC-009 y 011): los datos de la etapa y el motivo. */
@Component({
  selector: 'siaf-ampliacion-plazo-form',
  standalone: true,
  imports: [AlertComponent, ButtonComponent, ConfiguracionTabsComponent, ModalComponent, PageHeaderComponent, PageShellComponent, TextAreaControlComponent],
  template: `
    <siaf-modal
      [open]="modal()"
      variant="save"
      [showIllustration]="true"
      title="¿Grabar solicitud?"
      description="La solicitud de ampliación de plazo se grabará con situación Pendiente."
      confirmLabel="Aceptar"
      [confirmDisabled]="guardando()"
      (canceled)="modal.set(false)"
      (closed)="modal.set(false)"
      (confirmed)="confirmar()"
    />

    <siaf-page-shell [breadcrumbs]="breadcrumbs">
      <siaf-page-header pageHeader [title]="titulo" />
      <siaf-configuracion-tabs activa="ampliacion-fecha" />

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-lg overflow-auto rounded-b-siaf-md bg-surface p-siaf-lg">
        <header class="flex items-center justify-between gap-siaf-md">
          <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Solicitud de ampliación de plazo</h2>
          <div class="flex gap-siaf-xs">
            <siaf-button variant="outline" (click)="cancelar()">Cancelar</siaf-button>
            <siaf-button variant="filled" [disabled]="!motivo().trim() || guardando()" (click)="modal.set(true)">Grabar</siaf-button>
          </div>
        </header>

        <section class="flex flex-col gap-siaf-md" aria-labelledby="ampliacion-datos">
          <h3 id="ampliacion-datos" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">Datos de la ampliación</h3>
          <dl class="m-0 grid gap-siaf-lg sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]" data-datos-ampliacion>
            @for (d of datos(); track d.label) {
              <div>
                <dt class="text-sm text-[var(--sys-color-text-neutral-low)]">{{ d.label }}</dt>
                <dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">{{ d.value }}</dd>
              </div>
            }
          </dl>
          <text-area-control placeholder="Motivo de la ampliación" [required]="true" [maxlength]="maximo" [value]="motivo()" (valueChange)="motivo.set($event)" />
          <siaf-alert tone="info" description="La fecha de ampliación será determinada por la Oficina de Abastecimiento." />
        </section>
      </div>
    </siaf-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmpliacionPlazoFormComponent {
  private readonly api = inject(AmpliacionPlazoApiService);
  private readonly router = inject(Router);
  private readonly usuario = inject(CurrentUserService);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly maximo = MAXIMO_MOTIVO;
  readonly motivo = signal('');
  readonly modal = signal(false);
  readonly guardando = signal(false);

  readonly datos = computed(() => [
    { label: 'Entidad', value: this.usuario.user().entidadNombre ?? this.usuario.user().office },
    { label: 'Área Usuaria', value: this.usuario.user().unidad ?? '-' },
    { label: 'Fecha de registro', value: fechaCorta(hoyIso()) },
    { label: 'Etapa', value: ETAPA_EN_CURSO.nombre },
    { label: 'Fecha de inicio de la etapa', value: fechaCorta(ETAPA_EN_CURSO.inicio) },
    { label: 'Fecha de fin de la etapa', value: fechaCorta(ETAPA_EN_CURSO.fin) },
  ]);

  cancelar(): void {
    void this.router.navigateByUrl(AMPLIACION_PLAZO_ROUTE);
  }

  confirmar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.api.registrar(ETAPA_EN_CURSO.id, this.motivo()).subscribe({
      next: () => void this.router.navigateByUrl(AMPLIACION_PLAZO_ROUTE, { state: { aviso: 'La solicitud de ampliación de plazo se grabó correctamente.' } }),
      error: () => {
        this.guardando.set(false);
        this.modal.set(false);
      },
    });
  }
}

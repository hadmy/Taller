import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../shared/ui/checkbox/checkbox.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { TextFieldComponent } from '../../../../shared/ui/text-field/text-field.component';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { CONFIGURACION_BREADCRUMBS, TITULO_CONFIGURACION } from '../../shared/configuracion.const';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { ETAPAS_CMN, etapaCmn, fechaCorta } from '../../shared/etapas-cmn';
import { AlertasApiService } from '../api/alertas-api.service';
import { EditorMensajeComponent } from '../components/editor-mensaje.component';
import { ALERTAS_ROUTE } from '../config/alertas.rutas';
import { DatosAlerta, FRECUENCIAS, MOMENTOS, UNIDADES, alertaVacia, camposFaltantes, comportamiento, esUnSoloDia, propuestaAlElegirEtapa } from '../models/alerta-cmn.model';

/**
 * «Crear alerta» (Figma A.7-RC-008 a RC-026), y editar con `?id=`: etapa, condición y frecuencia (con el comportamiento
 * programado en palabras), destinatarios, canales y mensaje. Al elegir la etapa propone destinatario, canales y mensaje.
 */
@Component({
  selector: 'siaf-alerta-form',
  standalone: true,
  imports: [ButtonComponent, CheckboxComponent, ConfiguracionTabsComponent, EditorMensajeComponent, ModalComponent, PageHeaderComponent, PageShellComponent, TextFieldComponent],
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
      <siaf-configuracion-tabs activa="alertas" />

      <div class="flex min-h-0 flex-1 flex-col gap-siaf-lg overflow-auto rounded-b-siaf-md bg-surface p-siaf-lg">
        <header class="flex items-center justify-between gap-siaf-md">
          <h2 class="m-0 text-base font-bold uppercase text-[var(--sys-color-text-neutral-high)]">{{ id ? 'Editar alerta' : 'Crear alerta' }}</h2>
          <div class="flex gap-siaf-xs">
            <siaf-button variant="outline" (click)="cancelar()">Cancelar</siaf-button>
            <siaf-button variant="filled" [disabled]="guardando() || sinCambios()" (click)="grabar()">Grabar</siaf-button>
          </div>
        </header>

        <section class="flex flex-col gap-siaf-md" aria-labelledby="alerta-1">
          <h3 id="alerta-1" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">1. Datos principales y etapa</h3>
          <siaf-input label="Nombre de alerta" [required]="true" [autoSuccess]="false" [value]="datos().nombre" [error]="error('nombre')" (valueChange)="cambiar('nombre', $any($event))" data-campo="nombre" />
          <div class="grid gap-siaf-lg md:grid-cols-[2fr_1fr_1fr]">
            <siaf-input label="Etapa de la alerta" type="select" [required]="true" [autoSuccess]="false" [options]="etapas" [value]="datos().etapaId" [error]="error('etapaId')" (valueChange)="elegirEtapa($any($event))" data-campo="etapaId" />
            <dl class="m-0"><dt class="text-sm text-[var(--sys-color-text-neutral-low)]">Inicio</dt><dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]" data-inicio>{{ inicio() }}</dd></dl>
            <dl class="m-0"><dt class="text-sm text-[var(--sys-color-text-neutral-low)]">Fin</dt><dd class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]" data-fin>{{ fin() }}</dd></dl>
          </div>
        </section>

        <section class="flex flex-col gap-siaf-md" aria-labelledby="alerta-2">
          <h3 id="alerta-2" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">2. Condición y frecuencia de ejecución</h3>
          <div class="grid gap-siaf-lg sm:grid-cols-2 xl:grid-cols-4">
            <siaf-input label="Momento de referencia" type="select" [required]="true" [autoSuccess]="false" [options]="momentos" [value]="datos().momento" [error]="error('momento')" (valueChange)="cambiar('momento', $any($event))" data-campo="momento" />
            <siaf-input label="Tiempo" type="number" [required]="!unSoloDia()" [autoSuccess]="false" [disabled]="unSoloDia()" [value]="unSoloDia() ? '' : datos().tiempo" [error]="error('tiempo')" (valueChange)="cambiarTiempo($any($event))" data-campo="tiempo" />
            <siaf-input label="Unidad" type="select" [required]="!unSoloDia()" [autoSuccess]="false" [disabled]="unSoloDia()" [options]="unidades" [value]="unSoloDia() ? '' : datos().unidad" [error]="error('unidad')" (valueChange)="cambiar('unidad', $any($event))" data-campo="unidad" />
            <siaf-input label="Frecuencia" type="select" [required]="!unSoloDia()" [autoSuccess]="false" [disabled]="unSoloDia()" [options]="frecuencias" [value]="unSoloDia() ? '' : datos().frecuencia" [error]="error('frecuencia')" (valueChange)="cambiar('frecuencia', $any($event))" data-campo="frecuencia" />
          </div>
          <div class="rounded-siaf-md bg-[var(--sys-color-bg-surfaces-surface-high)] px-siaf-xl py-siaf-md" aria-live="polite" data-comportamiento>
            <p class="m-0 text-sm font-bold text-[var(--sys-color-text-neutral-high)]">Comportamiento Programado</p>
            <p class="m-0 text-xs text-[var(--sys-color-text-neutral-medium)]">{{ comportamiento() }}</p>
          </div>
        </section>

        <div class="grid gap-siaf-lg md:grid-cols-2">
          <section class="flex flex-col gap-siaf-md" aria-labelledby="alerta-3">
            <h3 id="alerta-3" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">3. Destinatarios</h3>
            <siaf-checkbox label="Responsable del registro en la etapa" description="Usuario encargado de registrar o ejecutar las tareas de esta etapa." [checked]="datos().alResponsable" (checkedChange)="cambiar('alResponsable', $event)" />
            <siaf-checkbox label="Jefe / Responsable del área involucrada" description="Jefe directo o responsable del área asociada a la etapa." [checked]="datos().alJefe" (checkedChange)="cambiar('alJefe', $event)" />
          </section>
          <section class="flex flex-col gap-siaf-md" aria-labelledby="alerta-4">
            <h3 id="alerta-4" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">4. Canales de notificación</h3>
            <siaf-checkbox label="Bandeja de notificaciones del SIAF-RP" description="Aviso interno en el módulo del sistema." [checked]="datos().porBandeja" (checkedChange)="cambiar('porBandeja', $event)" />
            <siaf-checkbox label="Correo electrónico" description="Envío a la casilla asociada del usuario." [checked]="datos().porCorreo" (checkedChange)="cambiar('porCorreo', $event)" />
          </section>
        </div>

        <section class="flex flex-col gap-siaf-md" aria-labelledby="alerta-5">
          <h3 id="alerta-5" class="m-0 text-sm font-bold uppercase text-[var(--sys-color-text-neutral-high)]">5. Mensaje de la notificación</h3>
          <siaf-input label="Asunto del mensaje" [required]="true" [autoSuccess]="false" [value]="datos().asunto" [error]="error('asunto')" (valueChange)="cambiar('asunto', $any($event))" data-campo="asunto" />
          <siaf-editor-mensaje [valor]="datos().mensaje" (valorCambio)="cambiar('mensaje', $event)" />
        </section>
      </div>
    </siaf-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertaFormComponent implements OnInit {
  private readonly api = inject(AlertasApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = CONFIGURACION_BREADCRUMBS;
  readonly titulo = TITULO_CONFIGURACION;
  readonly etapas = ETAPAS_CMN.map((e) => ({ label: e.nombre, value: e.id }));
  readonly momentos = MOMENTOS;
  readonly unidades = UNIDADES;
  readonly frecuencias = FRECUENCIAS;

  readonly id = inject(ActivatedRoute).snapshot.queryParamMap.get('id');
  readonly datos = signal<DatosAlerta>(alertaVacia());
  readonly modal = signal(false);
  readonly guardando = signal(false);
  /** Tras pulsar «Grabar» se señalan los campos vacíos. */
  private readonly validando = signal(false);
  /** Foto de la alerta al entrar a editarla. */
  private readonly foto = signal<string | null>(null);

  readonly inicio = computed(() => fechaCorta(etapaCmn(this.datos().etapaId)?.inicio ?? '') || 'DD/MM/AAAA');
  readonly fin = computed(() => fechaCorta(etapaCmn(this.datos().etapaId)?.fin ?? '') || 'DD/MM/AAAA');
  readonly unSoloDia = computed(() => esUnSoloDia(this.datos().momento));
  readonly comportamiento = computed(() => comportamiento(this.datos()));
  private readonly faltantes = computed(() => new Set<string>(camposFaltantes(this.datos())));
  /** Al editar, «Grabar» solo con cambios. */
  readonly sinCambios = computed(() => {
    const foto = this.foto();
    return foto !== null && !hayCambiosRespectoAlSnapshot(foto, crearSnapshotFormulario({ ...this.datos() }));
  });

  ngOnInit(): void {
    if (!this.id) return;
    this.api.listar().subscribe((alertas) => {
      const alerta = alertas.find((a) => a.id === this.id);
      if (!alerta) {
        this.cancelar();
        return;
      }
      const { id: _id, fechaRegistro: _fecha, motivo: _motivo, estado: _estado, ...datos } = alerta;
      this.datos.set(datos);
      this.foto.set(crearSnapshotFormulario({ ...datos }));
    });
  }

  error(campo: keyof DatosAlerta): string {
    return this.validando() && this.faltantes().has(campo) ? 'Campo obligatorio' : '';
  }

  cambiar<K extends keyof DatosAlerta>(campo: K, valor: DatosAlerta[K]): void {
    this.datos.update((d) => ({ ...d, [campo]: valor }));
  }

  /** Solo enteros positivos. */
  cambiarTiempo(valor: string | number): void {
    this.cambiar('tiempo', String(valor).replace(/\D/g, '').replace(/^0+/, ''));
  }

  elegirEtapa(etapaId: string): void {
    this.datos.update((d) => propuestaAlElegirEtapa(d, etapaId));
  }

  cancelar(): void {
    void this.router.navigateByUrl(ALERTAS_ROUTE);
  }

  grabar(): void {
    this.validando.set(true);
    if (!this.faltantes().size) this.modal.set(true);
  }

  confirmar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.api.guardar(this.datos(), this.id).subscribe({
      next: () => void this.router.navigateByUrl(ALERTAS_ROUTE, { state: { aviso: 'Los registros se grabaron correctamente.' } }),
      error: () => {
        this.guardando.set(false);
        this.modal.set(false);
      },
    });
  }
}

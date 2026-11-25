import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Input, afterNextRender, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TabItem, TabsComponent } from '../../../shared/ui/tabs/tabs.component';
import { ALERTAS_ROUTE } from '../alertas/config/alertas.rutas';
import { AMPLIACION_PLAZO_ROUTE } from '../ampliacion-plazo/config/ampliacion-plazo.rutas';
import { AREAS_USUARIAS_ROUTE } from '../areas-usuarias/config/areas-usuarias.rutas';
import { DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE } from '../distribucion-interna-presupuesto/config/distribucion-interna-presupuesto.rutas';
import { FECHAS_FASE_CMN_DPLAIP_ROUTE } from '../fechas-fase-cmn-dplaip/config/fechas-fase-cmn-dplaip.rutas';
import { FECHAS_FASE_CMN_ENTIDAD_ROUTE } from '../fechas-fase-cmn-entidad/config/fechas-fase-cmn-entidad.rutas';
import { PARAMETROS_DPLAIP_ROUTE, PARAMETROS_ENTIDAD_ROUTE } from '../parametros-cmn/config/parametros-cmn.rutas';
import { PRECIOS_DIFERENCIADOS_ROUTE } from '../precios-diferenciados/config/precios-diferenciados.rutas';
import { SERVICIOS_BASICOS_EXCLUIDOS_ROUTE } from '../servicios-basicos-excluidos/config/servicios-basicos-excluidos.rutas';

export type ConfiguracionId =
  | 'areas-usuarias'
  | 'servicios-basicos'
  | 'fechas-dplaip'
  | 'fechas-entidad'
  | 'precios-diferenciados'
  | 'distribucion-interna'
  | 'alertas'
  | 'ampliacion-fecha'
  | 'parametros-dplaip'
  | 'parametros-entidad';

/** Pestaña de configuración y su ruta. */
const PESTANAS: { id: ConfiguracionId; label: string; ruta: string }[] = [
  { id: 'areas-usuarias', label: 'Áreas usuarias', ruta: AREAS_USUARIAS_ROUTE },
  { id: 'servicios-basicos', label: 'Servicios básicos', ruta: SERVICIOS_BASICOS_EXCLUIDOS_ROUTE },
  { id: 'fechas-dplaip', label: 'Fechas DPLAIP', ruta: FECHAS_FASE_CMN_DPLAIP_ROUTE },
  { id: 'fechas-entidad', label: 'Fechas Entidad', ruta: FECHAS_FASE_CMN_ENTIDAD_ROUTE },
  { id: 'precios-diferenciados', label: 'Precios diferenciados', ruta: PRECIOS_DIFERENCIADOS_ROUTE },
  { id: 'distribucion-interna', label: 'Distribución interna', ruta: DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE },
  { id: 'alertas', label: 'Alertas', ruta: ALERTAS_ROUTE },
  { id: 'ampliacion-fecha', label: 'Ampliación de fecha', ruta: AMPLIACION_PLAZO_ROUTE },
  { id: 'parametros-dplaip', label: 'Parámetros DPLAIP', ruta: PARAMETROS_DPLAIP_ROUTE },
  { id: 'parametros-entidad', label: 'Parámetros Entidad', ruta: PARAMETROS_ENTIDAD_ROUTE },
];

/** Cuánto avanza la fila de pestañas con cada flecha, en px. */
const PASO = 320;

/**
 * Pestañas de «Configuración del Cuadro Multianual de Necesidades» (Figma «Tabs-configuracion», A.7-RC-006) sobre
 * `siaf-tabs`: el menú entra por «Configuraciones» y desde aquí se pasa de una configuración a otra. Si no entran en el
 * ancho, las flechas recorren la fila y la pestaña activa queda siempre a la vista.
 * @usar
 * - Debajo del encabezado de cada pantalla de configuración (listas y formularios), con `activa` igual a su id.
 */
@Component({
  selector: 'siaf-configuracion-tabs',
  standalone: true,
  imports: [ButtonComponent, TabsComponent],
  // La fila de pestañas y la tarjeta de debajo forman un solo bloque blanco.
  host: { class: 'block shrink-0 overflow-hidden rounded-t-siaf-md bg-surface' },
  template: `
    <div class="flex items-stretch">
      @if (desborda()) {
        <siaf-button class="flecha" variant="text" size="sm" icon="chevron_left" [iconOnly]="true" ariaLabel="Ver configuraciones anteriores" [disabled]="!hayAntes()" (click)="mover(-1)" data-tabs-antes />
      }
      <siaf-tabs
        class="min-w-0 flex-1"
        [tabs]="pestanas"
        [activeId]="activa"
        [border]="false"
        [filled]="true"
        ariaLabel="Configuraciones del Cuadro Multianual de Necesidades"
        idBase="configuracion"
        (selected)="ir($event)"
      />
      @if (desborda()) {
        <siaf-button class="flecha" variant="text" size="sm" icon="chevron_right" [iconOnly]="true" ariaLabel="Ver más configuraciones" [disabled]="!hayDespues()" (click)="mover(1)" data-tabs-despues />
      }
    </div>
  `,
  styles: `
    /* Las flechas continúan la franja gris de las pestañas, con su línea inferior. */
    .flecha {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      background-color: var(--sys-color-bg-states-light-disabled);
      box-shadow: inset 0 -2px 0 var(--sys-color-divider-strong);
    }
    :host ::ng-deep .flecha .siaf-button:disabled,
    :host ::ng-deep .flecha .siaf-button:disabled::before {
      border-color: transparent !important;
      background-color: transparent !important;
    }
    :host ::ng-deep [role='tablist'] {
      scrollbar-width: none;
    }
    :host ::ng-deep [role='tablist']::-webkit-scrollbar {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionTabsComponent {
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Id de la configuración de la pantalla actual. */
  @Input({ required: true }) activa!: ConfiguracionId;

  readonly pestanas: TabItem[] = PESTANAS.map(({ id, label }) => ({ id, label }));
  /** No entran todas: se muestran las flechas, deshabilitadas en cada extremo para que la fila no cambie de ancho. */
  readonly desborda = signal(false);
  readonly hayAntes = signal(false);
  readonly hayDespues = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const fila = this.fila();
      if (!fila) return;
      const medir = (): void => this.medir();
      fila.addEventListener('scroll', medir, { passive: true });
      const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.mostrarActiva());
      // Cambia de ancho con la ventana y al aparecer las flechas.
      observador?.observe(fila);
      destroyRef.onDestroy(() => {
        fila.removeEventListener('scroll', medir);
        observador?.disconnect();
      });
      this.mostrarActiva();
    });
  }

  ir(tab: TabItem): void {
    const ruta = PESTANAS.find((p) => p.id === tab.id)?.ruta;
    if (ruta) void this.router.navigateByUrl(ruta);
  }

  mover(sentido: 1 | -1): void {
    this.fila()?.scrollBy({ left: sentido * PASO });
    this.medir();
  }

  /** Lleva la pestaña activa al centro de la fila (scrollIntoView movería también la página). */
  private mostrarActiva(): void {
    const fila = this.fila();
    const activa = fila?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (fila && activa) fila.scrollLeft += activa.getBoundingClientRect().left - fila.getBoundingClientRect().left - (fila.clientWidth - activa.offsetWidth) / 2;
    this.medir();
  }

  private medir(): void {
    const fila = this.fila();
    if (!fila) return;
    const desborda = fila.scrollWidth > this.host.nativeElement.clientWidth + 1;
    if (desborda !== this.desborda()) {
      this.desborda.set(desborda);
      // Las flechas quitan ancho a la fila: con ellas ya pintadas se vuelve a centrar.
      setTimeout(() => this.mostrarActiva());
    }
    this.hayAntes.set(fila.scrollLeft > 1);
    this.hayDespues.set(fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 1);
  }

  private fila(): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>('[role="tablist"]');
  }
}

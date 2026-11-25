import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { TabItem, TabsComponent } from '../../../shared/ui/tabs/tabs.component';

export type ConfiguracionId =
  | 'areas-usuarias'
  | 'servicios-basicos'
  | 'fechas-dplaip'
  | 'fechas-entidad'
  | 'precios-diferenciados'
  | 'distribucion-interna'
  | 'alertas'
  | 'ampliacion-fecha';

const PESTANAS: { id: ConfiguracionId; label: string }[] = [
  { id: 'areas-usuarias', label: 'Áreas usuarias' },
  { id: 'servicios-basicos', label: 'Servicios básicos' },
  { id: 'fechas-dplaip', label: 'Fechas DPLAIP' },
  { id: 'fechas-entidad', label: 'Fechas Entidad' },
  { id: 'precios-diferenciados', label: 'Precios diferenciados' },
  { id: 'distribucion-interna', label: 'Distribución interna' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'ampliacion-fecha', label: 'Ampliación de fecha' },
];

/**
 * Pestañas de «Configuración del Cuadro Multianual de Necesidades» (Figma «CMN Programación · Configuración»,
 * página A.0) sobre `siaf-tabs`. Solo la pestaña de la configuración en la que se está queda activa; las demás se
 * ven inactivas y no se pueden elegir: a otra configuración se llega desde el menú de procesos.
 * @usar
 * - Debajo del encabezado de cada pantalla de entrada de una configuración, con `activa` igual a su id.
 */
@Component({
  selector: 'siaf-configuracion-tabs',
  standalone: true,
  imports: [TabsComponent],
  // La fila de pestañas y la tarjeta de debajo forman un solo bloque blanco (Figma «Tabs-configuracion»).
  host: { class: 'block overflow-hidden rounded-t-siaf-md bg-surface' },
  template: `
    <siaf-tabs
      [tabs]="pestanas"
      [activeId]="activa"
      [border]="false"
      ariaLabel="Configuraciones del Cuadro Multianual de Necesidades"
      idBase="configuracion"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionTabsComponent {
  /** Id de la configuración de la pantalla actual: la única pestaña habilitada. */
  @Input({ required: true }) set activa(id: ConfiguracionId) {
    this._activa = id;
    this.pestanas = PESTANAS.map((p) => ({ ...p, disabled: p.id !== id }));
  }
  get activa(): ConfiguracionId {
    return this._activa;
  }
  private _activa!: ConfiguracionId;

  pestanas: TabItem[] = [];
}

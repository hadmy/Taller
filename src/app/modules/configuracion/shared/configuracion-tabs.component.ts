import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import { TabItem, TabsComponent } from '../../../shared/ui/tabs/tabs.component';
import { AREAS_USUARIAS_ROUTE } from '../areas-usuarias/config/areas-usuarias.rutas';
import { DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE } from '../distribucion-interna-presupuesto/config/distribucion-interna-presupuesto.rutas';
import { FECHAS_FASE_CMN_DPLAIP_ROUTE } from '../fechas-fase-cmn-dplaip/config/fechas-fase-cmn-dplaip.rutas';
import { FECHAS_FASE_CMN_ENTIDAD_ROUTE } from '../fechas-fase-cmn-entidad/config/fechas-fase-cmn-entidad.rutas';
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
  | 'ampliacion-fecha';

/** Pestaña de configuración y su ruta (`null`: todavía no tiene pantalla en el taller). */
const PESTANAS: { id: ConfiguracionId; label: string; ruta: string | null }[] = [
  { id: 'areas-usuarias', label: 'Áreas usuarias', ruta: AREAS_USUARIAS_ROUTE },
  { id: 'servicios-basicos', label: 'Servicios básicos', ruta: SERVICIOS_BASICOS_EXCLUIDOS_ROUTE },
  { id: 'fechas-dplaip', label: 'Fechas DPLAIP', ruta: FECHAS_FASE_CMN_DPLAIP_ROUTE },
  { id: 'fechas-entidad', label: 'Fechas Entidad', ruta: FECHAS_FASE_CMN_ENTIDAD_ROUTE },
  { id: 'precios-diferenciados', label: 'Precios diferenciados', ruta: PRECIOS_DIFERENCIADOS_ROUTE },
  { id: 'distribucion-interna', label: 'Distribución interna', ruta: DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE },
  { id: 'alertas', label: 'Alertas', ruta: null },
  { id: 'ampliacion-fecha', label: 'Ampliación de fecha', ruta: null },
];

/**
 * Pestañas de «Configuración del Cuadro Multianual de Necesidades» (Figma «Tabs-configuracion», A.1-RC-006) sobre
 * `siaf-tabs`: el menú entra por «Configuraciones» y desde aquí se pasa de una configuración a otra. «Alertas» y
 * «Ampliación de fecha» se ven deshabilitadas mientras no tengan pantalla.
 * @usar
 * - Debajo del encabezado de cada pantalla de configuración (listas y formularios), con `activa` igual a su id.
 */
@Component({
  selector: 'siaf-configuracion-tabs',
  standalone: true,
  imports: [TabsComponent],
  // La fila de pestañas y la tarjeta de debajo forman un solo bloque blanco.
  host: { class: 'block overflow-hidden rounded-t-siaf-md bg-surface' },
  template: `
    <siaf-tabs
      [tabs]="pestanas"
      [activeId]="activa"
      [border]="false"
      [filled]="true"
      ariaLabel="Configuraciones del Cuadro Multianual de Necesidades"
      idBase="configuracion"
      (selected)="ir($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionTabsComponent {
  private readonly router = inject(Router);

  /** Id de la configuración de la pantalla actual. */
  @Input({ required: true }) activa!: ConfiguracionId;

  readonly pestanas: TabItem[] = PESTANAS.map(({ id, label, ruta }) => ({ id, label, disabled: !ruta }));

  ir(tab: TabItem): void {
    const ruta = PESTANAS.find((p) => p.id === tab.id)?.ruta;
    if (ruta) void this.router.navigateByUrl(ruta);
  }
}

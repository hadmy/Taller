import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import { TabItem, TabsComponent } from '../../../shared/ui/tabs/tabs.component';
import { AREAS_USUARIAS_ROUTE } from '../areas-usuarias/config/areas-usuarias.rutas';
import { DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE } from '../distribucion-interna-presupuesto/config/distribucion-interna-presupuesto.rutas';
import { FECHAS_FASE_CMN_DPLAIP_ROUTE } from '../fechas-fase-cmn-dplaip/config/fechas-fase-cmn-dplaip.rutas';
import { FECHAS_FASE_CMN_ENTIDAD_ROUTE } from '../fechas-fase-cmn-entidad/config/fechas-fase-cmn-entidad.rutas';
import { PRECIOS_DIFERENCIADOS_ROUTE } from '../precios-diferenciados/config/precios-diferenciados.rutas';
import { SERVICIOS_BASICOS_EXCLUIDOS_ROUTE } from '../servicios-basicos-excluidos/config/servicios-basicos-excluidos.rutas';

/** Pestaña de configuración: su ruta, o `null` mientras la configuración no tenga pantalla en el taller. */
interface PestanaConfiguracion extends TabItem {
  ruta: string | null;
}

export type ConfiguracionId =
  | 'areas-usuarias'
  | 'servicios-basicos'
  | 'fechas-dplaip'
  | 'fechas-entidad'
  | 'precios-diferenciados'
  | 'distribucion-interna'
  | 'alertas'
  | 'ampliacion-fecha';

const PESTANAS: PestanaConfiguracion[] = [
  { id: 'areas-usuarias', label: 'Áreas usuarias', ruta: AREAS_USUARIAS_ROUTE },
  { id: 'servicios-basicos', label: 'Servicios básicos', ruta: SERVICIOS_BASICOS_EXCLUIDOS_ROUTE },
  { id: 'fechas-dplaip', label: 'Fechas DPLAIP', ruta: FECHAS_FASE_CMN_DPLAIP_ROUTE },
  { id: 'fechas-entidad', label: 'Fechas Entidad', ruta: FECHAS_FASE_CMN_ENTIDAD_ROUTE },
  { id: 'precios-diferenciados', label: 'Precios diferenciados', ruta: PRECIOS_DIFERENCIADOS_ROUTE },
  { id: 'distribucion-interna', label: 'Distribución interna', ruta: DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE },
  { id: 'alertas', label: 'Alertas', ruta: null, disabled: true },
  { id: 'ampliacion-fecha', label: 'Ampliación de fecha', ruta: null, disabled: true },
];

/**
 * Pestañas de «Configuración del Cuadro Multianual de Necesidades» (Figma «CMN Programación · Configuración»,
 * página A.0): una sola opción «Configuraciones» en el menú y cada configuración como pestaña del cuerpo de la
 * ventana. Usa `siaf-tabs`; al elegir una pestaña navega a su pantalla. «Alertas» y «Ampliación de fecha» se ven
 * deshabilitadas porque esas configuraciones todavía no tienen pantalla en el taller.
 * @usar
 * - Debajo del encabezado de cada pantalla de entrada de una configuración, con `activa` igual a su id.
 */
@Component({
  selector: 'siaf-configuracion-tabs',
  standalone: true,
  imports: [TabsComponent],
  template: `
    <siaf-tabs
      [tabs]="pestanas"
      [activeId]="activa"
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

  readonly pestanas: TabItem[] = PESTANAS;

  ir(tab: TabItem): void {
    const ruta = PESTANAS.find((p) => p.id === tab.id)?.ruta;
    if (ruta && tab.id !== this.activa) void this.router.navigateByUrl(ruta);
  }
}

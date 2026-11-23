import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import {
  QueryReportExportEvent,
  QueryReportPageComponent,
} from '../../../../shared/components/query-report-page/query-report-page.component';
import type { QueryReportParameters, QueryReportResult } from '../../../../shared/types/query-report.types';
import { SeguimientoNacionalApiService } from '../../../reportes/seguimiento-nacional/api/seguimiento-nacional-api.service';
import { SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { configSeguimientoDplaip } from '../config/seguimiento-dplaip.config';
import { PESTANAS_DPLAIP, PestanaDplaip, filasDePestana } from '../utils/seguimiento-dplaip.util';

/** Al entrar: el periodo 2026 en su fase vigente (la 2), sin filtros de nivel, departamento ni estado. */
const PARAMETROS_INICIALES: QueryReportParameters = { periodo: '2026', fase: '2' };

/**
 * «Seguimiento del CMN – DPLAIP» de la sección «Consultas y reportes»: los tableros del seguimiento nacional (estado del
 * Anexo N.º 02, avance acumulado, orden de prelación, ampliaciones, departamentos y detalle) como una pantalla de
 * consulta (`siaf-query-report-page`, Figma 2435:45049). Abre ya consultada y en la vista de gráficas; cada pestaña
 * tiene su tabla y sus gráficos, interactivos. Periodo y fase traen otros datos del backend; niveles, departamentos y
 * estados filtran los ya traídos. «Exportar» baja el CSV de la pestaña o imprime el PDF.
 */
@Component({
  selector: 'siaf-seguimiento-dplaip',
  standalone: true,
  imports: [QueryReportPageComponent],
  template: `
    <siaf-query-report-page
      [config]="config()"
      [parameters]="parametros()"
      initialView="graficas"
      [activeTab]="pestana()"
      [result]="resultado()"
      [loading]="cargando()"
      (queried)="consultar($event)"
      (tabChanged)="cambiarPestana($event)"
      (exported)="exportar($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoDplaipComponent implements OnInit {
  private readonly api = inject(SeguimientoNacionalApiService);

  readonly pestana = signal<PestanaDplaip>('estado');
  readonly parametros = signal<QueryReportParameters>(PARAMETROS_INICIALES);
  readonly datos = signal<SeguimientoNacional | null>(null);
  readonly cargando = signal(false);

  readonly config = computed(() => configSeguimientoDplaip(this.pestana(), String(this.parametros()['periodo'] || '2026')));
  readonly resultado = computed<QueryReportResult | null>(() => {
    const datos = this.datos();
    return datos ? { rows: filasDePestana(this.pestana(), datos, this.parametros()) } : null;
  });

  ngOnInit(): void {
    this.cargar();
  }

  consultar(parametros: QueryReportParameters): void {
    const antes = this.parametros();
    this.parametros.set(parametros);
    if (parametros['periodo'] !== antes['periodo'] || parametros['fase'] !== antes['fase'] || !this.datos()) this.cargar();
  }

  cambiarPestana(id: string): void {
    if (PESTANAS_DPLAIP.some((p) => p.id === id)) this.pestana.set(id as PestanaDplaip);
  }

  private cargar(): void {
    const p = this.parametros();
    this.cargando.set(true);
    this.api.obtener(String(p['periodo'] || '2026'), Number(p['fase'] || 2)).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.datos.set(null);
        this.cargando.set(false);
      },
    });
  }

  /** CSV y Excel bajan el CSV de la pestaña (con BOM, para que Excel respete las tildes); PDF abre la impresión. */
  exportar({ format, rows }: QueryReportExportEvent): void {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const columnas = this.config().columns;
    const celda = (v: string): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = [columnas.map((c) => celda(c.label)).join(','), ...rows.map((r) => columnas.map((c) => celda(r[c.key] ?? '')).join(','))];
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `seguimiento-dplaip-${this.pestana()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

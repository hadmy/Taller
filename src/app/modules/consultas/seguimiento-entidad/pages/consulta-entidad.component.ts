import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import {
  QueryReportExportEvent,
  QueryReportPageComponent,
} from '../../../../shared/components/query-report-page/query-report-page.component';
import type { QueryReportParameters, QueryReportResult } from '../../../../shared/types/query-report.types';
import { SeguimientoNacionalApiService } from '../../../reportes/seguimiento-nacional/api/seguimiento-nacional-api.service';
import { SeguimientoEntidad } from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import { configConsultaEntidad } from '../config/consulta-entidad.config';
import { PESTANAS_ENTIDAD, PestanaEntidad, filasDePestanaEntidad, leerParametros, opcionesDeAreas } from '../utils/consulta-entidad.util';

/**
 * «Seguimiento del CMN – Entidad» de la sección «Consultas y reportes»: el resumen de la Entidad (vista de la Oficina de
 * Abastecimiento) como pantalla de consulta (`siaf-query-report-page`, Figma 2435:45049). Abre ya consultada, en la
 * fase 2 y el año 1, y en la vista de gráficas; cada pestaña tiene su tabla y sus gráficos interactivos. El backend
 * trae la Entidad completa una vez: los parámetros y las pestañas solo recalculan. «Exportar» baja el CSV de la pestaña
 * o imprime el PDF.
 */
@Component({
  selector: 'siaf-consulta-entidad',
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
      (queried)="parametros.set($event)"
      (tabChanged)="cambiarPestana($event)"
      (exported)="exportar($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaEntidadComponent implements OnInit {
  private readonly api = inject(SeguimientoNacionalApiService);

  readonly pestana = signal<PestanaEntidad>('anexos');
  readonly parametros = signal<QueryReportParameters>({ fase: '2', anio: '0' });
  readonly datos = signal<SeguimientoEntidad | null>(null);
  readonly cargando = signal(false);

  private readonly opciones = computed(() => opcionesDeAreas(this.datos()));
  readonly config = computed(() =>
    configConsultaEntidad(this.pestana(), leerParametros(this.parametros()).anio, this.opciones().areas, this.opciones().ates),
  );
  readonly resultado = computed<QueryReportResult | null>(() => {
    const datos = this.datos();
    return datos ? { rows: filasDePestanaEntidad(this.pestana(), datos, this.parametros()) } : null;
  });

  ngOnInit(): void {
    this.cargando.set(true);
    this.api.obtenerEntidad().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cambiarPestana(id: string): void {
    if (PESTANAS_ENTIDAD.some((p) => p.id === id)) this.pestana.set(id as PestanaEntidad);
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
    enlace.download = `seguimiento-entidad-${this.pestana()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

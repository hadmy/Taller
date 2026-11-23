import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import {
  QueryReportExportEvent,
  QueryReportPageComponent,
} from '../../../../shared/components/query-report-page/query-report-page.component';
import type { QueryReportParameters, QueryReportResult } from '../../../../shared/types/query-report.types';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { ANIOS_CMN } from '../../../abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import { DashboardApiService } from '../api/dashboard-api.service';
import { configDashboard } from '../config/dashboard.config';
import { FilaDashboardCmn, FiltrosDashboard } from '../models/dashboard-cmn.model';

/** Valor de «Todos» / «Todas» en los combos: sin filtro. */
const TODOS = 'todos';

/**
 * «Dashboard» de la sección Reportes (Figma «Query and report - Charts result - 01», nodo 22402:16766) con lo que se
 * elabora en «CMN Programación»: el monto programado en el Anexo 01 de cada área usuaria, por ítem y año. Arma
 * `siaf-query-report-page` y abre ya consultado, en la vista de gráficas. Un clic en una barra (un área o un año)
 * filtra los KPI y el otro gráfico. Bajo «Programación del CMN», los combos «Año del CMN» y «Área usuaria» filtran al
 * instante y quedan sincronizados con «Parámetros» (años, áreas y tipo). «Exportar» baja CSV o imprime el PDF.
 */
@Component({
  selector: 'siaf-dashboard-reportes',
  standalone: true,
  imports: [QueryReportPageComponent, TextFieldComponent],
  template: `
    <siaf-query-report-page
      [config]="config()"
      [parameters]="parametros()"
      initialView="graficas"
      [result]="resultado()"
      [loading]="cargando()"
      (queried)="consultar($event)"
      (exported)="exportar($event)"
    >
      <!-- Bajo «Programación del CMN»: año y área usuaria al instante, sincronizados con «Parámetros». -->
      <div reportFilters class="flex flex-wrap gap-siaf-lg" data-filtros-dashboard>
        <div class="w-full max-w-[200px]">
          <siaf-input
            type="select"
            label="Año del CMN"
            [options]="opcionesAnio"
            [value]="anioElegido()"
            [disabled]="cargando()"
            (valueChange)="elegirAnio($any($event).toString())"
          />
        </div>
        <div class="w-full max-w-[420px]">
          <siaf-input
            type="select"
            label="Área usuaria"
            [options]="opcionesAreaCombo()"
            [value]="areaElegida()"
            [disabled]="cargando()"
            (valueChange)="elegirArea($any($event).toString())"
          />
        </div>
      </div>
    </siaf-query-report-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardReportesComponent implements OnInit {
  private readonly api = inject(DashboardApiService);

  /** Áreas usuarias del CMN, tomadas de la primera consulta (sin filtros): opciones del parámetro «Áreas usuarias». */
  private readonly opcionesArea = signal<TextFieldOption[]>([]);
  readonly config = computed(() => configDashboard(this.opcionesArea()));
  /** Al entrar, los tres años del CMN y todas las áreas (sin filtro de área ni tipo). */
  readonly parametros = signal<QueryReportParameters>({ anios: ANIOS_CMN.map(String) });
  readonly resultado = signal<QueryReportResult | null>(null);
  readonly cargando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  /** Combo «Año del CMN»: «Todos» o un año. */
  readonly opcionesAnio: TextFieldOption[] = [{ label: 'Todos', value: TODOS }, ...ANIOS_CMN.map((a) => ({ label: String(a), value: String(a) }))];
  /** Combo «Área usuaria»: «Todas» o una sola. */
  readonly opcionesAreaCombo = computed<TextFieldOption[]>(() => [{ label: 'Todas', value: TODOS }, ...this.opcionesArea()]);

  /** Con un solo año (o una sola área) en los parámetros, el combo lo muestra; si no, «Todos». */
  readonly anioElegido = computed(() => unicoValor(this.parametros()['anios']));
  readonly areaElegida = computed(() => unicoValor(this.parametros()['areas']));

  elegirAnio(anio: string): void {
    if (anio === this.anioElegido()) return;
    this.consultar({ ...this.parametros(), anios: anio !== TODOS ? [anio] : ANIOS_CMN.map(String) });
  }

  elegirArea(area: string): void {
    if (area === this.areaElegida()) return;
    const parametros = { ...this.parametros() };
    if (area !== TODOS) parametros['areas'] = [area];
    else delete parametros['areas'];
    this.consultar(parametros);
  }

  consultar(parametros: QueryReportParameters): void {
    this.parametros.set(parametros);
    this.cargar();
  }

  private cargar(): void {
    const p = this.parametros();
    const lista = (v: string | string[] | undefined): string[] | undefined => (Array.isArray(v) && v.length ? v : undefined);
    const filtros: FiltrosDashboard = {
      anios: lista(p['anios']),
      areas: lista(p['areas']),
      tipo: typeof p['tipo'] === 'string' && p['tipo'] ? p['tipo'] : undefined,
    };
    this.cargando.set(true);
    this.api.filas(filtros).subscribe({
      next: (filas) => {
        if (!this.opcionesArea().length) this.opcionesArea.set(opcionesDeArea(filas));
        this.resultado.set({ rows: filas.map((f) => ({ ...f })) });
        this.cargando.set(false);
      },
      error: () => {
        this.resultado.set({ rows: [] });
        this.cargando.set(false);
      },
    });
  }

  /** CSV y Excel bajan el mismo CSV (con BOM, para que Excel respete las tildes); PDF abre la impresión del navegador. */
  exportar({ format, rows }: QueryReportExportEvent): void {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const columnas = this.config().columns;
    const celda = (v: string): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = [
      columnas.map((c) => celda(c.label)).join(','),
      ...rows.map((r) => columnas.map((c) => celda(r[c.key] ?? '')).join(',')),
    ];
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'dashboard-cmn.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

/** Una opción por área, en el orden en que llegan: «OTI - Oficina de Tecnología de la Información». */
function opcionesDeArea(filas: readonly FilaDashboardCmn[]): TextFieldOption[] {
  const vistas = new Map<string, string>();
  for (const fila of filas) if (!vistas.has(fila.areaSigla)) vistas.set(fila.areaSigla, fila.area);
  return [...vistas].map(([sigla, nombre]) => ({ label: `${sigla} - ${nombre}`, value: sigla }));
}

/** El valor si la lista tiene uno solo; «Todos» si tiene varios o ninguno. */
function unicoValor(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor.length === 1 ? valor[0] : TODOS;
  return valor || TODOS;
}

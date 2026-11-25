import { Directive, computed, inject, signal } from '@angular/core';

import type { QueryReportExportEvent } from '../../../shared/components/query-report-page/query-report-page.component';
import type { QueryReportColumn, QueryReportParameterField, QueryReportParameters } from '../../../shared/types/query-report.types';
import { CampoCondicion, CondicionReporte, FavoritoReporte, textoCondicion } from './favorito-reporte.model';
import { ParametroFavorito } from './favoritos-panel.component';
import { FavoritosReporteApiService } from './favoritos-reporte-api.service';

/**
 * Base de los reportes con favoritos y filtros avanzados: parámetros aplicados, condiciones, lista de favoritos y
 * exportación. La pantalla dice su id, sus campos y qué hacer al cambiar los parámetros.
 */
@Directive()
export abstract class ReporteConFavoritos {
  private readonly favoritosApi = inject(FavoritosReporteApiService);

  /** Id del reporte en los favoritos. */
  protected abstract readonly reporte: string;
  protected abstract readonly campos: () => readonly CampoCondicion[];
  protected abstract readonly camposParametro: () => readonly QueryReportParameterField[];
  /** Otros parámetros aplicados: consultar lo que haga falta. */
  protected abstract alCambiarParametros(parametros: QueryReportParameters, antes: QueryReportParameters | null): void;

  readonly parametros = signal<QueryReportParameters | null>(null);
  readonly vista = signal<'datos' | 'graficas'>('graficas');

  readonly condiciones = signal<CondicionReporte[]>([]);
  readonly panelFiltros = signal(false);

  readonly favoritos = signal<FavoritoReporte[]>([]);
  readonly favorito = signal<FavoritoReporte | null>(null);
  readonly panelFavoritos = signal(false);

  readonly subtitulo = computed(() => (this.favorito() ? `Favorito: ${this.favorito()?.nombre}` : undefined));
  readonly textosCondicion = computed(() => this.condiciones().map((c) => textoCondicion(c, this.campos())));

  /** Los parámetros como se listan al agregar un favorito; los que van juntos, en una línea. */
  readonly parametrosFavorito = computed<ParametroFavorito[]>(() => {
    const p = this.parametros() ?? {};
    const campos = this.camposParametro();
    const texto = (campo: QueryReportParameterField): string => {
      const valor = String(p[campo.key] ?? '');
      return valor ? ((campo.optionsFor?.(p) ?? campo.options ?? []).find((o) => o.value === valor)?.label ?? valor) : '';
    };
    return campos
      .filter((c) => !c.hideApplied)
      .map((campo) => {
        const otro = campos.find((c) => c.key === campo.appliedWith);
        const partes = [texto(campo), otro ? texto(otro) : ''].filter((t) => !!t);
        return { label: campo.appliedLabel ?? campo.label, icon: campo.icon, value: partes.join(' · ') || (campo.emptyLabel ?? this.textoVacio) };
      });
  });
  /** «Todos» o «Todas». */
  protected readonly textoVacio: string = 'Todos';

  protected cargarFavoritos(): void {
    this.favoritosApi.listar(this.reporte).subscribe((favoritos) => {
      this.favoritos.set(favoritos);
      const predeterminado = favoritos.find((f) => f.predeterminado);
      // Solo si no se consultó antes de que llegaran.
      if (predeterminado && !this.parametros()) this.aplicarFavorito(predeterminado);
    });
  }

  consultar(parametros: QueryReportParameters): void {
    this.favorito.set(null);
    this.condiciones.set([]);
    this.aplicarParametros(parametros);
  }

  private aplicarParametros(parametros: QueryReportParameters): void {
    const antes = this.parametros();
    this.parametros.set(parametros);
    this.alCambiarParametros(parametros, antes);
  }

  aplicarCondiciones(condiciones: CondicionReporte[]): void {
    this.condiciones.set(condiciones);
    this.favorito.set(null);
    this.panelFiltros.set(false);
  }

  quitarCondicion(indice: number): void {
    this.condiciones.update((lista) => lista.filter((_, i) => i !== indice));
    this.favorito.set(null);
  }

  aplicarFavorito(favorito: FavoritoReporte): void {
    this.aplicarParametros({ ...favorito.parametros });
    this.condiciones.set(favorito.condiciones);
    this.favorito.set(favorito);
    this.panelFavoritos.set(false);
  }

  guardarFavorito(parte: Partial<FavoritoReporte> & { nombre: string; predeterminado: boolean }): void {
    const favorito: FavoritoReporte = { id: '', parametros: this.parametros() ?? {}, condiciones: this.condiciones(), ...parte };
    this.favoritosApi.guardar(this.reporte, favorito).subscribe((favoritos) => {
      this.favoritos.set(favoritos);
      // El recién agregado es lo que está aplicado.
      if (!favorito.id) this.favorito.set(favoritos.at(-1) ?? null);
    });
  }

  eliminarFavorito(id: string): void {
    this.favoritosApi.eliminar(this.reporte, id).subscribe((favoritos) => {
      this.favoritos.set(favoritos);
      if (this.favorito()?.id === id) this.favorito.set(null);
    });
  }

  /** CSV y Excel bajan el CSV del detalle (con BOM, para que Excel respete las tildes); PDF abre la impresión. */
  protected exportarCsv({ format, rows }: QueryReportExportEvent, columnas: readonly QueryReportColumn[]): void {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const celda = (v: string): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = [columnas.map((c) => celda(c.label)).join(','), ...rows.map((r) => columnas.map((c) => celda(r[c.key] ?? '')).join(','))];
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${this.reporte}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

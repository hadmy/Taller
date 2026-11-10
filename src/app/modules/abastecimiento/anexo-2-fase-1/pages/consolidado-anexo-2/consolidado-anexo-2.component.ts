import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BreadcrumbItem } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PageShellComponent } from '../../../../../shared/components/page-shell/page-shell.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../../shared/ui/empty-state/empty-state.component';
import { StatusTagComponent } from '../../../../../shared/ui/status-tag/status-tag.component';
import { TooltipDirective } from '../../../../../shared/ui/tooltip/tooltip.directive';
import { buildProcessBreadcrumbs } from '../../../../../shared/utils/breadcrumbs.util';
import { Anexo2Fase1ApiService } from '../../api/anexo-2-fase-1-api.service';
import { PROCESS_ID, PROCESS_ROUTE, REQUEST_SEGMENT } from '../../config/anexo-2-fase-1.rutas';
import { ConsolidadoAnexo2 } from '../../models/anexo-2-fase-1.model';

/** Notas al pie del formato del Anexo N.º 02. */
const NOTAS_ANEXO_2 = [
  '1/ La información registrada en el presente Anexo corresponde a campos mínimos y obligatorios que pueden ser ampliados por la Entidad del Sector Público.',
  '2/ El campo de «precio unitario» y «cantidad» se completa solo en el caso de bienes.',
  '3/ La presente información tiene carácter de Declaración Jurada; por lo que, en señal de conformidad y en representación de la Entidad del Sector Público, se suscribe.',
];

/**
 * «Consolidado del Anexo N.º 02 - Fase de Identificación»: hoja aparte de la Solicitud de CMN - Anexo N.º 02, a la que se
 * llega con «Ver consolidado» desde la tarjeta «Registros».
 *
 * Arma el formato «ANEXO N.º 02: CUADRO MULTIANUAL DE NECESIDADES» con los Anexos 01 de la solicitud que la OA ya
 * revisó (los pendientes no entran): filas agrupadas por Fuente / Rubro · Clasificador de gastos · Actividad operativa ·
 * Meta; por ítem, código, tipo, descripción, unidad de medida y precio unitario; por año, los dos semestres con
 * cantidad (solo bienes) y valor; y el total por semestre y del Anexo. Los ítems de un Anexo 01 «No conforme» van
 * resaltados, con la etiqueta del área y el comentario de la observación en el tooltip.
 */
@Component({
  selector: 'siaf-consolidado-anexo-2',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent, PageShellComponent, StatusTagComponent, TooltipDirective],
  templateUrl: './consolidado-anexo-2.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidadoAnexo2Component implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Anexo2Fase1ApiService);

  readonly titulo = 'Consolidado del Anexo N.º 02';
  readonly breadcrumbs: BreadcrumbItem[] = buildProcessBreadcrumbs(PROCESS_ID, PROCESS_ROUTE, this.titulo);
  readonly notas = NOTAS_ANEXO_2;
  readonly semestresPorAnio = [1, 2];

  private solicitudId = '';
  readonly cargando = signal(true);
  readonly noExiste = signal(false);
  readonly consolidado = signal<ConsolidadoAnexo2 | null>(null);

  /** Columnas de los años: 4 por año (cantidad y valor de cada semestre). */
  readonly columnasAnios = computed(() => (this.consolidado()?.anios.length ?? 0) * 4);
  readonly hayFilas = computed(() => (this.consolidado()?.grupos.length ?? 0) > 0);

  ngOnInit(): void {
    this.solicitudId = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.obtenerConsolidado(this.solicitudId).subscribe({
      next: (c) => {
        this.consolidado.set(c);
        this.cargando.set(false);
      },
      error: () => {
        this.noExiste.set(true);
        this.cargando.set(false);
      },
    });
  }

  /** Flecha de la cabecera: vuelve a la solicitud. */
  regresar(): void {
    void this.router.navigate([PROCESS_ROUTE, REQUEST_SEGMENT, this.solicitudId]);
  }

  /** Número con dos decimales, sin símbolo (las celdas de valor del formato). */
  numero(valor: number): string {
    return valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

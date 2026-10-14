import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { ServiciosBasicosExcluidosApiService } from '../api/servicios-basicos-excluidos-api.service';
import { SeleccionarItemsPanelComponent } from '../components/seleccionar-items-panel.component';
import {
  SERVICIOS_BASICOS_EXCLUIDOS_PROCESS_ID,
  SERVICIOS_BASICOS_EXCLUIDOS_ROUTE,
} from '../config/servicios-basicos-excluidos.rutas';
import { ServicioBasico, codigoServicioBasico } from '../models/servicio-basico.model';

/**
 * Configuración de servicios básicos excluidos de la ley (Figma «CMN Programación · Configuración», nodos
 * 4683:1046555 a 4683:1047819): tarjeta «Vincular servicios básicos» con la lupa roja, que abre el panel lateral
 * «Seleccionar ítems»; lo elegido se lista (ÍTEM · DESCRIPCIÓN · VIGENCIA con papelera) y «Grabar» lo guarda.
 */
@Component({
  selector: 'siaf-servicios-basicos-excluidos',
  standalone: true,
  imports: [
    ButtonComponent,
    FormTableSearchComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    SeleccionarItemsPanelComponent,
  ],
  templateUrl: './servicios-basicos-excluidos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiciosBasicosExcluidosComponent implements OnInit {
  private readonly api = inject(ServiciosBasicosExcluidosApiService);

  readonly breadcrumbs = buildProcessBreadcrumbs(
    SERVICIOS_BASICOS_EXCLUIDOS_PROCESS_ID,
    SERVICIOS_BASICOS_EXCLUIDOS_ROUTE,
  );
  readonly codigo = codigoServicioBasico;

  readonly items = signal<ServicioBasico[]>([]);
  readonly guardando = signal(false);
  readonly panelAbierto = signal(false);
  /**
   * Vista de edición: aparecen «Grabar» y la papelera de la columna Vigencia. Se entra con la lupa; al grabar se vuelve
   * a la vista de solo lectura (Figma 5433:351887), con solo ÍTEM y DESCRIPCIÓN.
   */
  readonly editando = signal(false);
  private readonly catalogo = signal<ServicioBasico[]>([]);
  private readonly snapshotInicial = signal<string | null>(null);

  readonly busqueda = signal('');
  readonly page = signal(1);
  readonly rowsPerPage = signal(25);
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  /** Catálogo sin lo ya vinculado. */
  readonly catalogoDisponible = computed(() => {
    const ya = new Set(this.items().map((i) => i.id));
    return this.catalogo().filter((c) => !ya.has(c.id));
  });

  readonly itemsFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.items();
    return this.items().filter((i) => `${codigoServicioBasico(i)} ${i.descripcion}`.toLowerCase().includes(texto));
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.itemsFiltrados().length / this.rowsPerPage())));

  readonly itemsPaginados = computed(() => {
    const inicio = (this.page() - 1) * this.rowsPerPage();
    return this.itemsFiltrados().slice(inicio, inicio + this.rowsPerPage());
  });

  readonly huboCambios = computed(() =>
    hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario({ items: this.items() })),
  );

  ngOnInit(): void {
    this.api.listar().subscribe((items) => {
      this.items.set(items);
      this.snapshotInicial.set(crearSnapshotFormulario({ items }));
    });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.page.set(1);
  }

  cambiarFilasPorPagina(valor: number): void {
    this.rowsPerPage.set(valor);
    this.page.set(1);
  }

  abrirPanel(): void {
    if (!this.catalogo().length) this.api.listarCatalogo().subscribe((c) => this.catalogo.set(c));
    this.editando.set(true);
    this.panelAbierto.set(true);
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  agregarItems(elegidos: ServicioBasico[]): void {
    this.items.update((lista) => [...lista, ...elegidos]);
    this.panelAbierto.set(false);
  }

  quitar(id: string): void {
    this.items.update((lista) => lista.filter((i) => i.id !== id));
    this.page.update((p) => Math.min(p, this.totalPages()));
  }

  grabar(): void {
    if (!this.huboCambios() || this.guardando()) return;
    this.guardando.set(true);
    this.api.guardar(this.items()).subscribe({
      next: () => {
        this.snapshotInicial.set(crearSnapshotFormulario({ items: this.items() }));
        this.guardando.set(false);
        this.editando.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }
}

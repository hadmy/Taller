import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SideNavComponent } from '../../../../shared/ui/side-nav/side-nav.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { ServiciosBasicosExcluidosApiService } from '../api/servicios-basicos-excluidos-api.service';
import { EditarServicioBasicoPanelComponent } from '../components/editar-servicio-basico-panel.component';
import { SeleccionarItemsPanelComponent } from '../components/seleccionar-items-panel.component';
import {
  SERVICIOS_BASICOS_EXCLUIDOS_PROCESS_ID,
  SERVICIOS_BASICOS_EXCLUIDOS_ROUTE,
} from '../config/servicios-basicos-excluidos.rutas';
import { EntidadServicioBasico, ServicioBasico, codigoServicioBasico } from '../models/servicio-basico.model';

/**
 * Configuración de servicios básicos excluidos de la ley (Figma «CMN Programación · Configuración», nodos
 * 4683:1046555 a 4683:1047819). Tres vistas:
 * - **Inicial** (nada grabado): tarjeta «Ítems de servicios basicos» con la lupa roja y el aviso para seleccionar.
 * - **Edición** (tras la lupa, que abre «Seleccionar ítems»): «Grabar» y la tabla ÍTEM · DESCRIPCIÓN · VIGENCIA, con
 *   la papelera para quitar cada ítem.
 * - **Grabada** (Figma 5433:351887): «Vincular servicios basicos» con la tabla ÍTEM · DESCRIPCIÓN · ENTIDADES. En cada
 *   fila, la lupa de documento abre «Entidades asignadas» (solo lectura) y el lápiz abre «Editar servicio básico», donde
 *   se agregan o quitan sus entidades (municipalidades). Aceptar ahí deja cambios y aparece «Grabar».
 */
@Component({
  selector: 'siaf-servicios-basicos-excluidos',
  standalone: true,
  imports: [ConfiguracionTabsComponent, 
    ButtonComponent,
    EditarServicioBasicoPanelComponent,
    FormTableSearchComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    SeleccionarItemsPanelComponent,
    SideNavComponent,
    TooltipDirective,
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
   * Vista de edición (se entra con la lupa): «Grabar» y la columna Vigencia con la papelera. Al grabar se vuelve a la
   * vista grabada.
   */
  readonly editando = signal(false);
  private readonly catalogo = signal<ServicioBasico[]>([]);
  private readonly snapshotInicial = signal<string | null>(null);

  /** Municipalidades asignables (se cargan al abrir la pantalla). */
  readonly entidades = signal<EntidadServicioBasico[]>([]);
  /** Servicio cuyo detalle «Entidades asignadas» (solo lectura) está abierto. */
  readonly detalle = signal<ServicioBasico | null>(null);
  /** Servicio abierto en «Editar servicio básico». */
  readonly enEdicion = signal<ServicioBasico | null>(null);

  /** Entidades asignadas del servicio en detalle, con su nombre. */
  readonly entidadesDelDetalle = computed(() => {
    const ids = new Set(this.detalle()?.entidades ?? []);
    return this.entidades().filter((e) => ids.has(e.id));
  });

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
    this.api.listarEntidades().subscribe((e) => this.entidades.set(e));
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

  /** Texto de la columna ENTIDADES: «-» sin asignar; si no, la cantidad. */
  textoEntidades(item: ServicioBasico): string {
    const n = item.entidades?.length ?? 0;
    if (n === 0) return '-';
    return n === 1 ? '1 entidad' : `${n} entidades`;
  }

  /** «Aceptar» de «Editar servicio básico»: deja al servicio las entidades elegidas; queda por grabar. */
  aplicarEdicion(ids: string[]): void {
    const id = this.enEdicion()?.id;
    this.items.update((lista) => lista.map((i) => (i.id === id ? { ...i, entidades: [...ids] } : i)));
    this.enEdicion.set(null);
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

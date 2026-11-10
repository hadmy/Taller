import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import {
  SelectionColumn,
  SelectionSideNavComponent,
} from '../../../../shared/components/selection-side-nav/selection-side-nav.component';
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
import {
  EntidadServicioBasico,
  ServicioBasico,
  codigoServicioBasico,
  resumenEntidades,
} from '../models/servicio-basico.model';

/**
 * Configuración de servicios básicos excluidos de la ley (Figma «CMN Programación · Configuración», nodos
 * 4683:1046555 a 4683:1047819): tarjeta «Vincular servicios básicos» con la lupa roja, que abre el panel lateral
 * «Seleccionar ítems»; lo elegido se lista (ÍTEM · DESCRIPCIÓN · VIGENCIA con papelera · ENTIDADES) y «Grabar» lo guarda.
 * En la columna «Entidades», el ícono abre «Asignar entidades» (municipalidades del Gobierno Regional de Tumbes en el
 * taller); lo asignado viaja con cada ítem al grabar.
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
    SelectionSideNavComponent,
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
  readonly resumenEntidades = resumenEntidades;

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

  // ─── Asignar entidades ───────────────────────────────────────────
  readonly entidades = signal<EntidadServicioBasico[]>([]);
  /** Ítem al que se le asignan entidades; `null` con el panel cerrado. */
  readonly itemEntidades = signal<ServicioBasico | null>(null);
  readonly seleccionEntidades = signal<string[]>([]);
  readonly busquedaEntidades = signal('');
  readonly columnasEntidades: SelectionColumn<EntidadServicioBasico>[] = [
    { key: 'codigo', label: 'Código', widthClass: 'w-40' },
    { key: 'nombre', label: 'Entidad' },
  ];

  readonly entidadesFiltradas = computed(() => {
    const texto = this.busquedaEntidades().trim().toLowerCase();
    if (!texto) return this.entidades();
    return this.entidades().filter((e) => `${e.codigo} ${e.nombre}`.toLowerCase().includes(texto));
  });

  private readonly nombrePorEntidad = computed(() => new Map(this.entidades().map((e) => [e.id, e.nombre])));

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

  /** Nombres de las entidades asignadas, para el tooltip de la columna. */
  nombresEntidades(item: ServicioBasico): string {
    return (item.entidades ?? []).map((id) => this.nombrePorEntidad().get(id) ?? id).join(', ');
  }

  abrirEntidades(item: ServicioBasico): void {
    this.itemEntidades.set(item);
    this.seleccionEntidades.set([...(item.entidades ?? [])]);
    this.busquedaEntidades.set('');
  }

  cerrarEntidades(): void {
    this.itemEntidades.set(null);
  }

  /** «Aceptar» reemplaza las entidades del ítem (vacío deja «Sin asignar»); se guardan con «Grabar». */
  asignarEntidades(ids: string[]): void {
    const item = this.itemEntidades();
    if (!item) return;
    const orden = this.entidades().map((e) => e.id).filter((id) => ids.includes(id));
    this.items.update((lista) => lista.map((i) => (i.id === item.id ? { ...i, entidades: orden } : i)));
    this.itemEntidades.set(null);
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

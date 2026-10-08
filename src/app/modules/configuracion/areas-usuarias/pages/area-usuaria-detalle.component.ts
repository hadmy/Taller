import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { TabItem, TabsComponent } from '../../../../shared/ui/tabs/tabs.component';
import { TooltipDirective } from '../../../../shared/ui/tooltip/tooltip.directive';
import { SwitchComponent } from '../../../../shared/ui/switch/switch.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { BuscarItemsPanelComponent } from '../components/buscar-items-panel.component';
import { AreaUsuaria, AreaUsuariaItem, BANDERAS_AREA_USUARIA_DETALLE, CatalogoItem } from '../models/area-usuaria.model';

const TAB_ATIENDE = 'atiende';
const TAB_PUEDE_PEDIR = 'puede-pedir';
const TAB_NECESIDADES = 'necesidades';

/**
 * Detalle de un área usuaria (Figma «CMN Programación · Configuración», nodo 5053:75133
 * «Conf-Areas usuarias-03»): tarjeta con el nombre del área, «Cancelar» / «Grabar», las cuatro banderas y, en
 * pestañas, los commodities/ítems que atiende y que puede pedir en el Cuadro Multianual de Necesidades. Se llega acá
 * con «Editar» sobre el área marcada en `AreasUsuariasConfiguracionComponent` (o buscándola con la lupa).
 * «Necesidades Estratégicas» queda deshabilitada, igual que en el diseño.
 */
@Component({
  selector: 'siaf-area-usuaria-detalle',
  standalone: true,
  imports: [
    BuscarItemsPanelComponent,
    ButtonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    PageShellComponent,
    SwitchComponent,
    TabsComponent,
    TooltipDirective,
  ],
  templateUrl: './area-usuaria-detalle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaUsuariaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AreasUsuariasApiService);

  readonly banderas = BANDERAS_AREA_USUARIA_DETALLE;
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly notFound = signal(false);
  readonly area = signal<AreaUsuaria | null>(null);
  readonly items = signal<AreaUsuariaItem[]>([]);
  private readonly snapshotInicial = signal<string | null>(null);

  readonly breadcrumbs = computed(() =>
    buildProcessBreadcrumbs(AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE, this.area()?.denominacion ?? ''),
  );

  /**
   * Regla de pestañas: un área que genera CMN **y** es ATE ve las tres; cualquier otra ve solo «puede pedir» y
   * «Necesidades Estratégicas», ambas activas.
   */
  readonly tabs = computed<TabItem[]>(() => {
    const area = this.area();
    const atiende = !!area?.generaCmn && !!area?.esAte;
    return [
      ...(atiende ? [{ id: TAB_ATIENDE, label: 'Commodities o Items que atiende' }] : []),
      { id: TAB_PUEDE_PEDIR, label: 'Commodities o Items que puede pedir' },
      { id: TAB_NECESIDADES, label: 'Necesidades Estratégicas' },
    ];
  });

  private readonly tabElegida = signal('');
  /** Pestaña elegida, o la primera disponible si la elegida ya no existe (p. ej. al desmarcar ATE). */
  readonly tabActiva = computed(() => {
    const elegida = this.tabElegida();
    return this.tabs().some((t) => t.id === elegida) ? elegida : this.tabs()[0].id;
  });

  seleccionarTab(id: string): void {
    this.tabElegida.set(id);
  }

  /** Commodities/ítems de la pestaña activa. */
  readonly itemsFiltrados = computed(() => this.items().filter((i) => i.tipo === this.tabActiva()));

  /** Sin ítems en la pestaña no hay tabla: se muestra el aviso para elegir con la lupa. */
  readonly hayItemsEnPestana = computed(() => this.items().some((i) => i.tipo === this.tabActiva()));

  // Panel «Buscar commodities u ítems»: catálogo (se trae al abrir por primera vez) sin lo que la pestaña ya tiene.
  readonly panelAbierto = signal(false);
  private readonly catalogo = signal<CatalogoItem[]>([]);
  private contadorNuevos = 0;

  readonly catalogoDisponible = computed(() => {
    const ya = new Set(this.itemsFiltrados().map((i) => `${i.commodity}|${i.item}`));
    return this.catalogo().filter((c) => !ya.has(`${c.commodity}|${c.item}`));
  });

  readonly huboCambios = computed(() =>
    hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario({ area: this.area(), items: this.items() })),
  );

  ngOnInit(): void {
    const areaId = this.route.snapshot.paramMap.get('areaId');
    if (!areaId) {
      this.notFound.set(true);
      return;
    }
    this.cargando.set(true);
    this.api.obtenerDetalle(areaId).subscribe({
      next: ({ area, items }) => {
        this.area.set(area);
        this.items.set(items);
        this.snapshotInicial.set(crearSnapshotFormulario({ area, items }));
        this.cargando.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.cargando.set(false);
      },
    });
  }

  alternar(bandera: keyof AreaUsuaria, marcado: boolean): void {
    const actual = this.area();
    if (!actual) return;
    this.area.set({ ...actual, [bandera]: marcado });
  }

  /** Lupa roja de «Comodities»: abre el panel lateral «Buscar commodities u ítems». */
  abrirPanel(): void {
    if (!this.catalogo().length) this.api.listarCatalogo().subscribe((c) => this.catalogo.set(c));
    this.panelAbierto.set(true);
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  /** «Aceptar» del diálogo: los ítems marcados pasan a la tabla de la pestaña activa, vigentes. */
  agregarItems(elegidos: CatalogoItem[]): void {
    const areaId = this.area()?.id;
    if (!areaId) return;
    const tipo = this.tabActiva() as AreaUsuariaItem['tipo'];
    const nuevos: AreaUsuariaItem[] = elegidos.map((c) => ({
      id: `nuevo-${++this.contadorNuevos}`,
      areaUsuariaId: areaId,
      tipo,
      commodity: c.commodity,
      descripcionCommodity: c.descripcionCommodity,
      item: c.item,
      descripcionItem: c.descripcionItem,
      vigente: true,
    }));
    this.items.update((lista) => [...lista, ...nuevos]);
    this.panelAbierto.set(false);
  }

  /** Switch de la columna «Vigente»: el cambio se guarda con «Grabar». */
  cambiarVigente(itemId: string, vigente: boolean): void {
    this.items.update((lista) => lista.map((i) => (i.id === itemId ? { ...i, vigente } : i)));
  }

  cancelar(): void {
    void this.router.navigateByUrl(AREAS_USUARIAS_ROUTE);
  }

  grabar(): void {
    const actual = this.area();
    if (!actual || !this.huboCambios() || this.guardando()) return;
    this.guardando.set(true);
    const { id, generaCmn, esAte, esOa, esMaa } = actual;
    forkJoin([this.api.guardar([{ id, generaCmn, esAte, esOa, esMaa }]), this.api.guardarItems(id, this.items())]).subscribe({
      next: () => {
        this.snapshotInicial.set(crearSnapshotFormulario({ area: actual, items: this.items() }));
        this.guardando.set(false);
        void this.router.navigateByUrl(AREAS_USUARIAS_ROUTE);
      },
      error: () => this.guardando.set(false),
    });
  }
}

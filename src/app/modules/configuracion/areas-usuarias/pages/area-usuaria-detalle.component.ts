import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { SwitchComponent } from '../../../../shared/ui/switch/switch.component';
import { TabItem, TabsComponent } from '../../../../shared/ui/tabs/tabs.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, AreaUsuariaItem, BANDERAS_AREA_USUARIA_DETALLE } from '../models/area-usuaria.model';

const TAB_COMMODITIES = 'commodities';
const TAB_NECESIDADES = 'necesidades';

/**
 * Detalle de un área usuaria (Figma «CMN Programación · Configuración», nodo 3857:397142
 * «Conf-Areas usuarias-03»): las cuatro banderas del área y, en pestañas, sus commodities/ítems a pedir en el
 * Cuadro Multianual de Necesidades. Se llega acá buscando el área por código o denominación con la lupa de
 * `AreasUsuariasConfiguracionComponent` (navega al primer resultado). «Necesidades Estratégicas» queda
 * deshabilitada, igual que en el diseño.
 */
@Component({
  selector: 'siaf-area-usuaria-detalle',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent, FormTableSearchComponent, PageHeaderComponent, PageShellComponent, SwitchComponent, TabsComponent],
  templateUrl: './area-usuaria-detalle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaUsuariaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AreasUsuariasApiService);

  readonly banderas = BANDERAS_AREA_USUARIA_DETALLE;
  readonly tabs: TabItem[] = [
    { id: TAB_COMMODITIES, label: 'Commodities u Items a pedir' },
    { id: TAB_NECESIDADES, label: 'Necesidades Estratégicas', disabled: true },
  ];
  readonly tabActiva = signal(TAB_COMMODITIES);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly notFound = signal(false);
  readonly busqueda = signal('');
  readonly area = signal<AreaUsuaria | null>(null);
  readonly items = signal<AreaUsuariaItem[]>([]);
  private readonly snapshotInicial = signal<string | null>(null);

  readonly breadcrumbs = computed(() =>
    buildProcessBreadcrumbs(AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE, this.area()?.denominacion ?? ''),
  );

  readonly itemsFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.items();
    return this.items().filter((i) =>
      [i.commodity, i.descripcionCommodity, i.item, i.descripcionItem].some((valor) => valor.toLowerCase().includes(texto)),
    );
  });

  readonly huboCambios = computed(() => hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario(this.area())));

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
        this.snapshotInicial.set(crearSnapshotFormulario(area));
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

  cancelar(): void {
    void this.router.navigateByUrl(AREAS_USUARIAS_ROUTE);
  }

  grabar(): void {
    const actual = this.area();
    if (!actual || !this.huboCambios() || this.guardando()) return;
    this.guardando.set(true);
    const { id, generaCmn, esAte, esOa, esAga } = actual;
    this.api.guardar([{ id, generaCmn, esAte, esOa, esAga }]).subscribe({
      next: () => {
        this.snapshotInicial.set(crearSnapshotFormulario(actual));
        this.guardando.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }
}

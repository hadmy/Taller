import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, BANDERAS_AREA_USUARIA } from '../models/area-usuaria.model';

/**
 * Configuración de fechas de cierre de fase del CMN por área usuaria (Figma «CMN Programación · Configuración»,
 * nodo 3813:375072 «Conf-Areas usuarias-02»): tabla de áreas del pliego con cuatro banderas (¿Genera CMN?, ¿Es ATE?,
 * ¿Es OA?, ¿Es AGA?) que definen su participación en el Cuadro Multianual de Necesidades. «Grabar» solo se habilita
 * con cambios respecto de lo cargado.
 */
@Component({
  selector: 'siaf-areas-usuarias-configuracion',
  standalone: true,
  imports: [ButtonComponent, FormTableSearchComponent, PageHeaderComponent, PageShellComponent],
  templateUrl: './areas-usuarias-configuracion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasUsuariasConfiguracionComponent implements OnInit {
  private readonly api = inject(AreasUsuariasApiService);
  private readonly router = inject(Router);

  readonly breadcrumbs = buildProcessBreadcrumbs(AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE, 'Configuración de áreas usuarias');
  readonly banderas = BANDERAS_AREA_USUARIA;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly busqueda = signal('');
  readonly areas = signal<AreaUsuaria[]>([]);
  private readonly snapshotInicial = signal<string | null>(null);

  readonly areasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.areas();
    return this.areas().filter((a) => a.codigo.toLowerCase().includes(texto) || a.denominacion.toLowerCase().includes(texto));
  });

  readonly huboCambios = computed(() => hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario(this.areas())));

  ngOnInit(): void {
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (areas) => {
        this.areas.set(areas);
        this.snapshotInicial.set(crearSnapshotFormulario(areas));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /** Lupa (o Enter) del buscador: navega al detalle de la primera área que coincida con lo escrito. */
  buscar(texto: string): void {
    this.busqueda.set(texto);
    const encontrada = this.primeraCoincidencia(texto);
    if (encontrada) void this.router.navigateByUrl(`${AREAS_USUARIAS_ROUTE}/${encontrada.id}`);
  }

  private primeraCoincidencia(texto: string): AreaUsuaria | undefined {
    const valor = texto.trim().toLowerCase();
    if (!valor) return undefined;
    return this.areas().find((a) => a.codigo.toLowerCase().includes(valor) || a.denominacion.toLowerCase().includes(valor));
  }

  alternar(areaId: string, bandera: keyof AreaUsuaria, marcado: boolean): void {
    this.areas.update((lista) => lista.map((a) => (a.id === areaId ? { ...a, [bandera]: marcado } : a)));
  }

  cancelar(): void {
    void this.router.navigateByUrl('/panel');
  }

  grabar(): void {
    if (!this.huboCambios() || this.guardando()) return;
    this.guardando.set(true);
    const cambios = this.areas().map(({ id, generaCmn, esAte, esOa, esAga }) => ({ id, generaCmn, esAte, esOa, esAga }));
    this.api.guardar(cambios).subscribe({
      next: () => {
        this.snapshotInicial.set(crearSnapshotFormulario(this.areas()));
        this.guardando.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }
}

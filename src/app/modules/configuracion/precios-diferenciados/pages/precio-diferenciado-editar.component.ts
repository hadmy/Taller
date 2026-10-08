import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { SwitchComponent } from '../../../../shared/ui/switch/switch.component';
import { TextFieldComponent } from '../../../../shared/ui/text-field/text-field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { crearSnapshotFormulario, hayCambiosRespectoAlSnapshot } from '../../../../shared/utils/form-snapshot.util';
import { PreciosDiferenciadosApiService } from '../api/precios-diferenciados-api.service';
import { PRECIOS_DIFERENCIADOS_PROCESS_ID, PRECIOS_DIFERENCIADOS_ROUTE } from '../config/precios-diferenciados.rutas';
import { PrecioArea, PrecioDiferenciado } from '../models/precio-diferenciado.model';

/**
 * «Editar precios diferenciados» de un CUBSO (Figma «CMN Programación · Configuración», nodos 4683:868331,
 * 4683:868368 y 4683:868405): una fila por precio con área, descripción, monto y vigencia; «Añadir» agrega una fila
 * vacía. «Grabar» se habilita con cambios y todas las filas completas (área y monto mayor que cero), y confirma con el
 * modal «¿Grabar registro?» (nodo 4683:868245); al grabar vuelve a la lista. Se llega con «Editar» sobre el CUBSO
 * marcado en `PreciosDiferenciadosComponent`.
 */
@Component({
  selector: 'siaf-precio-diferenciado-editar',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent, ModalComponent, PageHeaderComponent, PageShellComponent, SwitchComponent, TextFieldComponent],
  templateUrl: './precio-diferenciado-editar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrecioDiferenciadoEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PreciosDiferenciadosApiService);

  readonly breadcrumbs = buildProcessBreadcrumbs(PRECIOS_DIFERENCIADOS_PROCESS_ID, PRECIOS_DIFERENCIADOS_ROUTE, 'Editar precios diferenciados');

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly notFound = signal(false);
  readonly cubso = signal<PrecioDiferenciado | null>(null);
  readonly precios = signal<PrecioArea[]>([]);
  readonly modalGrabarAbierto = signal(false);
  private readonly snapshotInicial = signal<string | null>(null);
  private contadorNuevos = 0;

  readonly huboCambios = computed(() => hayCambiosRespectoAlSnapshot(this.snapshotInicial(), crearSnapshotFormulario(this.precios())));

  /** Una fila está completa con área y monto mayor que cero (la descripción es opcional). */
  readonly filasCompletas = computed(() => this.precios().every((p) => !!p.area.trim() && p.monto !== null && p.monto > 0));

  readonly puedeGrabar = computed(() => this.huboCambios() && this.filasCompletas() && !this.guardando());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('cubsoId');
    if (!id) {
      this.notFound.set(true);
      return;
    }
    this.cargando.set(true);
    this.api.obtener(id).subscribe({
      next: (cubso) => {
        const precios = cubso.precios ?? [];
        this.cubso.set(cubso);
        this.precios.set(precios);
        this.snapshotInicial.set(crearSnapshotFormulario(precios));
        this.cargando.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.cargando.set(false);
      },
    });
  }

  /** «Añadir»: fila nueva, vacía y vigente. */
  anadirFila(): void {
    this.precios.update((lista) => [...lista, { id: `nuevo-${++this.contadorNuevos}`, area: '', descripcion: '', monto: null, vigente: true }]);
  }

  cambiarTexto(id: string, campo: 'area' | 'descripcion', valor: string | number | string[]): void {
    this.actualizar(id, { [campo]: String(valor ?? '') });
  }

  cambiarMonto(id: string, valor: string | number | string[]): void {
    const texto = String(valor ?? '').trim();
    const numero = texto === '' ? null : Number(texto);
    this.actualizar(id, { monto: numero === null || Number.isNaN(numero) ? null : numero });
  }

  cambiarVigencia(id: string, vigente: boolean): void {
    this.actualizar(id, { vigente });
  }

  private actualizar(id: string, cambios: Partial<PrecioArea>): void {
    this.precios.update((lista) => lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }

  /** Vuelve a la lista de CUBSO (y no al estado inicial con el «+»). */
  cancelar(): void {
    this.volverALista();
  }

  private volverALista(): void {
    void this.router.navigateByUrl(PRECIOS_DIFERENCIADOS_ROUTE, { state: { mostrarLista: true } });
  }

  abrirModalGrabar(): void {
    if (this.puedeGrabar()) this.modalGrabarAbierto.set(true);
  }

  /** «Aceptar» del modal: graba los precios y vuelve a la lista, que muestra la nueva cantidad. */
  confirmarGrabar(): void {
    const cubso = this.cubso();
    if (!cubso || !this.puedeGrabar()) return;
    this.guardando.set(true);
    const precios = this.precios().map(({ area, descripcion, monto, vigente }) => ({ area, descripcion, monto, vigente }));
    this.api.guardarPrecios(cubso.id, precios).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalGrabarAbierto.set(false);
        this.volverALista();
      },
      error: () => this.guardando.set(false),
    });
  }
}

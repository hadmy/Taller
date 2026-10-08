import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ReadonlyFieldComponent } from '../../../../shared/ui/readonly-field/readonly-field.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { FormTableSearchComponent } from '../../../../shared/components/form-table-search/form-table-search.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { DistribucionInternaPresupuestoApiService, PlantillaDistribucion } from '../api/distribucion-interna-presupuesto-api.service';
import {
  DISTRIBUCION_INTERNA_PRESUPUESTO_PROCESS_ID,
  DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE,
} from '../config/distribucion-interna-presupuesto.rutas';
import {
  DistribucionFilaOu,
  DistribucionGenerica,
  DistribucionInternaPresupuesto,
  PRESUPUESTOS_FASE,
  totalAsignadoFila,
} from '../models/distribucion-interna-presupuesto.model';

/**
 * «+» de Distribución interna de presupuesto (Figma, nodos 4216:225574 y 4216:224375): elige un año y un
 * presupuesto de fase y, con el área usuaria titular que recibió la APM ya cargada, reparte el techo presupuestal
 * de cada genérica entre las áreas usuarias y ATE. Si el año y la fase ya tenían una distribución configurada, la
 * carga para editarla; si es nueva, arranca en 0 y se crea «En Proceso» al grabar.
 */
@Component({
  selector: 'siaf-distribucion-interna-presupuesto-form',
  standalone: true,
  imports: [AlertComponent, ButtonComponent, DecimalPipe, FormTableSearchComponent, PageHeaderComponent, PageShellComponent, PaginationComponent, ReadonlyFieldComponent, TextFieldComponent],
  templateUrl: './distribucion-interna-presupuesto-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistribucionInternaPresupuestoFormComponent implements OnInit {
  private readonly api = inject(DistribucionInternaPresupuestoApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly breadcrumbs = buildProcessBreadcrumbs(
    DISTRIBUCION_INTERNA_PRESUPUESTO_PROCESS_ID,
    DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE,
    'Distribución interna de presupuesto',
  );

  readonly opcionesPresupuestoFase: TextFieldOption[] = PRESUPUESTOS_FASE.map((p) => ({ label: p.label, value: p.key }));

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly anios = signal<DistribucionInternaPresupuesto[]>([]);
  readonly plantilla = signal<PlantillaDistribucion | null>(null);
  readonly anioSeleccionado = signal('');
  readonly presupuestoFaseSeleccionado = signal('');
  readonly busqueda = signal('');

  readonly genericas = signal<DistribucionGenerica[]>([]);
  readonly filas = signal<DistribucionFilaOu[]>([]);

  /** Años del selector: el actual y los cuatro siguientes (sin años pasados). */
  readonly opcionesAnio: TextFieldOption[] = (() => {
    const actual = new Date().getFullYear();
    const anios: TextFieldOption[] = [];
    for (let anio = actual; anio <= actual + 4; anio++) {
      anios.push({ label: String(anio), value: String(anio) });
    }
    return anios;
  })();

  readonly filasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return this.filas();
    return this.filas().filter(
      (f) => f.codigoOu.toLowerCase().includes(texto) || f.denominacion.toLowerCase().includes(texto),
    );
  });

  readonly areaUsuariaTitular = computed(() => this.plantilla()?.areaUsuariaTitular ?? null);
  readonly entidadUe = computed(() => this.plantilla()?.entidadUe ?? '');
  readonly periodo = computed(() => this.plantilla()?.periodo ?? null);

  /** «3, 4 y 7»: los códigos de las genéricas habilitadas, en una lista legible. */
  readonly genericasHabilitadas = computed(() => {
    const codigos = this.genericas().map((g) => g.codigo);
    if (codigos.length <= 1) return codigos.join('');
    return `${codigos.slice(0, -1).join(', ')} y ${codigos[codigos.length - 1]}`;
  });

  /**
   * Genéricas en las que lo asignado a las áreas no titulares supera el presupuesto recibido (la APM), con el monto
   * del exceso. Mientras haya alguna, se muestra el aviso y no se puede grabar.
   */
  readonly excesos = computed(() =>
    this.genericas()
      .map((g) => ({ codigo: g.codigo, exceso: this.asignadoNoTitular(this.filas(), g.codigo) - g.presupuestoRecibido }))
      .filter((e) => e.exceso > 0),
  );

  readonly puedeGrabar = computed(
    () => !!this.anioSeleccionado() && !!this.presupuestoFaseSeleccionado() && this.excesos().length === 0 && !this.guardando(),
  );

  ngOnInit(): void {
    this.cargando.set(true);
    const anioPreseleccionado = this.route.snapshot.queryParamMap.get('anio');
    forkJoin({ anios: this.api.listar(), plantilla: this.api.plantilla() }).subscribe({
      next: ({ anios, plantilla }) => {
        this.anios.set(anios);
        this.plantilla.set(plantilla);
        this.cargando.set(false);
        if (anioPreseleccionado) {
          this.anioSeleccionado.set(anioPreseleccionado);
          const existente = anios.find((a) => String(a.anio) === anioPreseleccionado);
          if (existente) this.seleccionarPresupuestoFase(existente.presupuestoFase);
        }
      },
      error: () => this.cargando.set(false),
    });
  }

  seleccionarAnio(valor: string): void {
    this.anioSeleccionado.set(valor);
    this.presupuestoFaseSeleccionado.set('');
    this.genericas.set([]);
    this.filas.set([]);
  }

  seleccionarPresupuestoFase(valor: string): void {
    this.presupuestoFaseSeleccionado.set(valor);
    const plantilla = this.plantilla();
    if (!plantilla) return;

    const existente = this.anios().find((a) => String(a.anio) === this.anioSeleccionado() && a.presupuestoFase === valor);
    this.genericas.set(plantilla.genericas);
    this.filas.set(
      this.conSaldoTitular(
        plantilla.filas.map((fila) => {
          const existenteFila = existente?.filas.find((f) => f.id === fila.id);
          return { ...fila, montos: existenteFila ? { ...existenteFila.montos } : { ...fila.montos } };
        }),
      ),
    );
  }

  /** Suma de lo asignado en una genérica a las áreas que no son la titular. */
  private asignadoNoTitular(filas: DistribucionFilaOu[], codigo: string): number {
    return filas.filter((f) => !f.esTitular).reduce((suma, f) => suma + (f.montos[codigo] || 0), 0);
  }

  /**
   * El área titular se queda con el saldo de cada genérica: lo recibido menos lo asignado a las demás áreas (nunca
   * negativo; si se excede, queda en 0 y el exceso se avisa).
   */
  private conSaldoTitular(filas: DistribucionFilaOu[]): DistribucionFilaOu[] {
    const saldos: Record<string, number> = {};
    for (const g of this.genericas()) saldos[g.codigo] = Math.max(0, g.presupuestoRecibido - this.asignadoNoTitular(filas, g.codigo));
    return filas.map((f) => (f.esTitular ? { ...f, montos: { ...f.montos, ...saldos } } : f));
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  totalAsignado(fila: DistribucionFilaOu): number {
    return totalAsignadoFila(fila);
  }

  actualizarMonto(filaId: string, codigoGenerica: string, valor: string): void {
    const numero = Number(valor);
    this.filas.update((lista) =>
      this.conSaldoTitular(
        lista.map((f) => (f.id === filaId ? { ...f, montos: { ...f.montos, [codigoGenerica]: Number.isFinite(numero) ? numero : 0 } } : f)),
      ),
    );
  }

  cancelar(): void {
    void this.router.navigateByUrl(DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE);
  }

  grabar(): void {
    if (!this.puedeGrabar()) return;
    this.guardando.set(true);
    this.api
      .guardar({
        anio: Number(this.anioSeleccionado()),
        presupuestoFase: this.presupuestoFaseSeleccionado(),
        filas: this.filas().map((f) => ({ id: f.id, montos: f.montos })),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          void this.router.navigateByUrl(DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE);
        },
        error: () => this.guardando.set(false),
      });
  }
}

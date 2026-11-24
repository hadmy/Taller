import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { ConfiguracionTabsComponent } from '../../shared/configuracion-tabs.component';
import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, AreaUsuariaItem } from '../models/area-usuaria.model';

/** Texto del modal «¿Grabar?» de la transferencia (Figma A.1-RC-089). */
export const MSJ_CONFIRMAR_TRANSFERIR = 'Los registros se grabarán correctamente';

/**
 * «Transferir datos» de un área usuaria inactiva (Figma «5. TRANSFERIR DATA», A.1-RC-086 a RC-090): muestra el área
 * de origen (inactiva, solo lectura), se elige el área de destino (activa) y se marcan los commodities o ítems a
 * transferir. «Grabar» pide confirmación y, al aceptar, vuelve a la lista con el aviso de éxito; «Cancelar» vuelve
 * sin cambios. Se llega con el ícono «Transferir datos» de la fila inactiva o con un clic en esa fila.
 */
@Component({
  selector: 'siaf-transferir-datos-area',
  standalone: true,
  imports: [ButtonComponent, ConfiguracionTabsComponent, ModalComponent, PageHeaderComponent, PageShellComponent, TextFieldComponent],
  templateUrl: './transferir-datos-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferirDatosAreaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AreasUsuariasApiService);

  readonly msjConfirmar = MSJ_CONFIRMAR_TRANSFERIR;
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly notFound = signal(false);
  readonly origen = signal<AreaUsuaria | null>(null);
  readonly items = signal<AreaUsuariaItem[]>([]);
  readonly areas = signal<AreaUsuaria[]>([]);
  readonly destinoId = signal('');
  readonly seleccion = signal<Set<string>>(new Set());
  readonly modalGrabar = signal(false);

  readonly breadcrumbs = computed(() =>
    buildProcessBreadcrumbs(AREAS_USUARIAS_PROCESS_ID, AREAS_USUARIAS_ROUTE, 'Transferir datos'),
  );

  /** Destinos posibles: áreas activas distintas del origen. */
  readonly opcionesDestino = computed<TextFieldOption[]>(() =>
    this.areas()
      .filter((a) => a.activo !== false && a.id !== this.origen()?.id)
      .map((a) => ({ label: a.denominacion, value: a.id })),
  );

  readonly todas = computed(() => this.items().length > 0 && this.seleccion().size === this.items().length);
  readonly algunas = computed(() => this.seleccion().size > 0 && !this.todas());
  readonly puedeGrabar = computed(() => !!this.destinoId() && this.seleccion().size > 0 && !this.guardando());

  ngOnInit(): void {
    const areaId = this.route.snapshot.paramMap.get('areaId');
    if (!areaId) {
      this.notFound.set(true);
      return;
    }
    this.cargando.set(true);
    forkJoin([this.api.obtenerDetalle(areaId), this.api.listar()]).subscribe({
      next: ([{ area, items }, areas]) => {
        this.origen.set(area);
        this.items.set(items);
        this.areas.set(areas);
        this.cargando.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.cargando.set(false);
      },
    });
  }

  elegirDestino(valor: string | number | string[]): void {
    this.destinoId.set(String(valor ?? ''));
  }

  alternar(id: string, marcado: boolean): void {
    this.seleccion.update((s) => {
      const next = new Set(s);
      if (marcado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  alternarTodas(marcadas: boolean): void {
    this.seleccion.set(marcadas ? new Set(this.items().map((i) => i.id)) : new Set());
  }

  cancelar(): void {
    void this.router.navigateByUrl(AREAS_USUARIAS_ROUTE);
  }

  pedirGrabar(): void {
    if (this.puedeGrabar()) this.modalGrabar.set(true);
  }

  confirmarGrabar(): void {
    const origen = this.origen();
    if (!origen || this.guardando()) return;
    this.guardando.set(true);
    this.api.transferir(origen.id, this.destinoId(), [...this.seleccion()]).subscribe({
      next: ({ transferidos }) => {
        this.guardando.set(false);
        this.modalGrabar.set(false);
        const destino = this.areas().find((a) => a.id === this.destinoId())?.denominacion ?? '';
        void this.router.navigateByUrl(AREAS_USUARIAS_ROUTE, {
          state: { aviso: `Se transfirieron ${transferidos} registros a ${destino}` },
        });
      },
      error: () => {
        this.guardando.set(false);
        this.modalGrabar.set(false);
      },
    });
  }
}

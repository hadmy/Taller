import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { DateTimePickerComponent } from '../../../../shared/ui/date-time-picker/date-time-picker.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { FechasFaseCmnDplaipApiService } from '../api/fechas-fase-cmn-dplaip-api.service';
import {
  FECHAS_FASE_CMN_DPLAIP_LISTA_ROUTE,
  FECHAS_FASE_CMN_DPLAIP_PROCESS_ID,
  FECHAS_FASE_CMN_DPLAIP_ROUTE,
} from '../config/fechas-fase-cmn-dplaip.rutas';
import { FaseFecha, FechaFaseCmnDplaip, faseFechaVacia } from '../models/fecha-fase-cmn.model';

/**
 * «+» / Editar de Configuración de fechas de fase del CMN - DPLAIP (Figma «CMN Programación · Configuración», nodos
 * 5205:126726 a 5214:171379): elige un año (desde el actual) y configura la fecha de inicio y fin de sus tres fases.
 * Si el año ya tenía fechas configuradas, las carga para editarlas; si es nuevo, lo crea «En Proceso». «Grabar» pide
 * confirmación («¿Grabar?») antes de guardar.
 */
@Component({
  selector: 'siaf-fecha-fase-cmn-dplaip-form',
  standalone: true,
  imports: [ButtonComponent, DateTimePickerComponent, ModalComponent, PageHeaderComponent, PageShellComponent, PaginationComponent, TextFieldComponent],
  templateUrl: './fecha-fase-cmn-dplaip-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FechaFaseCmnDplaipFormComponent implements OnInit {
  private readonly api = inject(FechasFaseCmnDplaipApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly breadcrumbs = buildProcessBreadcrumbs(
    FECHAS_FASE_CMN_DPLAIP_PROCESS_ID,
    FECHAS_FASE_CMN_DPLAIP_ROUTE,
    'Configuración de fechas de fase del CMN para la entidad',
  );

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly modalGrabarAbierto = signal(false);
  readonly anios = signal<FechaFaseCmnDplaip[]>([]);
  readonly anioSeleccionado = signal('');
  /** Se entró con «Editar» sobre un año de la lista. */
  readonly editando = signal(false);

  readonly fase1 = signal<FaseFecha>(faseFechaVacia());
  readonly fase2 = signal<FaseFecha>(faseFechaVacia());
  readonly fase3 = signal<FaseFecha>(faseFechaVacia());

  /** Años del selector: el actual y los cuatro siguientes (no se ofrecen años pasados). */
  readonly opcionesAnio: TextFieldOption[] = (() => {
    const actual = new Date().getFullYear();
    const anios: TextFieldOption[] = [];
    for (let anio = actual; anio <= actual + 4; anio++) {
      anios.push({ label: String(anio), value: String(anio) });
    }
    return anios;
  })();

  readonly puedeGrabar = computed(() => !!this.anioSeleccionado() && !this.guardando());

  ngOnInit(): void {
    this.cargando.set(true);
    const anioPreseleccionado = this.route.snapshot.queryParamMap.get('anio');
    this.editando.set(!!anioPreseleccionado);
    this.api.listar().subscribe({
      next: (anios) => {
        this.anios.set(anios);
        this.cargando.set(false);
        // Pantalla principal (Figma): abre con el primer año configurado ya elegido y sus fechas cargadas.
        // Sin año guardado, propone el actual con el borrador de fechas del diseño (Fase 3 sin fechas).
        const inicial = anioPreseleccionado ?? String(new Date().getFullYear());
        this.seleccionarAnio(inicial);
        if (!anioPreseleccionado && !anios.some((a) => String(a.anio) === inicial)) {
          this.fase1.set({ inicio: `${inicial}-01-01`, fin: `${inicial}-04-09` });
          this.fase2.set({ inicio: `${inicial}-07-01`, fin: `${inicial}-09-30` });
        }
      },
      error: () => this.cargando.set(false),
    });
  }

  seleccionarAnio(valor: string): void {
    this.anioSeleccionado.set(valor);
    const existente = this.anios().find((a) => String(a.anio) === valor);
    this.fase1.set(existente ? { ...existente.fase1 } : faseFechaVacia());
    this.fase2.set(existente ? { ...existente.fase2 } : faseFechaVacia());
    this.fase3.set(existente ? { ...existente.fase3 } : faseFechaVacia());
  }

  actualizarFase(fase: 'fase1' | 'fase2' | 'fase3', campo: 'inicio' | 'fin', valor: string): void {
    this[fase].update((actual) => ({ ...actual, [campo]: valor }));
  }

  /** «Cancelar»: descarta lo editado y regresa a la lista de fechas de fase (Figma 5110:402515). */
  cancelar(): void {
    void this.router.navigateByUrl(FECHAS_FASE_CMN_DPLAIP_LISTA_ROUTE);
  }

  /** «Grabar»: abre la confirmación; el guardado ocurre al aceptarla. */
  grabar(): void {
    if (this.puedeGrabar()) this.modalGrabarAbierto.set(true);
  }

  confirmarGrabar(): void {
    if (!this.puedeGrabar()) return;
    this.guardando.set(true);
    this.api
      .guardar({
        anio: Number(this.anioSeleccionado()),
        fase1: this.fase1(),
        fase2: this.fase2(),
        fase3: this.fase3(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.modalGrabarAbierto.set(false);
          // Figma 5110:402515: al grabar se pasa a la lista de años (con el año recién configurado «En Proceso»).
          void this.router.navigateByUrl(FECHAS_FASE_CMN_DPLAIP_LISTA_ROUTE);
        },
        error: () => this.guardando.set(false),
      });
  }
}

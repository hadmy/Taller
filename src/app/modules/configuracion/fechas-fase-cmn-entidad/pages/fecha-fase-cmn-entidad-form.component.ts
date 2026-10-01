import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { DateTimePickerComponent } from '../../../../shared/ui/date-time-picker/date-time-picker.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { FechasFaseCmnEntidadApiService } from '../api/fechas-fase-cmn-entidad-api.service';
import { FECHAS_FASE_CMN_ENTIDAD_PROCESS_ID, FECHAS_FASE_CMN_ENTIDAD_ROUTE } from '../config/fechas-fase-cmn-entidad.rutas';
import { FaseFecha, FechaFaseCmnEntidad, faseFechaVacia } from '../models/fecha-fase-cmn.model';

/**
 * «+» de Configuración de fechas de fase del CMN para la entidad (Figma «Configuracion_fechas_02/03»): elige un
 * año y configura la fecha de inicio y fin de sus tres fases. Si el año ya tenía fechas configuradas, las carga
 * para editarlas; si es nuevo, lo crea «En Proceso» al grabar.
 */
@Component({
  selector: 'siaf-fecha-fase-cmn-entidad-form',
  standalone: true,
  imports: [ButtonComponent, DateTimePickerComponent, PageHeaderComponent, PageShellComponent, TextFieldComponent],
  templateUrl: './fecha-fase-cmn-entidad-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FechaFaseCmnEntidadFormComponent implements OnInit {
  private readonly api = inject(FechasFaseCmnEntidadApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly breadcrumbs = buildProcessBreadcrumbs(
    FECHAS_FASE_CMN_ENTIDAD_PROCESS_ID,
    FECHAS_FASE_CMN_ENTIDAD_ROUTE,
    'Configuración de fechas de fase del CMN para la entidad',
  );

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly anios = signal<FechaFaseCmnEntidad[]>([]);
  readonly anioSeleccionado = signal('');

  readonly fase1 = signal<FaseFecha>(faseFechaVacia());
  readonly fase2 = signal<FaseFecha>(faseFechaVacia());
  readonly fase3 = signal<FaseFecha>(faseFechaVacia());

  /** Años del selector: el anterior y los cuatro siguientes al actual. */
  readonly opcionesAnio: TextFieldOption[] = (() => {
    const actual = new Date().getFullYear();
    const anios: TextFieldOption[] = [];
    for (let anio = actual - 1; anio <= actual + 4; anio++) {
      anios.push({ label: String(anio), value: String(anio) });
    }
    return anios;
  })();

  readonly puedeGrabar = computed(() => !!this.anioSeleccionado() && !this.guardando());

  ngOnInit(): void {
    this.cargando.set(true);
    const anioPreseleccionado = this.route.snapshot.queryParamMap.get('anio');
    this.api.listar().subscribe({
      next: (anios) => {
        this.anios.set(anios);
        this.cargando.set(false);
        if (anioPreseleccionado) this.seleccionarAnio(anioPreseleccionado);
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

  cancelar(): void {
    void this.router.navigateByUrl(FECHAS_FASE_CMN_ENTIDAD_ROUTE);
  }

  grabar(): void {
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
          void this.router.navigateByUrl(FECHAS_FASE_CMN_ENTIDAD_ROUTE);
        },
        error: () => this.guardando.set(false),
      });
  }
}

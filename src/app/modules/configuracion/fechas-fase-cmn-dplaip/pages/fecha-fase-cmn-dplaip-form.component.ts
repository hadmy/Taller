import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { DateTimePickerComponent } from '../../../../shared/ui/date-time-picker/date-time-picker.component';
import { TextFieldComponent, TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { buildProcessBreadcrumbs } from '../../../../shared/utils/breadcrumbs.util';
import { FechasFaseCmnDplaipApiService } from '../api/fechas-fase-cmn-dplaip-api.service';
import { FECHAS_FASE_CMN_DPLAIP_PROCESS_ID, FECHAS_FASE_CMN_DPLAIP_ROUTE } from '../config/fechas-fase-cmn-dplaip.rutas';
import { ETAPAS_FASE, EtapasFase, FechaFaseCmnDplaip, etapasFaseVacia, fechasDeFase } from '../models/fecha-fase-cmn.model';

/** Una de las tres fases del formulario, con su etiqueta fija (Figma, nodo 3591:262078). */
interface FaseForm {
  key: 'fase1' | 'fase2' | 'fase3';
  titulo: string;
  subtitulo: string;
}

const FASES_FORM: FaseForm[] = [
  { key: 'fase1', titulo: 'Fase 1: Fase de identificación', subtitulo: '' },
  { key: 'fase2', titulo: 'Fase 2: Fase de identificación', subtitulo: '' },
  { key: 'fase3', titulo: 'Fase 3: Fase de identificación', subtitulo: '' },
];

/** dd/mm/aaaa a partir de una fecha ISO (yyyy-mm-dd); vacío si no hay fecha. */
function aFechaPe(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return anio && mes && dia ? `${dia}-${mes}-${anio}` : '';
}

/**
 * «+» de Configuración de fechas de fase del CMN - DPLAIP (Figma, nodo 3591:262078): elige un año y, por cada una
 * de sus tres fases, configura la fecha de inicio y fin de sus tres etapas (Anexo 1 ATEs/No ATEs, Anexo 1 No ATEs,
 * Anexo 2 consolidación). Si el año ya tenía fechas configuradas, las carga para editarlas; si es nuevo, lo crea
 * «En Proceso» al grabar.
 */
@Component({
  selector: 'siaf-fecha-fase-cmn-dplaip-form',
  standalone: true,
  imports: [ButtonComponent, DateTimePickerComponent, PageHeaderComponent, PageShellComponent, TextFieldComponent],
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
    'Configuración de fechas de fase del CMN - DPLAIP',
  );

  readonly fases = FASES_FORM;
  readonly etapas = ETAPAS_FASE;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly anios = signal<FechaFaseCmnDplaip[]>([]);
  readonly anioSeleccionado = signal('');

  readonly fase1 = signal<EtapasFase>(etapasFaseVacia());
  readonly fase2 = signal<EtapasFase>(etapasFaseVacia());
  readonly fase3 = signal<EtapasFase>(etapasFaseVacia());

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
    this.fase1.set(existente ? estructuraClonada(existente.fase1) : etapasFaseVacia());
    this.fase2.set(existente ? estructuraClonada(existente.fase2) : etapasFaseVacia());
    this.fase3.set(existente ? estructuraClonada(existente.fase3) : etapasFaseVacia());
  }

  private faseSignal(fase: FaseForm['key']) {
    return fase === 'fase1' ? this.fase1 : fase === 'fase2' ? this.fase2 : this.fase3;
  }

  /**
   * Fase 1 marca el cronograma «oficial»: al grabar una de sus fechas, Fase 2 y Fase 3 la heredan automáticamente
   * (siguen siendo editables después, cada una por su cuenta) para no repetir las mismas fechas tres veces.
   */
  actualizarEtapa(fase: FaseForm['key'], etapa: keyof EtapasFase, campo: 'inicio' | 'fin', valor: string): void {
    this.faseSignal(fase).update((actual) => ({
      ...actual,
      [etapa]: { ...actual[etapa], [campo]: valor },
    }));
    if (fase === 'fase1') {
      this.fase2.update((actual) => ({ ...actual, [etapa]: { ...actual[etapa], [campo]: valor } }));
      this.fase3.update((actual) => ({ ...actual, [etapa]: { ...actual[etapa], [campo]: valor } }));
    }
  }

  /** «(dd-mm-aaaa / dd-mm-aaaa)»: primera y última fecha con valor entre las tres etapas de la fase; vacío si ninguna tiene fecha. */
  rangoResumen(fase: FaseForm['key']): string {
    const fechas = fechasDeFase(this.faseSignal(fase)()).sort();
    if (!fechas.length) return '';
    return `(${aFechaPe(fechas[0])} / ${aFechaPe(fechas[fechas.length - 1])})`;
  }

  cancelar(): void {
    void this.router.navigateByUrl(FECHAS_FASE_CMN_DPLAIP_ROUTE);
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
          void this.router.navigateByUrl(FECHAS_FASE_CMN_DPLAIP_ROUTE);
        },
        error: () => this.guardando.set(false),
      });
  }
}

function estructuraClonada(fase: EtapasFase): EtapasFase {
  return { etapa1: { ...fase.etapa1 }, etapa2: { ...fase.etapa2 }, etapa3: { ...fase.etapa3 } };
}

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
import { FechasFaseCmnEntidadApiService } from '../api/fechas-fase-cmn-entidad-api.service';
import {
  FECHAS_FASE_CMN_ENTIDAD_LISTA_ROUTE,
  FECHAS_FASE_CMN_ENTIDAD_PROCESS_ID,
  FECHAS_FASE_CMN_ENTIDAD_ROUTE,
} from '../config/fechas-fase-cmn-entidad.rutas';
import { ETAPAS_FASE, EtapasFase, FechaFaseCmnEntidad, etapasFaseVacia, fechasDeFase } from '../models/fecha-fase-cmn.model';

/** Una de las tres fases del formulario, con su etiqueta fija (Figma 5110:410301). */
interface FaseForm {
  key: 'fase1' | 'fase2' | 'fase3';
  titulo: string;
}

const FASES_FORM: FaseForm[] = [
  { key: 'fase1', titulo: 'Fase 1: Fase de identificación' },
  { key: 'fase2', titulo: 'Fase 2: Fase de identificación' },
  { key: 'fase3', titulo: 'Fase 3: Fase de identificación' },
];

/** dd-mm-aaaa a partir de una fecha ISO (yyyy-mm-dd); vacío si no hay fecha. */
function aFechaPe(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return anio && mes && dia ? `${dia}-${mes}-${anio}` : '';
}

/**
 * «+» / Editar de Configuración de fechas de fase del CMN para la entidad (Figma «CMN Programación · Configuración»,
 * nodos 5110:410301 a 5110:410649): elige un año y, por cada una de sus tres fases, configura la fecha de inicio y fin
 * de sus tres etapas (Anexo 1 ATEs/No ATEs, Anexo 1 No ATEs, Anexo 2 consolidación). Si el año ya tenía fechas, las
 * carga para editarlas; si es nuevo, lo crea «En Proceso» al grabar. «Grabar» pide confirmación («¿Grabar?»).
 */
@Component({
  selector: 'siaf-fecha-fase-cmn-entidad-form',
  standalone: true,
  imports: [
    ButtonComponent,
    DateTimePickerComponent,
    ModalComponent,
    PageHeaderComponent,
    PageShellComponent,
    PaginationComponent,
    TextFieldComponent,
  ],
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

  readonly fases = FASES_FORM;
  readonly etapas = ETAPAS_FASE;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly modalGrabarAbierto = signal(false);
  readonly anios = signal<FechaFaseCmnEntidad[]>([]);
  readonly anioSeleccionado = signal('');
  /** Se entró con «Editar» sobre un año de la lista. */
  readonly editando = signal(false);

  readonly fase1 = signal<EtapasFase>(etapasFaseVacia());
  readonly fase2 = signal<EtapasFase>(etapasFaseVacia());
  readonly fase3 = signal<EtapasFase>(etapasFaseVacia());

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
        if (anioPreseleccionado) this.seleccionarAnio(anioPreseleccionado);
      },
      error: () => this.cargando.set(false),
    });
  }

  seleccionarAnio(valor: string): void {
    this.anioSeleccionado.set(valor);
    const existente = this.anios().find((a) => String(a.anio) === valor);
    if (existente) {
      this.fase1.set(estructuraClonada(existente.fase1));
      this.fase2.set(estructuraClonada(existente.fase2));
      this.fase3.set(estructuraClonada(existente.fase3));
      return;
    }
    // Año nuevo (Figma 5110:410243): propone el borrador del diseño; la Fase 3 queda sin fechas.
    const fase1 = etapasFaseVacia();
    fase1.etapa1.inicio = `${valor}-01-01`;
    fase1.etapa3.fin = `${valor}-04-09`;
    const fase2 = etapasFaseVacia();
    fase2.etapa1.inicio = `${valor}-07-01`;
    fase2.etapa3.fin = `${valor}-09-30`;
    this.fase1.set(fase1);
    this.fase2.set(fase2);
    this.fase3.set(etapasFaseVacia());
  }

  private faseSignal(fase: FaseForm['key']) {
    return fase === 'fase1' ? this.fase1 : fase === 'fase2' ? this.fase2 : this.fase3;
  }

  /** Valor de una fecha de una etapa de una fase, para el selector. */
  valor(fase: FaseForm['key'], etapa: keyof EtapasFase, campo: 'inicio' | 'fin'): string {
    return this.faseSignal(fase)()[etapa][campo];
  }

  actualizarEtapa(fase: FaseForm['key'], etapa: keyof EtapasFase, campo: 'inicio' | 'fin', valor: string): void {
    this.faseSignal(fase).update((actual) => ({
      ...actual,
      [etapa]: { ...actual[etapa], [campo]: valor },
    }));
  }

  /** «(dd-mm-aaaa / dd-mm-aaaa)»: primera y última fecha con valor entre las tres etapas de la fase; vacío si ninguna tiene fecha. */
  rangoResumen(fase: FaseForm['key']): string {
    const fechas = fechasDeFase(this.faseSignal(fase)()).sort();
    if (!fechas.length) return '';
    return `(${aFechaPe(fechas[0])} / ${aFechaPe(fechas[fechas.length - 1])})`;
  }

  /** «Cancelar»: descarta lo editado y regresa a la lista de años. */
  cancelar(): void {
    void this.router.navigateByUrl(FECHAS_FASE_CMN_ENTIDAD_LISTA_ROUTE);
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
          void this.router.navigateByUrl(FECHAS_FASE_CMN_ENTIDAD_LISTA_ROUTE);
        },
        error: () => this.guardando.set(false),
      });
  }
}

function estructuraClonada(fase: EtapasFase): EtapasFase {
  return { etapa1: { ...fase.etapa1 }, etapa2: { ...fase.etapa2 }, etapa3: { ...fase.etapa3 } };
}

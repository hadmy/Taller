/**
 * Cálculos del reporte «Seguimiento de la programación del CMN» (Entidad, Figma C.2): vista de la Oficina de
 * Abastecimiento y, con un área usuaria elegida, la de esa área. Funciones puras, sin Angular.
 */
import type { QueryReportParameters, QueryReportRow } from '../../../../shared/types/query-report.types';
import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { ESTADOS_ANEXO_01, FaseEntidad, REVISIONES_OA, SeguimientoEntidad, SituacionAnexo01 } from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import {
  FiltrosEntidad,
  SeleccionEntidad,
  areasFiltradas,
  avancePorArea,
  esAprobado,
  necesidadesRemitidas,
  situacionDe,
  tienePendiente,
} from '../../../reportes/seguimiento-nacional/utils/seguimiento-entidad.util';
import { diasEntre, fechaVisible, formatoMonto, porcentaje, sumarDias } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';

/** «Año 1 (2027)»: el periodo 2026 programa 2027 a 2029. */
export const etiquetaAnioEntidad = (k: number): string => `Año ${k + 1} (${2027 + k})`;

/** Estado del Anexo N° 01 de un área; sin registrarlo está «Pendiente». */
export const estadoAnexo01 = (s: SituacionAnexo01): string => (s.estado < 0 ? 'Pendiente' : ESTADOS_ANEXO_01[s.estado]);

/** Qué hizo la OA con el Anexo N° 01 aprobado o, si no lo está, en qué quedó su ampliación de etapa. */
export function revisionOa(s: SituacionAnexo01): string {
  if (esAprobado(s) && s.revision !== null) return s.revision === 2 ? `${REVISIONES_OA[2]} · v${s.version}` : REVISIONES_OA[s.revision];
  return s.ampliacion ? `Ampliación ${s.ampliacion.toLowerCase()}` : '–';
}

export function leerFiltros(p: QueryReportParameters): FiltrosEntidad {
  const area = String(p['area'] ?? '');
  return {
    fase: Number(p['fase'] || 2),
    vista: area ? 'AU' : 'OA',
    areaVista: area,
    area: '',
    ate: String(p['ate'] ?? ''),
    generica: String(p['generica'] ?? ''),
    anio: Number(p['anio'] || 0),
  };
}

/** Solo las áreas con el «Estado del anexo» pedido; vacío es todas. */
export function conEstado(datos: SeguimientoEntidad, p: QueryReportParameters): SeguimientoEntidad {
  const estado = p['estado'];
  if (!estado) return datos;
  const fase = Number(p['fase'] || 2);
  return { ...datos, areas: datos.areas.filter((a) => estadoAnexo01(situacionDe(datos, fase, a.codigo)) === estado) };
}

export const faseEntidad = (datos: SeguimientoEntidad, numero: number): FaseEntidad => datos.fases.find((f) => f.numero === numero) ?? datos.fases[0];

/** Opciones de los parámetros que dependen de los datos. */
export function opcionesDeAreas(datos: SeguimientoEntidad | null): { areas: TextFieldOption[]; ates: TextFieldOption[] } {
  const todas = { label: 'Todas', value: '' };
  const opcion = (a: { codigo: string; nombre: string }): TextFieldOption => ({ label: `${a.codigo} ${a.nombre}`, value: a.codigo });
  return { areas: [todas, ...(datos?.areas ?? []).map(opcion)], ates: [todas, ...(datos?.areas ?? []).filter((a) => a.esAte).map(opcion)] };
}

export const nombreArea = (datos: SeguimientoEntidad, codigo: string): string => {
  const area = datos.areas.find((a) => a.codigo === codigo);
  return area ? `${area.codigo} ${area.nombre}` : codigo;
};

export function notaEntidad(datos: SeguimientoEntidad, f: FiltrosEntidad): string {
  const corte = `fecha de corte ${fechaVisible(datos.fechaCorte)}`;
  if (f.vista === 'AU') return `${datos.entidad} · vista del Área usuaria ${nombreArea(datos, f.areaVista)} · ${corte}`;
  const fase = faseEntidad(datos, f.fase);
  return `${datos.entidad} · vista de la Oficina de Abastecimiento · ${corte} · Fase ${f.fase}: ${fechaVisible(fase.inicio)} al ${fechaVisible(fase.fin)}`;
}

export interface KpiEntidad {
  title: string;
  amount: string;
  /** `null`: sin barra, no es parte de un total. */
  progress: number | null;
}

export function kpisEntidad(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad, anexo: string): KpiEntidad[] {
  const situaciones = areasFiltradas(datos, f, s).map((a) => situacionDe(datos, f.fase, a.codigo));
  const aprobadas = situaciones.filter(esAprobado);
  const remitidas = necesidadesRemitidas(datos, f, s).filter((n) => !s.ate || n.ate === s.ate);
  const ajustes: KpiEntidad = { title: 'Anexos N° 01 con ajustes', amount: String(situaciones.filter((x) => x.ajustado).length), progress: null };
  const ate: KpiEntidad = {
    title: 'Necesidades remitidas a ATE',
    amount: String(remitidas.length),
    progress: remitidas.length ? porcentaje(remitidas.filter((n) => n.remision === 1).length, remitidas.length) : null,
  };
  if (f.vista === 'AU') {
    return [
      ajustes,
      ate,
      { title: 'Ampliaciones de etapa', amount: String(situaciones.filter((x) => x.ampliacion).length), progress: null },
      { title: 'Mi Anexo N° 01', amount: situaciones[0] ? estadoAnexo01(situaciones[0]) : '–', progress: null },
    ];
  }
  const revisadas = aprobadas.filter((x) => (x.revision ?? 0) > 0).length;
  return [
    { title: 'Anexos N° 01 aprobados', amount: `${aprobadas.length} / ${situaciones.length}`, progress: porcentaje(aprobadas.length, situaciones.length) },
    ajustes,
    ate,
    { title: `Anexo N° ${anexo}`, amount: ['Aprobado', 'Elaborado', 'Pendiente'][f.fase - 1] ?? 'Pendiente', progress: porcentaje(revisadas, aprobadas.length) },
  ];
}

export interface EtapaCalendario {
  nombre: string;
  detalle: string;
  texto: string;
  situacion: 'concluida' | 'en-curso' | 'por-iniciar';
  /** Posición y ancho dentro de la fase, de 0 a 100. */
  desde: number;
  ancho: number;
  consolidacion: boolean;
}

export interface CalendarioFase {
  rango: string;
  etapas: EtapaCalendario[];
  marcas: { texto: string; en: number }[];
  /** Fecha de corte dentro de la fase; `null` si cae fuera. */
  hoy: { texto: string; en: number } | null;
}

const NOMBRES = ['Etapa 1 · Programación de necesidades', 'Etapa 2 · ATE y aprobación del Anexo N° 01', 'Etapa 3 · Consolidación del Anexo N° 02'];
const corta = (s: string): string => fechaVisible(s).slice(0, 5);

/** Las tres etapas de la fase sobre su periodo rector. */
export function calendarioDeFase(fase: FaseEntidad, corte: string): CalendarioFase {
  // Cada etapa dura hasta el final de su último día: por eso el día siguiente.
  const largo = diasEntre(fase.inicio, fase.fin) + 1;
  const en = (s: string): number => (diasEntre(fase.inicio, s) / largo) * 100;
  const etapas = fase.etapas.map((e, i): EtapaCalendario => {
    const dias = diasEntre(e.inicio, e.fin) + 1;
    const situacion = diasEntre(e.fin, corte) > 0 ? 'concluida' : diasEntre(e.inicio, corte) >= 0 ? 'en-curso' : 'por-iniciar';
    return {
      nombre: NOMBRES[i],
      detalle: situacion === 'concluida' ? 'Concluida' : situacion === 'en-curso' ? `En curso · vence ${corta(e.fin)}` : `Por iniciar · ${corta(e.inicio)}`,
      texto: `${corta(e.inicio)} – ${corta(e.fin)} · ${dias} días`,
      situacion,
      desde: en(e.inicio),
      ancho: en(sumarDias(e.fin, 1)) - en(e.inicio),
      consolidacion: i === 2,
    };
  });
  const fechas = [...new Set([fase.inicio, ...fase.etapas.map((e) => e.fin), fase.fin])].sort();
  const dentro = diasEntre(fase.inicio, corte) >= 0 && diasEntre(corte, fase.fin) >= 0;
  return {
    rango: `Fase ${fase.numero} · periodo rector ${fechaVisible(fase.inicio)} – ${fechaVisible(fase.fin)}`,
    etapas,
    marcas: fechas.map((s) => ({ texto: corta(s), en: s === fase.inicio ? 0 : en(sumarDias(s, 1)) })),
    hoy: dentro ? { texto: `Hoy ${fechaVisible(corte)}`, en: en(corte) } : null,
  };
}

/** Pendientes de la Oficina de Abastecimiento. */
export function pendientesOa(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): { total: number; partes: { texto: string; cantidad: number }[]; vence: string } {
  const situaciones = areasFiltradas(datos, f, s).map((a) => situacionDe(datos, f.fase, a.codigo));
  const cuantas = (i: number): number => situaciones.filter((x) => tienePendiente(x, i)).length;
  const partes = [
    { texto: 'Anexos N° 01 aprobados por revisar', cantidad: cuantas(0) },
    { texto: 'Ampliaciones de plazo de etapa por evaluar', cantidad: cuantas(1) },
    { texto: 'Áreas usuarias sin Anexo N° 01 aprobado', cantidad: cuantas(2) },
    { texto: 'Necesidades estratégicas por aprobar', cantidad: f.fase === 2 ? 1 : 0 },
  ];
  return { total: partes.reduce((t, p) => t + p.cantidad, 0), partes, vence: `Etapa 2 vence ${fechaVisible(faseEntidad(datos, f.fase).etapas[1].fin)}` };
}

/** Filas del avance por área usuaria, de mayor a menor monto. */
export function filasAreas(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): QueryReportRow[] {
  return avancePorArea(datos, f, s)
    .sort((a, b) => b.monto - a.monto)
    .map((x) => ({
      codigo: x.area.codigo,
      area: `${x.area.codigo} ${x.area.nombre}`,
      ate: x.area.esAte ? 'ATE' : '–',
      estado: estadoAnexo01(x.situacion),
      revision: revisionOa(x.situacion),
      necesidades: String(x.necesidades),
      monto: formatoMonto(x.monto),
      uso: `${Math.round(x.uso * 100)} %`,
    }));
}

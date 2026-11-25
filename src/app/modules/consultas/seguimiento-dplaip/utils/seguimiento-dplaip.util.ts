/**
 * Cálculos del reporte «Seguimiento nacional del CMN Programación» (DPLAIP, Figma C.1) a partir del seguimiento nacional
 * que entrega el backend simulado. Funciones puras, sin Angular.
 */
import type { QueryReportParameters, QueryReportRow } from '../../../../shared/types/query-report.types';
import { COLOR } from '../../graficos/estados-anexo';
import { ESTADO_APROBADO, EntidadSeguimiento, FaseRectora, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { avanceAcumulado, diasEntre, fechaFinEntidad, fechaVisible, formatoMonto, sumarDias } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';

/** Grupo de estados del anexo en los gráficos (un «Observado» cuenta con los elaborados); el índice es el valor de `EntidadSeguimiento.estado`. */
export const ESTADOS_REPORTE = ['Pendiente', 'Elaborado', 'Verificado / Validado', 'Aprobado'] as const;

export const COLORES_ESTADO = [COLOR.advertencia, COLOR.neutro, COLOR.info, COLOR.exito] as const;

/** Estado del anexo de la Entidad, uno por uno. El backend simulado los da agrupados: se separan por su código, siempre igual. */
export function estadoAnexo(e: EntidadSeguimiento): string {
  const n = Number(e.codigo) || 0;
  if (e.estado === 2) return n % 2 ? 'Verificado' : 'Validado';
  if (e.estado === 1) return n % 12 === 0 ? 'Observado' : 'Elaborado';
  return ESTADOS_REPORTE[e.estado];
}

/** Estados de la solicitud de ampliación de plazo; `valor` es como llega del backend. */
export const ESTADOS_AMPLIACION_REPORTE = [
  { valor: 'En evaluación – MAA', estado: 'Elaborado', detalle: 'Por verificar · MAA', etiqueta: 'Elaborado · por verificar MAA', color: COLOR.neutro },
  { valor: 'En evaluación – DPLAIP', estado: 'Verificado', detalle: 'Por validar · DPLAIP', etiqueta: 'Verificado · por validar DPLAIP', color: COLOR.info },
  { valor: 'En evaluación – DGA', estado: 'Validado', detalle: 'Por aprobar · DGA', etiqueta: 'Validado · por aprobar DGA', color: COLOR.info },
  { valor: 'Observada', estado: 'Observado', detalle: '', etiqueta: 'Observado', color: COLOR.advertencia },
  { valor: 'Aprobada', estado: 'Aprobado', detalle: '', etiqueta: 'Aprobado', color: COLOR.exito },
  { valor: 'Rechazada', estado: 'Rechazado', detalle: '', etiqueta: 'Rechazado', color: COLOR.peligro },
] as const;

export const SIN_AMPLIACION = 'No registra';

/** «Elaborado», «Aprobado»… o «No registra». */
export const estadoAmpliacion = (valor: string | null): string => ESTADOS_AMPLIACION_REPORTE.find((e) => e.valor === valor)?.estado ?? SIN_AMPLIACION;

/** Entidades que entran con los parámetros de la consulta; vacío es «Todos». */
export function entidadesDeParametros(datos: SeguimientoNacional, p: QueryReportParameters): EntidadSeguimiento[] {
  return datos.entidades.filter(
    (e) =>
      (!p['nivel'] || e.nivel === p['nivel']) &&
      (!p['subgrupo'] || e.subgrupo === p['subgrupo']) &&
      (!p['area'] || e.area === p['area']) &&
      (!p['departamento'] || e.departamento === p['departamento']) &&
      (!p['estado'] || estadoAnexo(e) === p['estado']),
  );
}

/** Lo elegido con clic en los gráficos («Filtros por selección»), con los textos que se muestran. */
export interface SeleccionReporte {
  nivel?: string;
  estado?: string;
  departamento?: string;
  ampliacion?: string;
}

/** Entidades de la selección; un gráfico ignora su propia dimensión para seguir mostrando todas sus categorías. */
export function aplicarSeleccion(
  entidades: readonly EntidadSeguimiento[],
  s: SeleccionReporte,
  ignorar: readonly (keyof SeleccionReporte)[] = [],
): EntidadSeguimiento[] {
  const usa = (clave: keyof SeleccionReporte): boolean => !!s[clave] && !ignorar.includes(clave);
  return entidades.filter(
    (e) =>
      (!usa('nivel') || e.nivel === s.nivel) &&
      (!usa('estado') || ESTADOS_REPORTE[e.estado] === s.estado) &&
      (!usa('departamento') || e.departamento === s.departamento) &&
      (!usa('ampliacion') || estadoAmpliacion(e.ampliacion) === s.ampliacion),
  );
}

/** Solicitudes de ampliación de plazo por estado, con su total. */
export function contarAmpliaciones(entidades: readonly EntidadSeguimiento[]): { total: number; cantidades: number[] } {
  const cantidades = ESTADOS_AMPLIACION_REPORTE.map((a) => entidades.filter((e) => e.ampliacion === a.valor).length);
  return { total: cantidades.reduce((a, b) => a + b, 0), cantidades };
}

/**
 * Avance acumulado sobre toda la fase, cada cinco días, más la fecha de corte y la fecha fin rectora; después del corte no
 * hay dato (`NaN`: la línea termina ahí). Vacío si la fase no inicia.
 */
export function avanceDeLaFase(entidades: readonly EntidadSeguimiento[], datos: SeguimientoNacional): { dia: string; valor: number }[] {
  const fase = faseDe(datos);
  const puntos = avanceAcumulado(entidades, fase, datos.fechaCorte);
  if (!puntos.length) return [];
  const largo = diasEntre(fase.inicio, fase.fin);
  const dias = new Set([puntos.length - 1, largo]);
  for (let d = 0; d <= largo; d += 5) dias.add(d);
  return [...dias].sort((a, b) => a - b).map((d) => ({ dia: fechaVisible(sumarDias(fase.inicio, d)).slice(0, 5), valor: puntos[d]?.valor ?? NaN }));
}

export const faseDe = (datos: SeguimientoNacional, numero = datos.fase): FaseRectora => datos.fases.find((f) => f.numero === numero) ?? datos.fases[0];

/** «Fecha de corte de datos: … · Fase 2: … del … al …», y en las gráficas cuánto falta para la fecha fin rectora. */
export function notaDeCorte(datos: SeguimientoNacional, conDias: boolean): string {
  const fase = faseDe(datos);
  const nota = `Fecha de corte de datos: ${fechaVisible(datos.fechaCorte)} · Fase ${fase.numero}: ${fase.nombre} del ${fechaVisible(fase.inicio)} al ${fechaVisible(fase.fin)}`;
  if (!conDias) return nota;
  if (diasEntre(fase.inicio, datos.fechaCorte) < 0) return `${nota} · La fase aún no inicia`;
  const dias = diasEntre(datos.fechaCorte, fase.fin);
  return `${nota} · ${dias > 0 ? `${dias} días para la fecha fin rectora` : 'Fecha fin rectora cumplida'} (${fechaVisible(fase.fin)})`;
}

/** Filas del detalle por Entidad, como textos de la tabla. */
export function filasDetalle(entidades: readonly EntidadSeguimiento[], datos: SeguimientoNacional): QueryReportRow[] {
  const fase = faseDe(datos);
  return entidades.map((e) => ({
    codigo: e.codigo,
    entidad: e.nombre,
    nivel: e.nivel,
    departamento: e.departamento,
    estado: estadoAnexo(e),
    anexos01: `${e.anexos01Aprobados} / ${e.areasUsuarias}`,
    monto: formatoMonto(e.montos[0]),
    fechaFin: fechaVisible(fechaFinEntidad(e, fase)) + (e.ampliacion === 'Aprobada' ? ' (ampliada)' : ''),
    dias: e.estado === ESTADO_APROBADO ? '–' : String(Math.max(0, diasEntre(datos.fechaCorte, fechaFinEntidad(e, fase)))),
    ampliacion: estadoAmpliacion(e.ampliacion),
  }));
}

/** «Año 1 (2027)»: el periodo 2026 programa 2027 a 2029. */
export const etiquetaAnio = (periodo: string, k: number): string => `Año ${k + 1} (${Number(periodo) + 1 + k})`;

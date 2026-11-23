/**
 * Cálculos del «Seguimiento nacional del CMN»: filtros (combos y selección en los gráficos) y lo que pinta cada
 * visual. Funciones puras, sin Angular.
 */
import {
  DEPARTAMENTOS,
  ESTADO_APROBADO,
  EntidadSeguimiento,
  EstadoAnexo02,
  FaseRectora,
  NIVELES_GOBIERNO,
  ORDENES_PRELACION,
} from '../models/seguimiento-nacional.model';

/** Combos de la cabecera: vacío es «Todos». */
export interface FiltrosCombos {
  nivel: string;
  subgrupo: string;
  area: string;
  departamento: string;
  /** '' o el estado del Anexo N.º 02 ('0' a '3'). */
  estado: string;
}

/** Lo elegido con clic en los visuales («Filtros por selección»). */
export interface SeleccionVisual {
  nivel?: string;
  estado?: EstadoAnexo02;
  departamento?: string;
  ampliacion?: string;
}

export type ClaveSeleccion = keyof SeleccionVisual;

const fecha = (s: string): Date => new Date(`${s}T00:00:00`);
export const diasEntre = (desde: string, hasta: string): number => Math.round((fecha(hasta).getTime() - fecha(desde).getTime()) / 864e5);
export function sumarDias(s: string, dias: number): string {
  const d = fecha(s);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** aaaa-mm-dd → dd/mm/aaaa */
export const fechaVisible = (s: string): string => s.split('-').reverse().join('/');

export const formatoEntero = (n: number): string => Math.round(n).toLocaleString('en-US');
export const formatoMonto = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const porcentaje = (a: number, b: number): number => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const porcentajeVisible = (a: number, b: number): string => (b ? `${porcentaje(a, b).toFixed(1)} %` : '–');

/**
 * Entidades que pasan los combos y la selección en los visuales, salvo las claves de `ignorar`: un visual ignora su
 * propia selección para seguir mostrando todas sus categorías (resaltando la elegida).
 */
export function filtrarEntidades(
  entidades: readonly EntidadSeguimiento[],
  combos: FiltrosCombos,
  seleccion: SeleccionVisual,
  ignorar: readonly ClaveSeleccion[] = [],
): EntidadSeguimiento[] {
  const usa = (clave: ClaveSeleccion): boolean => !ignorar.includes(clave) && seleccion[clave] !== undefined;
  return entidades.filter(
    (e) =>
      (!combos.nivel || e.nivel === combos.nivel) &&
      (!combos.subgrupo || e.subgrupo === combos.subgrupo) &&
      (!combos.area || e.area === combos.area) &&
      (!combos.departamento || e.departamento === combos.departamento) &&
      (combos.estado === '' || e.estado === Number(combos.estado)) &&
      (!usa('nivel') || e.nivel === seleccion.nivel) &&
      (!usa('estado') || e.estado === seleccion.estado) &&
      (!usa('departamento') || e.departamento === seleccion.departamento) &&
      (!usa('ampliacion') || grupoAmpliacion(e.ampliacion) === seleccion.ampliacion),
  );
}

/** Cuántas Entidades hay en cada estado del Anexo N.º 02. */
export function contarEstados(entidades: readonly EntidadSeguimiento[]): [number, number, number, number] {
  const c: [number, number, number, number] = [0, 0, 0, 0];
  for (const e of entidades) c[e.estado]++;
  return c;
}

/** Estado por nivel de gobierno, más la fila «Total»: una fila por nivel y una columna por estado. */
export function estadosPorNivel(entidades: readonly EntidadSeguimiento[]): { nivel: string; conteo: [number, number, number, number] }[] {
  const filas = NIVELES_GOBIERNO.map((nivel) => ({ nivel: nivel as string, conteo: contarEstados(entidades.filter((e) => e.nivel === nivel)) }));
  return [...filas, { nivel: 'Total', conteo: contarEstados(entidades) }];
}

/** % acumulado de Entidades con el Anexo N.º 02 aprobado en cada día de la fase, hasta la fecha de corte. */
export function avanceAcumulado(entidades: readonly EntidadSeguimiento[], fase: FaseRectora, fechaCorte: string): { dia: string; valor: number }[] {
  const largo = diasEntre(fase.inicio, fase.fin);
  const limite = Math.min(largo, diasEntre(fase.inicio, fechaCorte));
  if (limite < 1) return [];
  const porDia = new Array(largo + 1).fill(0);
  for (const e of entidades) if (e.estado === ESTADO_APROBADO && e.diaAprobacion !== null) porDia[Math.min(e.diaAprobacion, largo)]++;
  const total = entidades.length || 1;
  const puntos: { dia: string; valor: number }[] = [];
  let acumulado = 0;
  for (let d = 0; d <= limite; d++) {
    acumulado += porDia[d];
    puntos.push({ dia: fechaVisible(sumarDias(fase.inicio, d)).slice(0, 5), valor: Math.round((acumulado / total) * 1000) / 10 });
  }
  return puntos;
}

/** Monto programado de cada orden de prelación en el año `anio` (0, 1 o 2), y el total de cada año. */
export function montoPorPrelacion(entidades: readonly EntidadSeguimiento[], anio: number): { porOrden: number[]; porAnio: [number, number, number] } {
  const porOrden = ORDENES_PRELACION.map(() => 0);
  const porAnio: [number, number, number] = [0, 0, 0];
  for (const e of entidades) {
    e.prelacion.forEach((parte, i) => (porOrden[i] += e.montos[anio] * parte));
    e.montos.forEach((m, k) => (porAnio[k] += m));
  }
  return { porOrden, porAnio };
}

/** Solicitudes de ampliación de plazo de fase por estado. */
/** Partes del gráfico de ampliaciones: las tres «En evaluación» (MAA, DPLAIP y DGA) van juntas. */
export const GRUPOS_AMPLIACION = ['En evaluación', 'Observada', 'Aprobada', 'Rechazada'] as const;

/** Parte del gráfico de una solicitud de ampliación: «En evaluación – MAA» es «En evaluación». */
export function grupoAmpliacion(estado: string | null | undefined): string {
  return estado?.startsWith('En evaluación') ? 'En evaluación' : (estado ?? '');
}

/** Solicitudes de ampliación por parte del gráfico (`GRUPOS_AMPLIACION`). */
export function ampliacionesPorEstado(entidades: readonly EntidadSeguimiento[]): { estado: string; cantidad: number }[] {
  return GRUPOS_AMPLIACION.map((estado) => ({ estado: estado as string, cantidad: entidades.filter((e) => grupoAmpliacion(e.ampliacion) === estado).length }));
}

/** % de Entidades con Anexo N.º 02 aprobado por departamento, de mayor a menor (solo los que tienen Entidades). */
export function aprobadosPorDepartamento(entidades: readonly EntidadSeguimiento[]): { departamento: string; total: number; aprobadas: number; valor: number }[] {
  return DEPARTAMENTOS.map((departamento) => {
    const del = entidades.filter((e) => e.departamento === departamento);
    const aprobadas = del.filter((e) => e.estado === ESTADO_APROBADO).length;
    return { departamento: departamento as string, total: del.length, aprobadas, valor: porcentaje(aprobadas, del.length) };
  })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.aprobadas / b.total - a.aprobadas / a.total);
}

/** Fecha fin de la fase para la Entidad: con la ampliación aprobada, 15 días más. */
export const fechaFinEntidad = (e: EntidadSeguimiento, fase: FaseRectora): string =>
  e.ampliacion === 'Aprobada' ? sumarDias(fase.fin, 15) : fase.fin;

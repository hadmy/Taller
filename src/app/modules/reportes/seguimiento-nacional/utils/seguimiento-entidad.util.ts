/**
 * Cálculos del «Resumen de la Entidad»: qué áreas usuarias y necesidades entran según la vista (OA o un área
 * usuaria), los combos y la selección en los visuales. Funciones puras, sin Angular.
 */
import { ORDENES_PRELACION } from '../models/seguimiento-nacional.model';
import {
  ANEXO_01_APROBADO,
  AreaUsuariaEntidad,
  GENERICAS_ENTIDAD,
  NecesidadEntidad,
  REMISION_ACEPTADA,
  SeguimientoEntidad,
  SituacionAnexo01,
} from '../models/seguimiento-entidad.model';

/** «Ver como»: la Oficina de Abastecimiento ve toda la Entidad; un área usuaria, solo lo suyo. */
export type VistaEntidad = 'OA' | 'AU';

export interface FiltrosEntidad {
  fase: number;
  vista: VistaEntidad;
  /** Área usuaria de la vista «AU». */
  areaVista: string;
  /** Combos: vacío es «Todas». */
  area: string;
  ate: string;
  generica: string;
  /** Año programado: 0, 1 o 2. */
  anio: number;
}

export interface SeleccionEntidad {
  area?: string;
  estado?: number;
  generica?: string;
  ate?: string;
  orden?: number;
  /** Pendiente de la OA elegido (índice de `PENDIENTES_OA`): deja solo las áreas usuarias que lo tienen. */
  pendiente?: number;
}

/** Pendientes de la Oficina de Abastecimiento que dependen de la situación de cada área usuaria, en orden. */
export const PENDIENTES_OA = [
  'Anexos N.º 01 por revisar',
  'Ampliaciones por evaluar',
  'Áreas sin Anexo N.º 01 aprobado',
  'Necesidades estratégicas por aprobar',
] as const;

/** El área usuaria tiene el pendiente `indice` de la OA (el de necesidades estratégicas no depende de un área). */
export function tienePendiente(s: SituacionAnexo01, indice: number): boolean {
  switch (indice) {
    case 0:
      return s.estado === ANEXO_01_APROBADO && s.revision === 0;
    case 1:
      return s.ampliacion === 'Pendiente';
    case 2:
      return s.estado < ANEXO_01_APROBADO;
    default:
      return false;
  }
}

export type ClaveSeleccionEntidad = keyof SeleccionEntidad;

export function situacionDe(datos: SeguimientoEntidad, fase: number, area: string): SituacionAnexo01 {
  return datos.situacion[fase]?.[area] ?? { estado: -1, revision: null, ampliacion: null, version: 1, ajustado: false };
}

/** Áreas usuarias que entran: las de la vista, el combo y la selección (salvo las claves de `ignorar`). */
export function areasFiltradas(
  datos: SeguimientoEntidad,
  f: FiltrosEntidad,
  s: SeleccionEntidad,
  ignorar: readonly ClaveSeleccionEntidad[] = [],
): AreaUsuariaEntidad[] {
  return datos.areas.filter((a) => {
    if (f.vista === 'AU' && a.codigo !== f.areaVista) return false;
    if (f.area && a.codigo !== f.area) return false;
    if (!ignorar.includes('estado') && s.estado !== undefined && situacionDe(datos, f.fase, a.codigo).estado !== s.estado) return false;
    if (!ignorar.includes('area') && s.area && a.codigo !== s.area) return false;
    if (!ignorar.includes('pendiente') && s.pendiente !== undefined && !tienePendiente(situacionDe(datos, f.fase, a.codigo), s.pendiente)) return false;
    return true;
  });
}

const pasaNecesidad = (n: NecesidadEntidad, f: FiltrosEntidad, s: SeleccionEntidad, ignorar: readonly ClaveSeleccionEntidad[]): boolean =>
  n.fase === f.fase &&
  (!f.ate || n.ate === f.ate) &&
  (!f.generica || n.generica === f.generica) &&
  (ignorar.includes('generica') || !s.generica || n.generica === s.generica) &&
  (ignorar.includes('ate') || !s.ate || n.ate === s.ate) &&
  (ignorar.includes('orden') || s.orden === undefined || n.orden === s.orden);

/** Necesidades que programan las áreas que entran (para la exportación). */
export function necesidadesProgramadas(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): NecesidadEntidad[] {
  const codigos = new Set(areasFiltradas(datos, f, s).map((a) => a.codigo));
  return datos.necesidades.filter((n) => codigos.has(n.area) && pasaNecesidad(n, f, s, []));
}

/** Necesidades a cargo de las áreas que entran: las propias sin ATE y las aceptadas como ATE. */
export function necesidadesACargo(
  datos: SeguimientoEntidad,
  f: FiltrosEntidad,
  s: SeleccionEntidad,
  ignorar: readonly ClaveSeleccionEntidad[] = [],
): NecesidadEntidad[] {
  const codigos = new Set(areasFiltradas(datos, f, s).map((a) => a.codigo));
  return datos.necesidades.filter(
    (n) =>
      pasaNecesidad(n, f, s, ignorar) &&
      ((!n.ate && codigos.has(n.area)) || (!!n.ate && n.remision === REMISION_ACEPTADA && codigos.has(n.ate))),
  );
}

/** Necesidades remitidas a una ATE desde (o hacia) las áreas que entran. */
export function necesidadesRemitidas(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): NecesidadEntidad[] {
  const codigos = new Set(areasFiltradas(datos, f, s).map((a) => a.codigo));
  return datos.necesidades.filter((n) => !!n.ate && (codigos.has(n.area) || codigos.has(n.ate)) && pasaNecesidad(n, f, s, ['ate']));
}

/** Programado y techo de la fase por genérica, en el año elegido (el techo crece 2 % por año). */
export function usoDelTecho(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): { codigo: string; nombre: string; corto: string; programado: number; techo: number }[] {
  const aCargo = necesidadesACargo(datos, f, s, ['generica']);
  const codigos = areasFiltradas(datos, f, s).map((a) => a.codigo);
  return GENERICAS_ENTIDAD.map((g) => ({
    codigo: g.codigo as string,
    nombre: g.nombre as string,
    corto: g.corto as string,
    programado: aCargo.filter((n) => n.generica === g.codigo).reduce((suma, n) => suma + n.montos[f.anio], 0),
    techo: codigos.reduce((suma, c) => suma + (datos.techos[c]?.[g.codigo] ?? 0), 0) * (1 + f.anio * 0.02),
  })).filter((g) => g.techo > 0);
}

/** Monto a cargo por orden de prelación en el año elegido. */
export function montoPorOrden(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): number[] {
  const aCargo = necesidadesACargo(datos, f, s, ['orden']);
  return ORDENES_PRELACION.map((_, i) => aCargo.filter((n) => n.orden === i).reduce((suma, n) => suma + n.montos[f.anio], 0));
}

export interface FilaAvanceArea {
  area: AreaUsuariaEntidad;
  situacion: SituacionAnexo01;
  necesidades: number;
  /** Monto a su cargo (propias y aceptadas como ATE) en el año elegido. */
  monto: number;
  /** Monto a su cargo sobre su techo (1 = 100 %). */
  uso: number;
}

/** Avance de cada área usuaria que entra (sin aplicar la selección de área, para poder elegir otra). */
export function avancePorArea(datos: SeguimientoEntidad, f: FiltrosEntidad, s: SeleccionEntidad): FilaAvanceArea[] {
  return areasFiltradas(datos, f, s, ['area']).map((area) => {
    const deLaFase = datos.necesidades.filter((n) => n.fase === f.fase);
    const necesidades = deLaFase.filter((n) => n.area === area.codigo && (!f.generica || n.generica === f.generica)).length;
    const monto = deLaFase
      .filter((n) => (n.area === area.codigo && !n.ate) || (n.ate === area.codigo && n.remision === REMISION_ACEPTADA))
      .reduce((suma, n) => suma + n.montos[f.anio], 0);
    const techo = Object.values(datos.techos[area.codigo] ?? {}).reduce((a, b) => a + b, 0);
    return { area, situacion: situacionDe(datos, f.fase, area.codigo), necesidades, monto, uso: techo ? monto / techo : 0 };
  });
}

export const esAprobado = (s: SituacionAnexo01): boolean => s.estado === ANEXO_01_APROBADO;

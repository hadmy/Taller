/**
 * Filas de cada pestaña de la consulta «Seguimiento del CMN – Entidad» (vista de la Oficina de Abastecimiento), a partir
 * del seguimiento de la Entidad que entrega el backend simulado. Funciones puras, sin Angular.
 */
import type { QueryReportParameters, QueryReportRow } from '../../../../shared/types/query-report.types';
import type { TextFieldOption } from '../../../../shared/ui/text-field/text-field.component';
import { ORDENES_PRELACION } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import {
  ANEXO_01_APROBADO,
  ESTADOS_ANEXO_01,
  ESTADOS_REMISION,
  GENERICAS_ENTIDAD,
  NecesidadEntidad,
  REMISION_ACEPTADA,
  REVISIONES_OA,
  SIN_ANEXO_01,
  SeguimientoEntidad,
} from '../../../reportes/seguimiento-nacional/models/seguimiento-entidad.model';
import { PENDIENTES_OA, situacionDe, tienePendiente } from '../../../reportes/seguimiento-nacional/utils/seguimiento-entidad.util';
import { fechaVisible, formatoMonto } from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';

export type PestanaEntidad = 'anexos' | 'techo' | 'remitidas' | 'prelacion' | 'pendientes' | 'necesidades';

export const PESTANAS_ENTIDAD: { id: PestanaEntidad; label: string }[] = [
  { id: 'anexos', label: 'Anexos N.º 01 por área usuaria' },
  { id: 'techo', label: 'Uso del techo' },
  { id: 'remitidas', label: 'Remitidas a las ATE' },
  { id: 'prelacion', label: 'Orden de prelación' },
  { id: 'pendientes', label: 'Pendientes de la OA' },
  { id: 'necesidades', label: 'Necesidades programadas' },
];

/** Etiqueta del estado del Anexo N.º 01 de un área, con «Sin Anexo N.º 01» si no lo registró. */
export const etiquetaEstadoAnexo01 = (estado: number): string => (estado === SIN_ANEXO_01 ? 'Sin Anexo N.º 01' : ESTADOS_ANEXO_01[estado]);

/** «Año 1 (2027)»: el periodo 2026 programa 2027 a 2029. */
export const etiquetaAnioEntidad = (k: number): string => `Año ${k + 1} (${2027 + k})`;

function lista(valor: string | string[] | undefined): string[] {
  return Array.isArray(valor) ? valor : valor ? [valor] : [];
}

/** Lo que piden los parámetros: fase y año (uno), y áreas usuarias, ATE y genéricas (varias; vacío es «todas»). */
export function leerParametros(parametros: QueryReportParameters): { fase: number; anio: number; areas: string[]; ates: string[]; genericas: string[] } {
  return {
    fase: Number(parametros['fase'] || 2),
    anio: Number(parametros['anio'] || 0),
    areas: lista(parametros['areas']),
    ates: lista(parametros['ates']),
    genericas: lista(parametros['genericas']),
  };
}

/** Opciones de los parámetros que dependen de los datos: todas las áreas usuarias y solo las ATE. */
export function opcionesDeAreas(datos: SeguimientoEntidad | null): { areas: TextFieldOption[]; ates: TextFieldOption[] } {
  const opcion = (a: { codigo: string; nombre: string }): TextFieldOption => ({ label: `${a.codigo} ${a.nombre}`, value: a.codigo });
  return { areas: (datos?.areas ?? []).map(opcion), ates: (datos?.areas ?? []).filter((a) => a.esAte).map(opcion) };
}

const nombreArea = (datos: SeguimientoEntidad, codigo: string | null): string => {
  const area = datos.areas.find((a) => a.codigo === codigo);
  return area ? `${area.codigo} ${area.nombre}` : '–';
};

/** Filas de la pestaña, ya formateadas como textos de la tabla. */
export function filasDePestanaEntidad(pestana: PestanaEntidad, datos: SeguimientoEntidad, parametros: QueryReportParameters): QueryReportRow[] {
  const p = leerParametros(parametros);
  const enAreas = (codigo: string | null): boolean => !p.areas.length || (!!codigo && p.areas.includes(codigo));
  const enAte = (codigo: string | null): boolean => !p.ates.length || (!!codigo && p.ates.includes(codigo));
  const enGenerica = (g: string): boolean => !p.genericas.length || p.genericas.includes(g);
  const areas = datos.areas.filter((a) => enAreas(a.codigo));
  const deLaFase = datos.necesidades.filter((n) => n.fase === p.fase && enGenerica(n.generica));
  /** A cargo de un área: las propias sin ATE y las aceptadas como ATE. */
  const aCargoDe = (codigo: string) => (n: NecesidadEntidad): boolean =>
    (n.area === codigo && !n.ate) || (n.ate === codigo && n.remision === REMISION_ACEPTADA);
  const aCargo = deLaFase.filter((n) => areas.some((a) => aCargoDe(a.codigo)(n)));

  switch (pestana) {
    case 'anexos':
      return areas.map((a) => {
        const s = situacionDe(datos, p.fase, a.codigo);
        const monto = deLaFase.filter(aCargoDe(a.codigo)).reduce((suma, n) => suma + n.montos[p.anio], 0);
        const techo = Object.values(datos.techos[a.codigo] ?? {}).reduce((x, y) => x + y, 0);
        return {
          codigo: a.codigo,
          area: a.nombre,
          ate: a.esAte ? 'ATE' : '–',
          estado: etiquetaEstadoAnexo01(s.estado),
          revision: s.estado === ANEXO_01_APROBADO && s.revision !== null ? REVISIONES_OA[s.revision] : '–',
          necesidades: String(deLaFase.filter((n) => n.area === a.codigo).length),
          monto: formatoMonto(monto),
          uso: techo ? ((monto / techo) * 100).toFixed(1) : '0.0',
        };
      });
    case 'techo':
      return GENERICAS_ENTIDAD.filter((g) => enGenerica(g.codigo)).map((g) => {
        const programado = aCargo.filter((n) => n.generica === g.codigo).reduce((suma, n) => suma + n.montos[p.anio], 0);
        // El techo crece 2 % por año, como en el resumen de la Entidad.
        const techo = areas.reduce((suma, a) => suma + (datos.techos[a.codigo]?.[g.codigo] ?? 0), 0) * (1 + p.anio * 0.02);
        return {
          generica: g.nombre,
          programado: formatoMonto(programado),
          techo: formatoMonto(techo),
          uso: techo ? ((programado / techo) * 100).toFixed(1) : '0.0',
        };
      });
    case 'remitidas':
      return deLaFase
        .filter((n) => !!n.ate && (enAreas(n.area) || enAreas(n.ate)) && enAte(n.ate))
        .map((n, i) => ({
          id: String(i),
          item: n.item,
          descripcion: n.descripcion,
          area: nombreArea(datos, n.area),
          ate: nombreArea(datos, n.ate),
          estado: n.remision === null ? '–' : ESTADOS_REMISION[n.remision],
        }));
    case 'prelacion':
      return aCargo.map((n, i) => ({
        id: String(i),
        item: n.item,
        descripcion: n.descripcion,
        area: nombreArea(datos, n.ate && n.remision === REMISION_ACEPTADA ? n.ate : n.area),
        orden: ORDENES_PRELACION[n.orden],
        generica: GENERICAS_ENTIDAD.find((g) => g.codigo === n.generica)?.corto ?? n.generica,
        monto: formatoMonto(n.montos[p.anio]),
      }));
    case 'pendientes': {
      const situaciones = areas.map((a) => situacionDe(datos, p.fase, a.codigo));
      const fase = datos.fases.find((f) => f.numero === p.fase) ?? datos.fases[0];
      const plazos = [
        `Hasta ${fechaVisible(fase.etapas[2].fin)} (Etapa 3)`,
        `Etapa 2 vence ${fechaVisible(fase.etapas[1].fin)}`,
        `Etapa 2 vence ${fechaVisible(fase.etapas[1].fin)}`,
        '–',
      ];
      return PENDIENTES_OA.map((pendiente, i) => {
        const cantidad = i === 3 ? (p.fase === 2 ? 1 : 0) : situaciones.filter((s) => tienePendiente(s, i)).length;
        return { pendiente, cantidad: String(cantidad), plazo: plazos[i], urgente: i === 2 && cantidad > 0 ? 'Sí' : 'No' };
      });
    }
    case 'necesidades':
      return deLaFase
        .filter((n) => enAreas(n.area) && enAte(n.ate))
        .map((n, i) => ({
          id: String(i),
          area: nombreArea(datos, n.area),
          item: n.item,
          descripcion: n.descripcion,
          unidad: n.unidad,
          tipo: n.tipo === 'B' ? 'Bien' : 'Servicio',
          generica: GENERICAS_ENTIDAD.find((g) => g.codigo === n.generica)?.corto ?? n.generica,
          orden: ORDENES_PRELACION[n.orden],
          ate: n.ate ? nombreArea(datos, n.ate) : '–',
          anio1: formatoMonto(n.montos[0]),
          anio2: formatoMonto(n.montos[1]),
          anio3: formatoMonto(n.montos[2]),
        }));
  }
}

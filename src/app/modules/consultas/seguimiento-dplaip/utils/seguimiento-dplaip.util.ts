/**
 * Filas de cada pestaña de la consulta «Seguimiento del CMN – DPLAIP», a partir del seguimiento nacional que entrega el
 * backend simulado. Funciones puras, sin Angular: la pantalla las pasa como resultado a `siaf-query-report-page`.
 */
import type { QueryReportParameters, QueryReportRow } from '../../../../shared/types/query-report.types';
import {
  ESTADOS_ANEXO_02,
  EntidadSeguimiento,
  ORDENES_PRELACION,
  SeguimientoNacional,
} from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import {
  aprobadosPorDepartamento,
  avanceAcumulado,
  fechaFinEntidad,
  fechaVisible,
  formatoMonto,
  grupoAmpliacion,
} from '../../../reportes/seguimiento-nacional/utils/seguimiento-nacional.util';

export type PestanaDplaip = 'estado' | 'avance' | 'prelacion' | 'ampliaciones' | 'departamentos' | 'detalle';

export const PESTANAS_DPLAIP: { id: PestanaDplaip; label: string }[] = [
  { id: 'estado', label: 'Estado del Anexo N.º 02' },
  { id: 'avance', label: 'Avance acumulado' },
  { id: 'prelacion', label: 'Orden de prelación' },
  { id: 'ampliaciones', label: 'Ampliaciones de plazo' },
  { id: 'departamentos', label: 'Por departamento' },
  { id: 'detalle', label: 'Detalle por Entidad' },
];

/** Lista elegida en un parámetro múltiple; vacía es «todos». */
function lista(valor: string | string[] | undefined): string[] {
  return Array.isArray(valor) ? valor : valor ? [valor] : [];
}

/** Entidades que entran con los parámetros «Niveles de gobierno», «Departamentos» y «Estados del Anexo N.º 02». */
export function entidadesFiltradas(datos: SeguimientoNacional, parametros: QueryReportParameters): EntidadSeguimiento[] {
  const niveles = lista(parametros['niveles']);
  const departamentos = lista(parametros['departamentos']);
  const estados = lista(parametros['estados']);
  return datos.entidades.filter(
    (e) =>
      (!niveles.length || niveles.includes(e.nivel)) &&
      (!departamentos.length || departamentos.includes(e.departamento)) &&
      (!estados.length || estados.includes(ESTADOS_ANEXO_02[e.estado])),
  );
}

const ANIOS = [0, 1, 2];
const millones = (soles: number): string => (soles / 1e6).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** «Año 1 (2027)»: el periodo 2026 programa 2027 a 2029. */
export const etiquetaAnio = (periodo: string, k: number): string => `Año ${k + 1} (${Number(periodo) + 1 + k})`;

/** Filas de la pestaña, ya formateadas como textos de la tabla (importes con dos decimales, porcentajes con uno). */
export function filasDePestana(pestana: PestanaDplaip, datos: SeguimientoNacional, parametros: QueryReportParameters): QueryReportRow[] {
  const entidades = entidadesFiltradas(datos, parametros);
  const fase = datos.fases.find((f) => f.numero === datos.fase) ?? datos.fases[0];
  switch (pestana) {
    case 'estado':
      return entidades.map((e) => ({
        codigo: e.codigo,
        entidad: e.nombre,
        nivel: e.nivel,
        departamento: e.departamento,
        estado: ESTADOS_ANEXO_02[e.estado],
        anexos01: `${e.anexos01Aprobados} / ${e.areasUsuarias}`,
        monto: formatoMonto(e.montos[0]),
      }));
    case 'avance': {
      const total = entidades.length;
      return avanceAcumulado(entidades, fase, datos.fechaCorte).map((p, i) => ({
        id: String(i),
        dia: p.dia,
        aprobadas: String(Math.round((p.valor * total) / 100)),
        porcentaje: p.valor.toFixed(1),
      }));
    }
    case 'prelacion':
      return ANIOS.flatMap((k) =>
        ORDENES_PRELACION.map((orden, i) => ({
          id: `${k}-${i}`,
          orden,
          anio: etiquetaAnio(datos.periodo, k),
          // En millones de S/ con un decimal: los montos nacionales son de decenas de miles de millones.
          monto: millones(entidades.reduce((suma, e) => suma + e.montos[k] * (e.prelacion[i] ?? 0), 0)),
        })),
      );
    case 'ampliaciones':
      return entidades
        .filter((e) => e.ampliacion)
        .map((e) => ({
          codigo: e.codigo,
          entidad: e.nombre,
          nivel: e.nivel,
          departamento: e.departamento,
          grupo: grupoAmpliacion(e.ampliacion),
          ampliacion: e.ampliacion ?? '',
        }));
    case 'departamentos':
      return aprobadosPorDepartamento(entidades).map((d) => ({
        departamento: d.departamento,
        entidades: String(d.total),
        aprobadas: String(d.aprobadas),
        porcentaje: d.valor.toFixed(1),
      }));
    case 'detalle':
      return entidades.map((e) => ({
        codigo: e.codigo,
        entidad: e.nombre,
        nivel: e.nivel,
        departamento: e.departamento,
        estado: ESTADOS_ANEXO_02[e.estado],
        anexos01: `${e.anexos01Aprobados} / ${e.areasUsuarias}`,
        monto: formatoMonto(e.montos[0]),
        fechaFin: fechaVisible(fechaFinEntidad(e, fase)),
        ampliacion: e.ampliacion ?? '–',
      }));
  }
}

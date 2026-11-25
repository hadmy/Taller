/**
 * Datos del «Seguimiento nacional del CMN Programación» (DPLAIP): 2,486 Entidades simuladas del Clasificador
 * Institucional (205 del Gobierno Nacional, 145 regionales y 2,136 locales) con su avance en cada fase de los periodos
 * 2025 y 2026. Se generan siempre iguales (generador con semilla fija) y una sola vez; son de solo lectura, así que no
 * van a `localStorage` ni hace falta subir `VERSION` de `mock-db.ts`.
 */
import {
  DEPARTAMENTOS,
  ESTADOS_AMPLIACION,
  EntidadSeguimiento,
  EstadoAnexo02,
  FaseRectora,
  NOMBRES_FASE,
  SeguimientoNacional,
} from '../modules/reportes/seguimiento-nacional/models/seguimiento-nacional.model';

/** Generador pseudoaleatorio con semilla (mulberry32): los mismos datos en cada carga. */
function generador(semilla: number): () => number {
  let s = semilla;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cuántas Entidades locales caen en cada departamento (peso), en el orden de `DEPARTAMENTOS`. */
const PESO_DEPARTAMENTO = [84, 166, 84, 109, 119, 127, 7, 112, 100, 84, 43, 124, 83, 38, 171, 53, 11, 20, 29, 65, 110, 77, 28, 13, 17];
const SECTORES = [
  'Educación', 'Salud', 'Economía y Finanzas', 'Interior', 'Transportes y Comunicaciones', 'Agricultura', 'Producción',
  'Justicia', 'Trabajo', 'Ambiente', 'Cultura', 'Vivienda', 'Energía y Minas', 'Desarrollo e Inclusión Social', 'Mujer',
  'Defensa', 'Relaciones Exteriores', 'Comercio Exterior y Turismo',
];
const LOCALIDADES = [
  'San Juan', 'Santa Rosa', 'San Pedro', 'Santa Ana', 'San José', 'La Victoria', 'San Martín', 'Santiago', 'Santa Cruz',
  'San Miguel', 'Las Palmas', 'Pueblo Nuevo', 'San Luis', 'Santo Domingo', 'La Esperanza', 'Buenavista', 'Los Olivos',
  'San Antonio', 'Santa María', 'Huayllay', 'Pichari', 'Chupaca', 'Ocoña', 'Tambo', 'Quilca',
];
/** Parte típica del monto de cada orden de prelación. */
const PARTE_PRELACION = [0.065, 0.466, 0.144, 0.048, 0.277];
const PESO_AMPLIACION = [21, 9, 7, 6, 58, 11];

/** Fases rectoras de cada periodo, su fecha de corte y la fase vigente. */
const PERIODOS: Record<string, { fases: [string, string][]; corte: string; vigente: number }> = {
  '2026': { fases: [['2026-01-02', '2026-04-09'], ['2026-05-01', '2026-06-30'], ['2026-12-16', '2027-01-30']], corte: '2026-05-31', vigente: 2 },
  '2025': { fases: [['2025-01-02', '2025-04-09'], ['2025-05-01', '2025-09-30'], ['2025-12-16', '2026-01-30']], corte: '2026-05-31', vigente: 3 },
};

const fecha = (s: string): Date => new Date(`${s}T00:00:00`);
/** Días entre dos fechas aaaa-mm-dd. */
const diasEntre = (desde: string, hasta: string): number => Math.round((fecha(hasta).getTime() - fecha(desde).getTime()) / 864e5);

type Situacion = Omit<EntidadSeguimiento, 'codigo' | 'nombre' | 'nivel' | 'subgrupo' | 'area' | 'departamento' | 'areasUsuarias'>;
interface EntidadGenerada {
  datos: Pick<EntidadSeguimiento, 'codigo' | 'nombre' | 'nivel' | 'subgrupo' | 'area' | 'departamento' | 'areasUsuarias'>;
  /** Situación por periodo y fase («2026-2»). */
  situacion: Record<string, Situacion>;
}

let cache: EntidadGenerada[] | null = null;

function generar(): EntidadGenerada[] {
  const R = generador(20261119);
  const elegir = <T>(lista: readonly T[]): T => lista[Math.floor(R() * lista.length)];
  const elegirConPeso = <T>(lista: readonly T[], pesos: readonly number[]): T => {
    let r = R() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lista.length; i++) {
      r -= pesos[i];
      if (r < 0) return lista[i];
    }
    return lista[lista.length - 1];
  };

  const cantidades = { Nacional: 205, Regional: 145, Local: 2136 } as const;
  const correlativo: Record<string, number> = {};
  const entidades: EntidadGenerada[] = [];

  for (const nivel of ['Nacional', 'Regional', 'Local'] as const) {
    for (let i = 0; i < cantidades[nivel]; i++) {
      let nombre: string;
      let departamento: string;
      let areasUsuarias: number;
      let base: number;
      if (nivel === 'Nacional') {
        const sector = elegir(SECTORES);
        departamento = R() < 0.85 ? 'Lima' : elegir(DEPARTAMENTOS);
        nombre = `${R() < 0.3 ? 'Ministerio de ' : 'Organismo Público de '}${sector}${R() < 0.3 ? '' : ` ${i + 2}`}`;
        areasUsuarias = 8 + Math.floor(R() * 30);
        base = Math.exp(17.6 + R() * 1.6);
      } else if (nivel === 'Regional') {
        departamento = elegir(DEPARTAMENTOS);
        nombre = `${R() < 0.2 ? 'Gobierno Regional de ' : 'Unidad Ejecutora Regional '}${departamento}${R() < 0.2 ? '' : ` ${i + 2}`}`;
        areasUsuarias = 12 + Math.floor(R() * 30);
        base = Math.exp(18.4 + R() * 1.2);
      } else {
        departamento = elegirConPeso(DEPARTAMENTOS, PESO_DEPARTAMENTO);
        nombre = `Municipalidad ${R() < 0.12 ? 'Provincial' : 'Distrital'} de ${elegir(LOCALIDADES)} – ${departamento}`;
        areasUsuarias = 3 + Math.floor(R() * 14);
        base = Math.exp(14.2 + R() * 1.8);
      }

      const situacion: Record<string, Situacion> = {};
      for (const [periodo, config] of Object.entries(PERIODOS)) {
        config.fases.forEach(([inicio, fin], k) => {
          const fase = k + 1;
          const vigente = config.vigente;
          let estado: EstadoAnexo02;
          if (fase < vigente) {
            const r = R();
            estado = r < 0.975 ? 3 : r < 0.99 ? 2 : 1;
          } else if (fase === vigente && periodo === '2026') {
            const pesos = { Nacional: [0.02, 0.1, 0.19, 0.69], Regional: [0.02, 0.08, 0.18, 0.72], Local: [0.103, 0.232, 0.166, 0.499] }[nivel];
            estado = elegirConPeso([0, 1, 2, 3] as const, pesos);
          } else if (fase === vigente) {
            const r = R();
            estado = r < 0.97 ? 3 : r < 0.99 ? 2 : 1;
          } else {
            estado = 0;
          }
          const limite = fase === vigente && periodo === '2026' ? diasEntre(inicio, config.corte) : diasEntre(inicio, fin);
          const diaAprobacion = estado === 3 ? Math.max(1, Math.round(limite * Math.pow(R(), 0.55))) : null;
          const ampliacion =
            fase > vigente ? null : (estado < 3 && R() < 0.11) || R() < 0.02 ? elegirConPeso(ESTADOS_AMPLIACION, PESO_AMPLIACION) : null;
          const factor = [1, 1.03, 1.06][k] * (0.92 + R() * 0.16);
          const partes = PARTE_PRELACION.map((p) => p * (0.7 + R() * 0.6));
          const sumaPartes = partes.reduce((a, b) => a + b, 0);
          const monto = estado === 0 ? 0 : base * factor;
          const anexos01Aprobados =
            estado === 0 ? (fase > vigente ? 0 : Math.floor(R() * areasUsuarias * 0.3)) : estado === 3 ? areasUsuarias : Math.floor(areasUsuarias * (0.3 + R() * 0.7));
          situacion[`${periodo}-${fase}`] = {
            estado,
            diaAprobacion,
            ampliacion,
            anexos01Aprobados,
            montos: [monto, monto * 0.95, monto * 0.91],
            prelacion: partes.map((p) => p / sumaPartes),
          };
        });
      }

      // Clasificador Institucional: grupo (nivel de gobierno), subgrupo, área y código de Entidad/Pliego.
      let grupo: number;
      let subgrupo: number;
      let area: number;
      let nombreSubgrupo: string;
      let nombreArea: string;
      if (nivel === 'Nacional') {
        grupo = 1;
        const r = R();
        if (r < 0.03) {
          [subgrupo, nombreSubgrupo, area, nombreArea] = [3, 'Entidades públicas de seguridad social', 1, 'Seguridad social'];
        } else if (r < 0.13) {
          subgrupo = 2;
          nombreSubgrupo = 'Entidades públicas descentralizadas';
          area = elegirConPeso([1, 2], [3, 7]);
          nombreArea = area === 1 ? 'Organismos descentralizados' : 'Universidades públicas';
          if (area === 2) nombre = `Universidad Nacional de ${departamento} ${i + 1}`;
        } else {
          subgrupo = 1;
          nombreSubgrupo = 'Entidades públicas presupuestarias';
          area = elegirConPeso([1, 2, 3, 4], [1, 86, 3, 10]);
          nombreArea = ['Poder Legislativo', 'Poder Ejecutivo', 'Poder Judicial', 'Otras'][area - 1];
        }
      } else if (nivel === 'Regional') {
        [grupo, subgrupo, area, nombreSubgrupo, nombreArea] = [2, 1, 1, 'Gobiernos regionales', 'Gobiernos regionales'];
      } else {
        const provincial = nombre.includes('Provincial');
        [grupo, subgrupo, area] = [3, 1, provincial ? 1 : 2];
        nombreSubgrupo = 'Municipalidades';
        nombreArea = provincial ? 'Municipalidades provinciales' : 'Municipalidades distritales';
      }
      const prefijo = `11${grupo}${subgrupo}${area}`;
      correlativo[prefijo] = (correlativo[prefijo] ?? 0) + 1;

      entidades.push({
        datos: {
          codigo: prefijo + String(correlativo[prefijo]).padStart(4, '0'),
          nombre,
          nivel: `Gobierno ${nivel}`,
          subgrupo: nombreSubgrupo,
          area: nombreArea,
          departamento,
          areasUsuarias,
        },
        situacion,
      });
    }
  }
  return entidades;
}

/** El 2024 repite la situación del 2025 con sus fechas un año antes: no cambia los datos que ya se generan. */
function periodoAnterior(fase?: number): SeguimientoNacional | null {
  const base = seguimientoNacional('2025', fase);
  if (!base) return null;
  const unAnioAntes = (s: string): string => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`;
  return { ...base, periodo: '2024', fases: base.fases.map((f) => ({ ...f, inicio: unAnioAntes(f.inicio), fin: unAnioAntes(f.fin) })) };
}

/** Situación nacional en la fase `fase` del periodo `periodo` (por defecto, el 2026 y su fase vigente). */
export function seguimientoNacional(periodo = '2026', fase?: number): SeguimientoNacional | null {
  if (periodo === '2024') return periodoAnterior(fase);
  const config = PERIODOS[periodo];
  if (!config) return null;
  const numero = fase ?? config.vigente;
  if (!(numero >= 1 && numero <= 3)) return null;
  cache ??= generar();
  const fases: FaseRectora[] = config.fases.map(([inicio, fin], k) => ({ numero: k + 1, nombre: NOMBRES_FASE[k], inicio, fin }));
  return {
    periodo,
    fase: numero,
    fechaCorte: config.corte,
    fases,
    entidades: cache.map((e) => ({ ...e.datos, ...e.situacion[`${periodo}-${numero}`] })),
  };
}

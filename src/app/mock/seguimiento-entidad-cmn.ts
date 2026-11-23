/**
 * Datos del «Resumen de la Entidad» del seguimiento del CMN: 24 áreas usuarias del Ministerio de Educación, la
 * situación de su Anexo N.º 01 en cada fase de 2026, sus necesidades (propias y remitidas a las dos ATE) y su techo
 * por genérica. Se generan siempre iguales (semilla fija) y una sola vez; son de solo lectura, así que no van a
 * `localStorage` ni hace falta subir `VERSION` de `mock-db.ts`.
 */
import type {
  AreaUsuariaEntidad,
  FaseEntidad,
  NecesidadEntidad,
  SeguimientoEntidad,
  SituacionAnexo01,
} from '../modules/reportes/seguimiento-nacional/models/seguimiento-entidad.model';

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

const FASES: FaseEntidad[] = [
  {
    numero: 1,
    nombre: 'Fase 1: Identificación',
    inicio: '2026-01-02',
    fin: '2026-04-09',
    etapas: [
      { inicio: '2026-01-02', fin: '2026-02-27' },
      { inicio: '2026-03-02', fin: '2026-03-31' },
      { inicio: '2026-01-02', fin: '2026-04-09' },
    ],
  },
  {
    numero: 2,
    nombre: 'Fase 2: Clasificación y Priorización',
    inicio: '2026-05-01',
    fin: '2026-06-30',
    etapas: [
      { inicio: '2026-05-01', fin: '2026-05-21' },
      { inicio: '2026-05-22', fin: '2026-06-15' },
      { inicio: '2026-05-01', fin: '2026-06-30' },
    ],
  },
  {
    numero: 3,
    nombre: 'Fase 3: Consolidación y Aprobación',
    inicio: '2026-12-16',
    fin: '2027-01-30',
    etapas: [
      { inicio: '2026-12-16', fin: '2026-12-31' },
      { inicio: '2027-01-04', fin: '2027-01-20' },
      { inicio: '2026-12-16', fin: '2027-01-30' },
    ],
  },
];

/** Código, nombre, si es ATE y el área de la que depende. */
const AREAS: [string, string, boolean, string?][] = [
  ['0012', 'Oficina General de Administración', false], ['0013', 'Oficina de Abastecimiento', false],
  ['0021', 'Oficina de Tecnologías de la Información', true], ['0034', 'Oficina de Recursos Humanos', true],
  ['0040', 'Dirección de Educación Básica Regular', false], ['0041', 'Unidad de Materiales Educativos', false, '0040'],
  ['0042', 'Unidad de Infraestructura Educativa', false, '0040'], ['0050', 'Dirección de Educación Superior', false],
  ['0055', 'Oficina de Planeamiento y Presupuesto', false], ['0060', 'Oficina de Comunicaciones', false],
  ['0061', 'Oficina de Asesoría Jurídica', false], ['0062', 'Órgano de Control Institucional', false],
  ['0070', 'Dirección de Educación Intercultural Bilingüe', false], ['0071', 'Dirección de Educación Especial', false],
  ['0072', 'Dirección de Educación Técnico-Productiva', false], ['0080', 'Dirección de Formación Docente', false],
  ['0081', 'Unidad de Capacitación Docente', false, '0080'], ['0090', 'Oficina de Defensa Nacional', false],
  ['0091', 'Oficina de Atención al Ciudadano', false], ['0100', 'Secretaría General', false],
  ['0101', 'Oficina de Gestión Documentaria', false, '0100'], ['0110', 'Dirección de Calidad de la Gestión Escolar', false],
  ['0120', 'Oficina de Seguimiento y Evaluación', false], ['0130', 'Dirección de Deporte Escolar', false],
];

/** Ítem, descripción, unidad, precio (0: servicio) y genérica. */
type Item = [string, string, string, number, string];
const ITEMS_TI: Item[] = [
  ['4321150100010001', 'COMPUTADORA PERSONAL DE ESCRITORIO', 'UNIDAD', 3200, '2.6'],
  ['4321160100010002', 'LAPTOP 14 PULGADAS', 'UNIDAD', 3900, '2.6'],
  ['8111220100010003', 'SERVICIO DE SOPORTE DE SOFTWARE', 'SERVICIO', 0, '2.3'],
  ['4410310500011045', 'CARTUCHO DE TÓNER NEGRO', 'UNIDAD', 280, '2.3'],
];
const ITEMS_RH: Item[] = [
  ['8610170100010005', 'SERVICIO DE CAPACITACIÓN EN GESTIÓN PÚBLICA', 'SERVICIO', 0, '2.3'],
  ['8610170100010006', 'SERVICIO DE CAPACITACIÓN EN CONTRATACIONES', 'SERVICIO', 0, '2.3'],
];
const ITEMS_GENERALES: Item[] = [
  ['5311000100021482', 'PAPEL BOND 80 G TAMAÑO A4', 'EMPAQUE X 500', 14.5, '2.3'],
  ['4412170100010010', 'ARCHIVADOR DE PALANCA LOMO ANCHO', 'UNIDAD', 6.8, '2.3'],
  ['7611150100010008', 'SERVICIO DE LIMPIEZA DE OFICINAS', 'SERVICIO', 0, '2.3'],
  ['8111210100010001', 'SERVICIO DE ACCESO A INTERNET', 'SERVICIO', 0, '2.3'],
  ['7810180100010004', 'SERVICIO DE TRANSPORTE DE MATERIALES', 'SERVICIO', 0, '2.3'],
  ['5612150100010007', 'SILLA GIRATORIA ERGONÓMICA', 'UNIDAD', 520, '2.6'],
  ['8012160100010009', 'SERVICIO DE CONSULTORÍA ESPECIALIZADA', 'SERVICIO', 0, '2.3'],
  ['9312150100010011', 'SUBVENCIÓN A INSTITUCIONES EDUCATIVAS', 'SERVICIO', 0, '2.5'],
];
const ATE_TI = '0021';
const ATE_RH = '0034';

let cache: SeguimientoEntidad | null = null;

function generar(): SeguimientoEntidad {
  const R = generador(11);
  const elegir = <T>(lista: readonly T[]): T => lista[Math.floor(R() * lista.length)];
  const elegirConPeso = <T>(lista: readonly T[], pesos: readonly number[]): T => {
    let r = R() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lista.length; i++) {
      r -= pesos[i];
      if (r < 0) return lista[i];
    }
    return lista[lista.length - 1];
  };

  const areas: AreaUsuariaEntidad[] = AREAS.map(([codigo, nombre, esAte, titular]) => ({ codigo, nombre, esAte, titular: titular ?? null }));
  const situacion: Record<string, Record<string, SituacionAnexo01>> = {};
  const necesidades: NecesidadEntidad[] = [];

  for (const fase of [1, 2, 3]) {
    situacion[fase] = {};
    for (const area of areas) {
      let estado: number;
      let revision: number | null = null;
      let ampliacion: string | null = null;
      let version = 1;
      let ajustado = false;
      if (fase === 1) {
        estado = 4;
        revision = 1;
      } else if (fase === 2) {
        estado = elegirConPeso([-1, 0, 1, 2, 3, 4], [1, 3, 2, 2, 1, 15]);
        if (area.codigo === '0055') estado = -1;
        if (area.codigo === '0130') estado = 2;
        if (area.codigo === '0061' || area.codigo === '0101') estado = 3;
        if (area.codigo === '0012' || area.esAte) estado = 4;
        if (estado === 4) {
          revision = elegirConPeso([0, 1, 2], [2, 10, 2]);
          if (area.codigo === ATE_RH) revision = 2;
          if (area.codigo === ATE_TI) revision = 0;
          if (revision === 2) {
            ajustado = true;
            version = R() < 0.6 ? 2 : 1;
          }
        }
        if (estado < 4 && R() < 0.25) ampliacion = elegirConPeso(['Pendiente', 'Aceptada', 'Rechazada'], [2, 2, 1]);
        if (area.codigo === '0040') {
          estado = 0;
          revision = null;
          ajustado = false;
          ampliacion = 'Pendiente';
        }
      } else {
        estado = -1;
      }
      situacion[fase][area.codigo] = { estado, revision, ampliacion, version, ajustado };

      const cantidad = estado === -1 ? 0 : Math.round((area.titular ? 6 : 10) + R() * (area.esAte ? 20 : 26));
      for (let i = 0; i < cantidad; i++) {
        const lista =
          R() < 0.18 && !area.esAte
            ? R() < 0.6
              ? ITEMS_TI
              : ITEMS_RH
            : area.codigo === ATE_TI
              ? ITEMS_TI
              : area.codigo === ATE_RH
                ? ITEMS_RH
                : ITEMS_GENERALES;
        const [item, descripcion, unidad, precio, generica] = elegir(lista);
        const ate = lista === ITEMS_TI && area.codigo !== ATE_TI ? ATE_TI : lista === ITEMS_RH && area.codigo !== ATE_RH ? ATE_RH : null;
        const orden = elegirConPeso([0, 1, 2, 3, 4], [6, 30, 12, 6, 46]);
        const remision = ate ? (fase === 1 ? 1 : elegirConPeso([0, 1, 2], [13, 80, 4])) : null;
        const valor = precio ? precio * Math.round(5 + R() * (precio > 1000 ? 20 : 400)) : Math.round(20000 + R() * 240000);
        necesidades.push({
          fase,
          area: area.codigo,
          item,
          descripcion,
          unidad,
          tipo: precio ? 'B' : 'S',
          generica,
          orden,
          ate,
          remision,
          montos: [valor, valor * (0.95 + R() * 0.1), valor * (0.9 + R() * 0.15)],
        });
      }
    }
  }

  // Techo de cada área por genérica: algo más que lo que tiene a su cargo en la fase 2 (propias y aceptadas como ATE).
  const techos: Record<string, Record<string, number>> = {};
  for (const area of areas) {
    techos[area.codigo] = {};
    for (const generica of ['2.3', '2.6', '2.5']) {
      const aCargo = necesidades
        .filter(
          (n) =>
            n.fase === 2 &&
            n.generica === generica &&
            ((n.area === area.codigo && !n.ate) || (n.ate === area.codigo && n.remision === 1)),
        )
        .reduce((s, n) => s + n.montos[0], 0);
      techos[area.codigo][generica] = Math.round(((aCargo || R() * 80000) * (1.06 + R() * 0.35)) / 1000) * 1000;
    }
  }

  return {
    entidad: '011 - Ministerio de Educación',
    periodo: '2026',
    fechaCorte: '2026-05-31',
    fases: FASES,
    areas,
    situacion,
    necesidades,
    techos,
  };
}

export function seguimientoEntidad(): SeguimientoEntidad {
  cache ??= generar();
  return cache;
}

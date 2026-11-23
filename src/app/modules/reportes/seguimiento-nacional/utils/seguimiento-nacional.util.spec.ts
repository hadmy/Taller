import type { EntidadSeguimiento, FaseRectora } from '../models/seguimiento-nacional.model';
import {
  GRUPOS_AMPLIACION,
  aprobadosPorDepartamento,
  avanceAcumulado,
  estadosPorNivel,
  fechaFinEntidad,
  filtrarEntidades,
  grupoAmpliacion,
  montoPorPrelacion,
} from './seguimiento-nacional.util';

const entidad = (parcial: Partial<EntidadSeguimiento>): EntidadSeguimiento => ({
  codigo: '1111000001',
  nombre: 'Entidad',
  nivel: 'Gobierno Nacional',
  subgrupo: 'Entidades públicas presupuestarias',
  area: 'Poder Ejecutivo',
  departamento: 'Lima',
  areasUsuarias: 10,
  estado: 0,
  diaAprobacion: null,
  ampliacion: null,
  anexos01Aprobados: 0,
  montos: [1000, 950, 910],
  prelacion: [0.1, 0.4, 0.2, 0.1, 0.2],
  ...parcial,
});

const ENTIDADES: EntidadSeguimiento[] = [
  entidad({ codigo: 'a', estado: 3, diaAprobacion: 2, departamento: 'Lima' }),
  entidad({ codigo: 'b', estado: 3, diaAprobacion: 5, departamento: 'Cusco', nivel: 'Gobierno Local', ampliacion: 'Aprobada' }),
  entidad({ codigo: 'c', estado: 1, departamento: 'Cusco', nivel: 'Gobierno Local' }),
  entidad({ codigo: 'd', estado: 2, departamento: 'Lima', nivel: 'Gobierno Regional', ampliacion: 'Observada' }),
];
const COMBOS = { nivel: '', subgrupo: '', area: '', departamento: '', estado: '' };
const FASE: FaseRectora = { numero: 2, nombre: 'Clasificación y Priorización', inicio: '2026-05-01', fin: '2026-06-30' };

describe('seguimiento-nacional.util', () => {
  it('filtra por combos y por selección, salvo las claves que el visual ignora', () => {
    expect(filtrarEntidades(ENTIDADES, { ...COMBOS, nivel: 'Gobierno Local' }, {}).map((e) => e.codigo)).toEqual(['b', 'c']);
    expect(filtrarEntidades(ENTIDADES, { ...COMBOS, estado: '3' }, {}).map((e) => e.codigo)).toEqual(['a', 'b']);
    const seleccion = { departamento: 'Cusco', estado: 3 as const };
    expect(filtrarEntidades(ENTIDADES, COMBOS, seleccion).map((e) => e.codigo)).toEqual(['b']);
    expect(filtrarEntidades(ENTIDADES, COMBOS, seleccion, ['departamento']).map((e) => e.codigo)).toEqual(['a', 'b']);
    expect(filtrarEntidades(ENTIDADES, COMBOS, { ampliacion: 'Observada' }).map((e) => e.codigo)).toEqual(['d']);
  });

  it('cuenta los estados por nivel de gobierno con la fila Total', () => {
    const filas = estadosPorNivel(ENTIDADES);
    expect(filas.map((f) => f.nivel)).toEqual(['Gobierno Nacional', 'Gobierno Regional', 'Gobierno Local', 'Total']);
    expect(filas[2].conteo).toEqual([0, 1, 0, 1]);
    expect(filas[3].conteo).toEqual([0, 1, 1, 2]);
  });

  it('acumula el % aprobado por día hasta la fecha de corte; antes de iniciar la fase no hay puntos', () => {
    const puntos = avanceAcumulado(ENTIDADES, FASE, '2026-05-06');
    expect(puntos.length).toBe(6);
    expect(puntos[0]).toEqual({ dia: '01/05', valor: 0 });
    expect(puntos[2].valor).toBe(25);
    expect(puntos[5].valor).toBe(50);
    expect(avanceAcumulado(ENTIDADES, FASE, '2026-04-20')).toEqual([]);
  });

  it('reparte el monto del año por orden de prelación y suma cada año', () => {
    const { porOrden, porAnio } = montoPorPrelacion(ENTIDADES, 1);
    expect(porOrden[1]).toBeCloseTo(4 * 950 * 0.4);
    expect(porAnio).toEqual([4000, 3800, 3640]);
  });

  it('ordena los departamentos por % aprobado y amplía 15 días la fecha fin con la ampliación aprobada', () => {
    expect(aprobadosPorDepartamento(ENTIDADES).map((d) => [d.departamento, d.valor])).toEqual([
      ['Cusco', 50],
      ['Lima', 50],
    ]);
    expect(fechaFinEntidad(ENTIDADES[1], FASE)).toBe('2026-07-15');
    expect(fechaFinEntidad(ENTIDADES[0], FASE)).toBe('2026-06-30');
  });
});

describe('ampliaciones agrupadas', () => {
  it('las tres «En evaluación» forman una sola parte y el filtro las toma juntas', () => {
    expect(grupoAmpliacion('En evaluación – DGA')).toBe('En evaluación');
    expect(grupoAmpliacion('Aprobada')).toBe('Aprobada');
    expect(grupoAmpliacion(null)).toBe('');
    expect(GRUPOS_AMPLIACION.length).toBe(4);
  });
});

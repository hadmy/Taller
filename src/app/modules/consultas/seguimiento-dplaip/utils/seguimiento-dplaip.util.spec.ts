import type { EntidadSeguimiento, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { entidadesFiltradas, etiquetaAnio, filasDePestana } from './seguimiento-dplaip.util';

const entidad = (parcial: Partial<EntidadSeguimiento>): EntidadSeguimiento => ({
  codigo: '1',
  nombre: 'Entidad',
  nivel: 'Gobierno Nacional',
  subgrupo: 'S',
  area: 'A',
  departamento: 'Lima',
  areasUsuarias: 4,
  estado: 0,
  diaAprobacion: null,
  ampliacion: null,
  anexos01Aprobados: 1,
  montos: [2_000_000, 1_000_000, 500_000],
  prelacion: [0.5, 0.5, 0, 0, 0],
  ...parcial,
});

const DATOS: SeguimientoNacional = {
  periodo: '2026',
  fase: 2,
  fechaCorte: '2026-05-31',
  fases: [{ numero: 2, nombre: 'Clasificación y Priorización', inicio: '2026-05-01', fin: '2026-06-30' }],
  entidades: [
    entidad({ codigo: 'a', estado: 3, diaAprobacion: 3, ampliacion: 'Aprobada' }),
    entidad({ codigo: 'b', nivel: 'Gobierno Local', departamento: 'Cusco', ampliacion: 'En evaluación – DGA' }),
    entidad({ codigo: 'c', nivel: 'Gobierno Local', departamento: 'Cusco', estado: 2 }),
  ],
};

describe('seguimiento-dplaip.util', () => {
  it('filtra por niveles, departamentos y estados (vacío es «todos»)', () => {
    expect(entidadesFiltradas(DATOS, {}).length).toBe(3);
    expect(entidadesFiltradas(DATOS, { niveles: ['Gobierno Local'] }).map((e) => e.codigo)).toEqual(['b', 'c']);
    expect(entidadesFiltradas(DATOS, { departamentos: ['Cusco'], estados: ['En evaluación'] }).map((e) => e.codigo)).toEqual(['c']);
  });

  it('estado y detalle: una fila por Entidad con su estado y el monto del año 1', () => {
    const filas = filasDePestana('estado', DATOS, {});
    expect(filas.map((f) => f['estado'])).toEqual(['Aprobado', 'Sin iniciar', 'En evaluación']);
    expect(filas[0]['monto']).toBe('2,000,000.00');
    expect(filasDePestana('detalle', DATOS, {})[0]['ampliacion']).toBe('Aprobada');
  });

  it('prelación: orden × año en millones de S/, y el año con su etiqueta', () => {
    const filas = filasDePestana('prelacion', DATOS, {});
    expect(filas.length).toBe(15);
    expect(filas[0]).toEqual({ id: '0-0', orden: '1. Servicios básicos', anio: 'Año 1 (2027)', monto: '3.0' });
    expect(etiquetaAnio('2026', 2)).toBe('Año 3 (2029)');
  });

  it('ampliaciones agrupa las «En evaluación» y departamentos da el % aprobado', () => {
    expect(filasDePestana('ampliaciones', DATOS, {}).map((f) => f['grupo'])).toEqual(['Aprobada', 'En evaluación']);
    const lima = filasDePestana('departamentos', DATOS, {}).find((f) => f['departamento'] === 'Lima');
    expect(lima).toEqual({ departamento: 'Lima', entidades: '1', aprobadas: '1', porcentaje: '100.0' });
  });

  it('avance: un punto por día con el % acumulado de aprobados', () => {
    const filas = filasDePestana('avance', DATOS, {});
    expect(filas.length).toBeGreaterThan(1);
    expect(filas.at(-1)!['porcentaje']).toBe('33.3');
  });
});

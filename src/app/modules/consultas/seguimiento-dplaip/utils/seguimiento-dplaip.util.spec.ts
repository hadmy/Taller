import type { EntidadSeguimiento, SeguimientoNacional } from '../../../reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import { cumpleCondiciones, textoCondicion } from '../../favoritos/favorito-reporte.model';
import { aplicarSeleccion, avanceDeLaFase, contarAmpliaciones, entidadesDeParametros, estadoAnexo, filasDetalle, notaDeCorte } from './seguimiento-dplaip.util';

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
const codigos = (lista: EntidadSeguimiento[]): string[] => lista.map((e) => e.codigo);

describe('seguimiento-dplaip.util', () => {
  it('filtra por los parámetros (vacío es «Todos») y por la selección, que un gráfico puede ignorar', () => {
    expect(entidadesDeParametros(DATOS, { periodo: '2026' }).length).toBe(3);
    expect(codigos(entidadesDeParametros(DATOS, { nivel: 'Gobierno Local', estado: 'Validado' }))).toEqual(['c']);
    expect(codigos(aplicarSeleccion(DATOS.entidades, { estado: 'Pendiente', ampliacion: 'Validado' }))).toEqual(['b']);
    expect(aplicarSeleccion(DATOS.entidades, { estado: 'Pendiente' }, ['estado']).length).toBe(3);
  });

  it('el detalle usa los estados del reporte y la fecha fin ampliada', () => {
    const [a, b] = filasDetalle(DATOS.entidades, DATOS);
    expect(a).toEqual(jasmine.objectContaining({ estado: 'Aprobado', anexos01: '1 / 4', monto: '2,000,000.00', fechaFin: '15/07/2026 (ampliada)', dias: '–', ampliacion: 'Aprobado' }));
    expect(b).toEqual(jasmine.objectContaining({ estado: 'Pendiente', fechaFin: '30/06/2026', dias: '30', ampliacion: 'Validado' }));
  });

  it('separa verificados, validados y observados por su código', () => {
    expect(['1', '2'].map((codigo) => estadoAnexo(entidad({ codigo, estado: 2 })))).toEqual(['Verificado', 'Validado']);
    expect(['13', '24'].map((codigo) => estadoAnexo(entidad({ codigo, estado: 1 })))).toEqual(['Elaborado', 'Observado']);
  });

  it('cuenta las solicitudes de ampliación y lleva el avance hasta la fecha fin, sin dato después del corte', () => {
    expect(contarAmpliaciones(DATOS.entidades)).toEqual({ total: 2, cantidades: [0, 0, 1, 0, 1, 0] });
    const avance = avanceDeLaFase(DATOS.entidades, DATOS);
    expect([avance[0].dia, avance.at(-1)?.dia]).toEqual(['01/05', '30/06']);
    expect(avance.find((p) => p.dia === '31/05')?.valor).toBe(33.3);
    expect(avance.at(-1)?.valor).toBeNaN();
  });

  it('la nota de corte suma los días que faltan solo en las gráficas', () => {
    expect(notaDeCorte(DATOS, false)).toBe('Fecha de corte de datos: 31/05/2026 · Fase 2: Clasificación y Priorización del 01/05/2026 al 30/06/2026');
    expect(notaDeCorte(DATOS, true)).toContain('30 días para la fecha fin rectora (30/06/2026)');
  });

  it('las condiciones se cumplen todas, sin distinguir tildes ni mayúsculas', () => {
    const fila = { estado: 'Pendiente', entidad: 'Municipalidad de Áncash' };
    expect(cumpleCondiciones(fila, [{ campo: 'estado', operador: 'eq', valor: 'pendiente' }, { campo: 'entidad', operador: 'contains', valor: 'ancash' }])).toBeTrue();
    expect(cumpleCondiciones(fila, [{ campo: 'estado', operador: 'neq', valor: 'Pendiente' }])).toBeFalse();
    expect(textoCondicion({ campo: 'estado', operador: 'eq', valor: 'Pendiente' }, [{ key: 'estado', label: 'Estado del Anexo N° 02' }])).toBe('Estado del Anexo N° 02: = Pendiente');
  });
});

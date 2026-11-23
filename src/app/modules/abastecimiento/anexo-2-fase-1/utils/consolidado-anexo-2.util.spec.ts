import type { AreaUsuariaAnexo1, ItemAnexo1 } from '../models/anexo-2-fase-1.model';
import { armarConsolidado, semestresItem } from './consolidado-anexo-2.util';

describe('consolidado del Anexo N.º 02', () => {
  const ANIOS = [2027, 2028];

  function item(parcial: Partial<ItemAnexo1>): ItemAnexo1 {
    return {
      id: 'i',
      item: '1520284584131600',
      descripcion: 'Servicio de fotocopiado externo',
      montoProgramado: 0,
      tipo: 'Servicio',
      unidadMedida: 'SERVICIO',
      precioUnitario: null,
      fuente: 'RO/00',
      clasificador: '4 - Servicios',
      actividadOperativa: 'CP-OA-002 - Gestión administrativa y de abastecimiento',
      meta: '0020',
      montosPorAnio: { 2027: 1000, 2028: 0 },
      ...parcial,
    };
  }

  function area(parcial: Partial<AreaUsuariaAnexo1>): AreaUsuariaAnexo1 {
    return { id: 'a', nombre: 'Oficina de Abastecimiento', items: 1, montoProgramado: 0, estadoEvaluacion: 'Completo', plazoModificacion: '2026-08-24', ...parcial };
  }

  it('un servicio parte el año en mitades sin cantidad; un bien calcula la cantidad con el precio unitario', () => {
    expect(semestresItem(item({ montosPorAnio: { 2027: 1000.01 } }), 2027)).toEqual([
      { cantidad: null, valor: 500.01 },
      { cantidad: null, valor: 500 },
    ]);
    const toner = item({ tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 290, montosPorAnio: { 2027: 13_920 } });
    expect(semestresItem(toner, 2027)).toEqual([
      { cantidad: 24, valor: 6960 },
      { cantidad: 24, valor: 6960 },
    ]);
  });

  it('deja fuera los Anexos 01 pendientes, marca los observados y agrupa por fuente, clasificador, actividad y meta', () => {
    const papel = item({ item: '1520283078101801', tipo: 'Bien', clasificador: '3 - Bienes', unidadMedida: 'EMPAQUE X 500', precioUnitario: 14.5, montosPorAnio: { 2027: 3480, 2028: 3480 } });
    const consolidado = armarConsolidado(
      [
        { area: area({}), items: [item({}), papel, item({ item: '1520288111220102', montosPorAnio: { 2027: 200, 2028: 400 } })] },
        { area: area({ nombre: 'Oficina de Contabilidad', estadoEvaluacion: 'Incompleto', comentarioEvaluacion: 'Sustentar cantidades' }), items: [papel] },
        { area: area({ nombre: 'Oficina de Recursos Humanos', estadoEvaluacion: 'Pendiente' }), items: [item({})] },
      ],
      ANIOS,
    );

    expect(consolidado.grupos.map((g) => [g.clasificador, g.filas.length])).toEqual([
      ['4 - Servicios', 2],
      ['3 - Bienes', 2],
    ]);
    expect(consolidado.grupos.flatMap((g) => g.filas.map((f) => f.area))).not.toContain('Oficina de Recursos Humanos');
    const observada = consolidado.grupos[1].filas[1];
    expect(observada.estadoEvaluacion).toBe('Incompleto');
    expect(observada.comentario).toBe('Sustentar cantidades');
    expect(consolidado.grupos[0].filas[0].precioUnitario).toBeNull();

    // 2027: servicios 500 + 100 y dos papeles de 1,740 por semestre; 2028: 0 + 200 y los papeles.
    expect(consolidado.totales).toEqual([
      [4080, 4080],
      [3680, 3680],
    ]);
    expect(consolidado.totalGeneral).toBe(15_520);
  });
});

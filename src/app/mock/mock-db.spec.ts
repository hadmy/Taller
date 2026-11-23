import { ANIOS_CMN } from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import { armarConsolidado } from '../modules/abastecimiento/anexo-2-fase-1/utils/consolidado-anexo-2.util';
import { CONTEXTO_ANEXO_2_FASE_1, itemsAnexo1 } from './mock-db';

describe('ítems de ejemplo de los Anexos 01', () => {
  const redondear = (n: number): number => Math.round(n * 100) / 100;
  const areas = CONTEXTO_ANEXO_2_FASE_1.areas;

  it('suman el monto del Anexo 01 de cada área usuaria, ítem por ítem y año por año', () => {
    for (const area of areas) {
      const items = itemsAnexo1(area);
      expect(items.length).withContext(area.nombre).toBe(area.items);
      expect(redondear(items.reduce((suma, item) => suma + item.montoProgramado, 0))).withContext(area.nombre).toBe(area.montoProgramado);
      for (const item of items) {
        const porAnios = redondear(ANIOS_CMN.reduce((suma, anio) => suma + item.montosPorAnio[anio], 0));
        expect(porAnios).withContext(`${area.nombre} · ${item.descripcion}`).toBe(item.montoProgramado);
      }
    }
  });

  it('cuadran en el consolidado del Anexo N.º 02: cantidades enteras, cantidad × precio = valor y total = Anexos 01', () => {
    const revisadas = areas.map((area) => ({ ...area, estadoEvaluacion: 'Completo' as const }));
    const consolidado = armarConsolidado(revisadas.map((area) => ({ area, items: itemsAnexo1(area) })), ANIOS_CMN);

    const porArea = new Map<string, number>();
    for (const fila of consolidado.grupos.flatMap((g) => g.filas)) {
      for (const semestre of fila.semestres.flat()) {
        if (fila.precioUnitario !== null) {
          expect(Number.isInteger(semestre.cantidad)).withContext(fila.descripcion).toBeTrue();
          expect(redondear((semestre.cantidad ?? 0) * fila.precioUnitario)).withContext(fila.descripcion).toBe(semestre.valor);
        }
        porArea.set(fila.area, redondear((porArea.get(fila.area) ?? 0) + semestre.valor));
      }
    }

    for (const area of areas) expect(porArea.get(area.nombre)).withContext(area.nombre).toBe(area.montoProgramado);
    const totalAnexos1 = redondear(areas.reduce((suma, area) => suma + area.montoProgramado, 0));
    expect(consolidado.totalGeneral).toBe(totalAnexos1);
    expect(redondear(consolidado.totales.flat().reduce((suma, valor) => suma + valor, 0))).toBe(totalAnexos1);
  });
});

/**
 * Filas del «Dashboard» de Reportes: los ítems del Anexo 01 de cada área usuaria del CMN que se elabora en el taller
 * (`CONTEXTO_ANEXO_2_FASE_1`), una por ítem y año. Se calculan de los mismos datos que el Anexo N.º 02, así que el
 * total del tablero cuadra con su consolidado. Son de solo lectura: no hace falta subir `VERSION` de `mock-db.ts`.
 */
import { ANIOS_CMN } from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import type { FilaDashboardCmn, FiltrosDashboard } from '../modules/reportes/dashboard/models/dashboard-cmn.model';
import { CONTEXTO_ANEXO_2_FASE_1, itemsAnexo1 } from './mock-db';

const formatear = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** «a1-oti» → «OTI». */
const siglaDe = (areaId: string): string => areaId.replace(/^a1-/, '').toUpperCase();

export function filasDashboardCmn(): FilaDashboardCmn[] {
  return CONTEXTO_ANEXO_2_FASE_1.areas.flatMap((area) =>
    itemsAnexo1(area).flatMap((item) =>
      ANIOS_CMN.filter((anio) => (item.montosPorAnio[anio] ?? 0) > 0).map((anio) => ({
        id: `${item.id}-${anio}`,
        anio: String(anio),
        areaSigla: siglaDe(area.id),
        area: area.nombre,
        item: item.item,
        descripcion: item.descripcion,
        tipo: item.tipo,
        generica: item.clasificador,
        monto: formatear(item.montosPorAnio[anio]),
      })),
    ),
  );
}

/** Lo que se elige en «Parámetros»: años del CMN, áreas usuarias (por sigla) y tipo. Sin valor, todo. */
export function filtrarFilasDashboard(filtros: FiltrosDashboard): FilaDashboardCmn[] {
  return filasDashboardCmn().filter(
    (f) =>
      (!filtros.anios?.length || filtros.anios.includes(f.anio)) &&
      (!filtros.areas?.length || filtros.areas.includes(f.areaSigla)) &&
      (!filtros.tipo || f.tipo === filtros.tipo),
  );
}

import type {
  AreaUsuariaAnexo1,
  ConsolidadoAnexo2,
  GrupoConsolidado,
  ItemAnexo1,
  SemestreConsolidado,
} from '../models/anexo-2-fase-1.model';

const redondear = (n: number): number => Math.round(n * 100) / 100;

/**
 * Los dos semestres de un año de un ítem. En servicios el valor anual se parte en mitades (sin cantidad); en bienes la
 * cantidad sale del precio unitario y cada semestre vale cantidad × precio, como en el formato del Anexo N.º 02.
 */
export function semestresItem(item: ItemAnexo1, anio: number): [SemestreConsolidado, SemestreConsolidado] {
  const valor = item.montosPorAnio[anio] ?? 0;
  if (item.tipo === 'Servicio' || !item.precioUnitario) {
    const primero = redondear(valor / 2);
    return [
      { cantidad: null, valor: primero },
      { cantidad: null, valor: redondear(valor - primero) },
    ];
  }
  const cantidad = Math.round(valor / item.precioUnitario);
  const c1 = Math.floor(cantidad / 2);
  const c2 = cantidad - c1;
  return [
    { cantidad: c1, valor: redondear(c1 * item.precioUnitario) },
    { cantidad: c2, valor: redondear(c2 * item.precioUnitario) },
  ];
}

/**
 * Arma el consolidado del Anexo N.º 02 con los Anexos 01 ya revisados por la OA: los «Pendiente» no entran y los
 * «No conforme» entran marcados. Agrupa por Fuente / Rubro · Clasificador · Actividad operativa · Meta, en el orden en
 * que aparecen, y suma cada semestre de cada año.
 */
export function armarConsolidado(
  anexos: { area: AreaUsuariaAnexo1; items: ItemAnexo1[] }[],
  anios: readonly number[],
): Pick<ConsolidadoAnexo2, 'anios' | 'grupos' | 'totales' | 'totalGeneral'> {
  const grupos = new Map<string, GrupoConsolidado>();
  const totales: [number, number][] = anios.map(() => [0, 0]);

  for (const { area, items } of anexos) {
    if (area.estadoEvaluacion === 'Pendiente') continue;
    for (const item of items) {
      const clave = [item.fuente, item.clasificador, item.actividadOperativa, item.meta].join('||');
      let grupo = grupos.get(clave);
      if (!grupo) {
        grupo = { fuente: item.fuente, clasificador: item.clasificador, actividadOperativa: item.actividadOperativa, meta: item.meta, filas: [] };
        grupos.set(clave, grupo);
      }
      const semestres = anios.map((anio) => semestresItem(item, anio));
      semestres.forEach(([s1, s2], k) => {
        totales[k][0] = redondear(totales[k][0] + s1.valor);
        totales[k][1] = redondear(totales[k][1] + s2.valor);
      });
      grupo.filas.push({
        codigo: item.item,
        tipo: item.tipo,
        descripcion: item.descripcion,
        unidadMedida: item.unidadMedida,
        precioUnitario: item.tipo === 'Bien' ? item.precioUnitario : null,
        area: area.nombre,
        estadoEvaluacion: area.estadoEvaluacion,
        ...(area.estadoEvaluacion === 'No conforme' && area.comentarioEvaluacion ? { comentario: area.comentarioEvaluacion } : {}),
        semestres,
      });
    }
  }

  const totalGeneral = redondear(totales.reduce((suma, [s1, s2]) => suma + s1 + s2, 0));
  return { anios: [...anios], grupos: [...grupos.values()], totales, totalGeneral };
}

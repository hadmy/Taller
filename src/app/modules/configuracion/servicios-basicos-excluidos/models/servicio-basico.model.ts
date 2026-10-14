/** Ítem del catálogo de servicios básicos (Figma «Seleccionar ítems»: SEG, FAM, CLA, COM, ITEM, TIPO, DESCRIPCIÓN, VIGENCIA). */
export interface ServicioBasico {
  id: string;
  segmento: string;
  familia: string;
  clase: string;
  commodity: string;
  item: string;
  tipo: string;
  descripcion: string;
  vigente: boolean;
}

/** Código que se muestra en la lista vinculada: segmento + familia + clase + commodity, guion e ítem (p. ej. «51201722-44152789»). */
export function codigoServicioBasico(s: ServicioBasico): string {
  return `${s.segmento}${s.familia}${s.clase}${s.commodity}-${s.item}`;
}

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
  /**
   * Ids de las entidades a las que se asigna el servicio vinculado (columna «Entidades»). Opcional: lo grabado antes de
   * esta columna llega sin él y se lee como «Sin asignar».
   */
  entidades?: string[];
}

/** Entidad que se puede asignar a un servicio básico (en el taller, municipalidades del Gobierno Regional de Tumbes). */
export interface EntidadServicioBasico {
  id: string;
  /** Código de ubigeo de la municipalidad. */
  codigo: string;
  nombre: string;
}

/** Código que se muestra en la lista vinculada: segmento + familia + clase + commodity, guion e ítem (p. ej. «51201722-44152789»). */
export function codigoServicioBasico(s: ServicioBasico): string {
  return `${s.segmento}${s.familia}${s.clase}${s.commodity}-${s.item}`;
}

/** Texto de la columna «Entidades»: «Sin asignar», «1 entidad» o «N entidades». */
export function resumenEntidades(cantidad: number): string {
  if (cantidad === 0) return 'Sin asignar';
  return cantidad === 1 ? '1 entidad' : `${cantidad} entidades`;
}

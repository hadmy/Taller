/** Un CUBSO con precios diferenciados configurados por área (Figma, nodo 4524:189505). */
export interface PrecioDiferenciado {
  id: string;
  codigoCubso: string;
  descripcion: string;
  numPreciosGenerados: number;
  /** Precios por área del CUBSO; su cantidad es `numPreciosGenerados`. */
  precios?: PrecioArea[];
}

/** Un precio del CUBSO para un área (Figma «Editar precios diferenciados», nodo 4683:868331). */
export interface PrecioArea {
  id: string;
  area: string;
  descripcion: string;
  monto: number | null;
  vigente: boolean;
}

/** Fila del catálogo CUBSO que se ofrece en «Seleccionar ítems» (Figma, nodo 4683:867558). */
export interface CatalogoCubso {
  id: string;
  codigoCubso: string;
  descripcion: string;
}

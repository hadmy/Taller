/**
 * Proceso «Solicitud de Necesidades Estratégicas» del Cuadro Multianual de Necesidades (CMN).
 *
 * Una solicitud (documento SIE) propone incluir VARIOS ítems del catálogo como estratégicos. El creador elige los
 * ítems, adjunta el sustento, graba y verifica; el aprobador aprueba, observa o rechaza. Al aprobarse, los ítems pasan
 * a los registros (pestaña Registros) con la vigencia activa.
 */

/** Código del documento en el catálogo de documentos. */
export const CODIGO_DOCUMENTO = 'SIE';
export const NOMBRE_DOCUMENTO = 'Solicitud de necesidades estratégicas';

/** Única acción del documento: incluir ítems como estratégicos. */
export const TIPO_ACCION = 'inclusion';
export const ETIQUETA_TIPO_ACCION = 'Creación';

/** Ente rector del sistema (cabecera de la solicitud, Figma A.1-RC-020). */
export const ENTE_RECTOR = 'Dirección General de Abastecimiento';

/** Sistema nacional al que pertenece el proceso (columna «Sistemas Nacionales»). */
export const SISTEMA_NACIONAL = 'Sistema Nacional de Abastecimiento';

/** Un ítem del catálogo: lo que se elige en «Seleccionar necesidades estratégicas». */
export interface ItemEstrategico {
  /** Código del ítem en el catálogo (16 dígitos). */
  codigo: string;
  descripcion: string;
}

/** Fila del catálogo que ofrece el backend. */
export interface ItemEstrategicoCatalogo extends ItemEstrategico {
  id: string;
}

/** Un ítem aprobado como estratégico: la pestaña Registros. */
export interface ItemEstrategicoRegistro extends ItemEstrategico {
  id: string;
  /** Vigente mientras la entidad lo mantenga como estratégico. */
  vigente: boolean;
  entidadSiglas: string;
  /** Solicitud que lo incluyó. */
  documentoId: string;
  numeroDocumento: string;
  /** Fecha de aprobación (ISO). */
  fechaRegistro: string;
}

/** Solicitud de ampliación de plazo de una etapa. */
export interface AmpliacionPlazo {
  id: string;
  areaUsuaria: string;
  /** Nombre de la etapa. */
  etapa: string;
  /** Fechas aaaa-mm-dd. */
  fechaFinEtapa: string;
  fechaRegistro: string;
  /** La fija Abastecimiento al aceptar; vacía mientras tanto. */
  fechaAmpliacion: string;
  motivo: string;
  motivoRechazo: string;
  situacion: 'Pendiente' | 'Aceptado' | 'Rechazado';
}

export const MAXIMO_MOTIVO = 200;

/** Error de la fecha de ampliación; vacío si es válida. */
export function errorFechaAmpliacion(fecha: string, a: AmpliacionPlazo): string {
  if (!fecha) return 'Campo obligatorio';
  return fecha > a.fechaRegistro ? '' : 'Debe ser mayor a la fecha de registro';
}

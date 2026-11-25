import type { StatusTagTone } from '../../../shared/ui/status-tag/status-tag.component';

/** Estados por los que pasa un anexo, como se filtran y se muestran en los reportes. */
export const ESTADOS_ANEXO = ['Pendiente', 'Elaborado', 'Verificado', 'Validado', 'Observado', 'Aprobado', 'Rechazado'] as const;

export const TONOS_ESTADO: Record<string, StatusTagTone> = {
  Pendiente: 'warning',
  Elaborado: 'default',
  Verificado: 'info',
  Validado: 'info',
  Observado: 'warning',
  Aprobado: 'success',
  Rechazado: 'danger',
};

/** Tokens de color de los gráficos de los reportes. */
export const COLOR = {
  primario: '--sys-color-bg-brand-primary',
  neutro: '--sys-color-bg-feedback-dark-default',
  info: '--sys-color-bg-feedback-dark-info',
  exito: '--sys-color-bg-feedback-dark-success',
  advertencia: '--sys-color-bg-feedback-dark-warning',
  peligro: '--sys-color-bg-feedback-dark-danger',
} as const;

/** Anexos que se pueden consultar. */
export const OPCIONES_ANEXO = [
  { label: 'Anexo N° 01', value: '01' },
  { label: 'Anexo N° 02', value: '02' },
];

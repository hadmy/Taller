import { etapaCmn } from '../../shared/etapas-cmn';

export type MomentoAlerta = 'antes-fin' | 'dia-fin' | 'despues-fin' | 'antes-inicio' | 'dia-inicio' | 'despues-inicio';
export type UnidadAlerta = 'dias' | 'semanas';
export type FrecuenciaAlerta = 'una-vez' | 'diario' | 'interdiario' | 'cada-3';

export const MOMENTOS: { value: MomentoAlerta; label: string }[] = [
  { value: 'antes-fin', label: 'Antes del fin de la etapa' },
  { value: 'dia-fin', label: 'El día del fin (vencimiento)' },
  { value: 'despues-fin', label: 'Después del fin de la etapa' },
  { value: 'antes-inicio', label: 'Antes del inicio de la etapa' },
  { value: 'dia-inicio', label: 'El día del inicio de la etapa' },
  { value: 'despues-inicio', label: 'Después del inicio de la etapa' },
];
export const UNIDADES: { value: UnidadAlerta; label: string }[] = [
  { value: 'dias', label: 'Día (s)' },
  { value: 'semanas', label: 'Semana (s)' },
];
export const FRECUENCIAS: { value: FrecuenciaAlerta; label: string }[] = [
  { value: 'una-vez', label: 'Una sola vez' },
  { value: 'diario', label: 'Diario (Todos los días)' },
  { value: 'interdiario', label: 'Interdiario' },
  { value: 'cada-3', label: 'Cada 3 días' },
];

/** Lo que se configura de una alerta. */
export interface DatosAlerta {
  nombre: string;
  etapaId: string;
  momento: MomentoAlerta | '';
  /** Vacíos cuando la alerta se envía el mismo día del inicio o del fin. */
  tiempo: string;
  unidad: UnidadAlerta | '';
  frecuencia: FrecuenciaAlerta | '';
  alResponsable: boolean;
  alJefe: boolean;
  porBandeja: boolean;
  porCorreo: boolean;
  asunto: string;
  /** HTML del editor. */
  mensaje: string;
}

export interface AlertaCmn extends DatosAlerta {
  id: string;
  /** aaaa-mm-dd */
  fechaRegistro: string;
  /** Texto de la columna «Motivo». */
  motivo: string;
  estado: 'Activo' | 'Inactivo';
}

export const ASUNTO_POR_DEFECTO = 'Alerta del Sistema';
export const MENSAJE_POR_DEFECTO =
  '<p><b>Estimado usuario,</b></p><p>Le informamos que el día {FECHA_FIN} vence el plazo para la etapa {ETAPA} en la entidad {ENTIDAD} por lo tanto quedan {DÍAS RESTANTES}. Por favor, finalice sus tareas a la brevedad.</p>';

export const alertaVacia = (): DatosAlerta => ({
  nombre: '',
  etapaId: '',
  momento: '',
  tiempo: '',
  unidad: '',
  frecuencia: '',
  alResponsable: false,
  alJefe: false,
  porBandeja: false,
  porCorreo: false,
  asunto: '',
  mensaje: '',
});

/** Al elegir la etapa se proponen destinatario, canales y mensaje (Figma A.7-RC-009). */
export const propuestaAlElegirEtapa = (a: DatosAlerta, etapaId: string): DatosAlerta =>
  a.etapaId || !etapaCmn(etapaId)
    ? { ...a, etapaId }
    : { ...a, etapaId, alResponsable: true, porBandeja: true, porCorreo: true, asunto: a.asunto || ASUNTO_POR_DEFECTO, mensaje: a.mensaje || MENSAJE_POR_DEFECTO };

/** La alerta se envía un solo día: tiempo, unidad y frecuencia no aplican. */
export const esUnSoloDia = (momento: MomentoAlerta | ''): boolean => momento === 'dia-fin' || momento === 'dia-inicio';

/** Campos obligatorios que faltan. */
export function camposFaltantes(a: DatosAlerta): (keyof DatosAlerta)[] {
  const requeridos: (keyof DatosAlerta)[] = ['nombre', 'etapaId', 'momento', ...(esUnSoloDia(a.momento) ? [] : (['tiempo', 'unidad', 'frecuencia'] as const)), 'asunto'];
  return requeridos.filter((campo) => !String(a[campo]).trim());
}

/** «Comportamiento Programado»: cuándo se enviará la alerta, en palabras. */
export function comportamiento(a: DatosAlerta): string {
  const pendiente = 'Seleccionar Condición y Frecuencia de Ejecución';
  if (!a.momento) return pendiente;
  const referencia = a.momento.endsWith('fin') ? 'fin' : 'inicio';
  if (esUnSoloDia(a.momento)) return `Se enviará una sola vez, el día exacto de la fecha de ${referencia}${referencia === 'fin' ? ' (vencimiento)' : ''} de la etapa.`;
  const n = Number(a.tiempo);
  if (!n || !a.unidad || !a.frecuencia) return pendiente;
  const antes = a.momento.startsWith('antes');
  const unidad = a.unidad === 'dias' ? (n === 1 ? 'día' : 'días') : n === 1 ? 'semana' : 'semanas';
  if (a.frecuencia === 'una-vez') return `Se enviará una sola vez, ${n} ${unidad} ${antes ? 'antes' : 'después'} de la fecha de ${referencia} de la etapa.`;
  const cada = { diario: 'diariamente', interdiario: 'un día sí y un día no', 'cada-3': 'cada 3 días' }[a.frecuencia];
  const articulo = a.unidad === 'dias' ? (n === 1 ? 'el' : 'los') : n === 1 ? 'la' : 'las';
  const relativo = antes ? (n === 1 ? 'previo' : 'previos') : n === 1 ? 'posterior' : 'posteriores';
  const concordado = a.unidad === 'semanas' && antes ? (n === 1 ? 'previa' : 'previas') : relativo;
  return `Se enviará ${cada} durante ${articulo} ${n === 1 ? '' : `${n} `}${unidad} ${concordado} a la fecha de ${referencia} de la etapa.`;
}

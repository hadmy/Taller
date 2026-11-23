import { StatusTagTone } from '../../../../shared/ui/status-tag/status-tag.component';
import { EstadoEvaluacionAnexo1 } from '../models/anexo-2-fase-1.model';

/**
 * Etiqueta de la evaluación de un Anexo 01 (Figma «A.1 Rol Creador · 3. detalle items», propuesta 2): tono y texto,
 * para `siaf-status-tag` con `appearance="soft"` (Pendiente en gris, Completo en verde azulado, Incompleto en amarillo).
 * La comparten la tabla «Registros» de la solicitud y el panel «Anexo N° 01».
 */
export const ESTILO_EVALUACION_ANEXO_1: Record<EstadoEvaluacionAnexo1, { tone: StatusTagTone; texto: string }> = {
  Pendiente: { tone: 'default', texto: 'Pendiente' },
  Completo: { tone: 'success', texto: 'Completo' },
  Incompleto: { tone: 'warning', texto: 'Incompleto' },
};

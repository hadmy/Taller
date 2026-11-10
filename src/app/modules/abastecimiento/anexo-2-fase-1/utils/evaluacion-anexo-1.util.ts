import { StatusTagTone } from '../../../../shared/ui/status-tag/status-tag.component';
import { EstadoEvaluacionAnexo1 } from '../models/anexo-2-fase-1.model';

/**
 * Etiqueta de la evaluación de un Anexo 01 (Figma «status items tags» y «3. Detalle items»): tono, ícono y texto.
 * La comparten la tabla «Registros» de la solicitud y «Detalle del Anexo 1».
 */
export const ESTILO_EVALUACION_ANEXO_1: Record<EstadoEvaluacionAnexo1, { tone: StatusTagTone; icon: string; texto: string }> = {
  Pendiente: { tone: 'default', icon: 'pending', texto: 'Pendiente' },
  Conforme: { tone: 'info', icon: 'check_box', texto: 'Conforme' },
  'No conforme': { tone: 'warning', icon: 'warning', texto: 'No Conforme' },
};

/**
 * Datos iniciales de las configuraciones de alertas, ampliaciones de plazo y parámetros generales del CMN. Se agregan la
 * primera vez que se consultan: los datos guardados antes no los traen y así no hay que reiniciarlos.
 */
import { ASUNTO_POR_DEFECTO, AlertaCmn, MENSAJE_POR_DEFECTO } from '../modules/configuracion/alertas/models/alerta-cmn.model';
import type { AmpliacionPlazo } from '../modules/configuracion/ampliacion-plazo/models/ampliacion-plazo.model';
import type { ParametrosCmn } from '../modules/configuracion/parametros-cmn/models/parametros-cmn.model';

export const alertasIniciales = (): AlertaCmn[] => [
  {
    id: 'alerta-1',
    nombre: 'Texto de prueba',
    etapaId: 'f2-a1',
    momento: 'antes-fin',
    tiempo: '5',
    unidad: 'dias',
    frecuencia: 'diario',
    alResponsable: true,
    alJefe: false,
    porBandeja: true,
    porCorreo: true,
    asunto: ASUNTO_POR_DEFECTO,
    mensaje: MENSAJE_POR_DEFECTO,
    fechaRegistro: '2026-09-21',
    motivo: 'Texto de prueba',
    estado: 'Activo',
  },
];

export const ampliacionesIniciales = (): (AmpliacionPlazo & { usuarioId: string })[] => [
  {
    id: 'ampliacion-1',
    usuarioId: '',
    areaUsuaria: 'Contabilidad',
    etapa: 'Fase 2 Anexo 01: Actualización de necesidades (ATEs y no ATEs)',
    fechaFinEtapa: '2026-09-18',
    fechaRegistro: '2026-09-20',
    fechaAmpliacion: '2026-09-23',
    motivo: 'Se requiere ampliar el plazo por demora en la consolidación de requerimientos de las áreas usuarias y validación pendiente de especificaciones técnicas.',
    motivoRechazo: '',
    situacion: 'Aceptado',
  },
  {
    id: 'ampliacion-2',
    usuarioId: '',
    areaUsuaria: 'Tecnologías de Información',
    etapa: 'Fase 1 Anexo 01: Registro de necesidades (No ATEs)',
    fechaFinEtapa: '2026-03-19',
    fechaRegistro: '2026-03-20',
    fechaAmpliacion: '',
    motivo: 'Cierre del periodo contable y ajuste de actividades internas del área.',
    motivoRechazo: 'La fecha solicitada excede el cierre del periodo de programación y no cuenta con sustento.',
    situacion: 'Rechazado',
  },
  {
    id: 'ampliacion-3',
    usuarioId: '',
    areaUsuaria: 'Recursos Humanos',
    etapa: 'Fase 2 Anexo 01: Actualización de necesidades (ATEs y no ATEs)',
    fechaFinEtapa: '2026-09-18',
    fechaRegistro: '2026-09-25',
    fechaAmpliacion: '',
    motivo: 'Se solicita ampliación debido a la incorporación de nuevas necesidades priorizadas por la alta dirección y ajustes en el cuadro de necesidades.',
    motivoRechazo: '',
    situacion: 'Pendiente',
  },
];

export const parametrosIniciales = (): ParametrosCmn => ({ aniosPredefinidos: null, maximoAdicionales: 3, validacionAdicional: { 1: false, 2: false, 3: false } });

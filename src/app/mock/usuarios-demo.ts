import type { PerfilItem } from '../core/api/auth-api.service';

/**
 * Usuarios de demostración del taller. Entran con su DNI o su correo y la contraseña común.
 *
 * - Ana (creador) registra y verifica solicitudes.
 * - Luis (aprobador) aprueba, observa o rechaza lo verificado.
 * - Carla tiene los dos perfiles: sirve para mostrar el cambio de perfil desde el menú del usuario.
 * - La Especialista OA (Ministerio de Educación) registra las solicitudes del CMN (Figma «A.2-OA-EV-001-Login»).
 * - El Aprobador OA y el Evaluador OA (Ministerio de Educación) responden las solicitudes de esa entidad.
 * - Marta es la evaluadora del MEF: valida lo verificado antes de que llegue al aprobador.
 *
 * Son datos de ejemplo: no hay contraseñas reales ni se validan contra un servidor.
 */
export const CONTRASENA_DEMO = 'Taller2026*';

export interface UsuarioDemo {
  id: string;
  dni: string;
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  /** Qué muestra en el panel de usuarios del login. */
  descripcion: string;
  perfiles: PerfilItem[];
}

const ENTIDAD = {
  entidad: 'Ministerio de Economía y Finanzas',
  entidadId: 'ent-mef',
  entidadCodigo: '0001',
  entidadSiglas: 'MEF',
  ue: null,
  ueId: null,
  ueSiglas: null,
  unidad: 'Oficina General de Administración',
  unidadSigla: 'OGA',
  unidadId: 'uo-oga',
  procedimiento: 'Cuadro Multianual de Necesidades',
  procedimientoCodigo: 'CMN',
  nivelAmbito: 'PLIEGO' as const,
  entidadAmbitoId: 'amb-gn',
  entidadAmbitoCodigo: 'GN',
};

/** Ministerio de Educación: la entidad del Figma del CMN (Oficina de Logística y Abastecimiento). */
const ENTIDAD_MINEDU = {
  ...ENTIDAD,
  entidad: 'Ministerio de Educación',
  entidadId: 'ent-minedu',
  entidadCodigo: '011',
  entidadSiglas: 'MINEDU',
  unidad: 'Oficina de Logística y Abastecimiento',
  unidadSigla: 'OLA',
  unidadId: 'uo-ola',
};

function perfil(id: string, rolCodigo: 'CREADOR' | 'EVALUADOR' | 'APROBADOR', rol: string, perfilFuncional: string): PerfilItem {
  return { id, ...ENTIDAD, rol, rolCodigo, perfilFuncional };
}

export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    id: 'usr-ana',
    dni: '11111111',
    email: 'ana.torres@taller.pe',
    nombres: 'Ana',
    apellidoPaterno: 'Torres',
    apellidoMaterno: 'Díaz',
    descripcion: 'Creador: registra y verifica solicitudes',
    perfiles: [perfil('perfil-ana-creador', 'CREADOR', 'Creador', 'Operador del Cuadro Multianual de Necesidades')],
  },
  {
    id: 'usr-luis',
    dni: '22222222',
    email: 'luis.ramirez@taller.pe',
    nombres: 'Luis',
    apellidoPaterno: 'Ramírez',
    apellidoMaterno: 'Soto',
    descripcion: 'Aprobador: aprueba, observa o rechaza',
    perfiles: [perfil('perfil-luis-aprobador', 'APROBADOR', 'Aprobador', 'Aprobador del Cuadro Multianual de Necesidades')],
  },
  {
    id: 'usr-carla',
    dni: '33333333',
    email: 'carla.mendoza@taller.pe',
    nombres: 'Carla',
    apellidoPaterno: 'Mendoza',
    apellidoMaterno: 'Ríos',
    descripcion: 'Dos perfiles: creador y aprobador (cambia de perfil)',
    perfiles: [
      perfil('perfil-carla-creador', 'CREADOR', 'Creador', 'Operador del Cuadro Multianual de Necesidades'),
      perfil('perfil-carla-aprobador', 'APROBADOR', 'Aprobador', 'Aprobador del Cuadro Multianual de Necesidades'),
    ],
  },
  {
    id: 'usr-especialista-oa',
    dni: '44444444',
    email: 'especialista-oa@minedu.gob.pe',
    nombres: 'Usuario',
    apellidoPaterno: 'Especialista',
    apellidoMaterno: 'OA',
    descripcion: 'Especialista OA (Ministerio de Educación): registra las solicitudes del CMN',
    perfiles: [
      { id: 'perfil-especialista-oa', ...ENTIDAD_MINEDU, rol: 'Especialista OA', rolCodigo: 'CREADOR', perfilFuncional: 'Especialista de la Oficina de Abastecimiento' },
    ],
  },
  {
    id: 'usr-aprobador-oa',
    dni: '55555555',
    email: 'aprobador-oa@minedu.gob.pe',
    nombres: 'Usuario',
    apellidoPaterno: 'Aprobador',
    apellidoMaterno: 'OA',
    descripcion: 'Aprobador OA (Ministerio de Educación): aprueba, observa o rechaza las solicitudes del CMN',
    perfiles: [
      { id: 'perfil-aprobador-oa', ...ENTIDAD_MINEDU, rol: 'Aprobador OA', rolCodigo: 'APROBADOR', perfilFuncional: 'Aprobador de la Oficina de Abastecimiento' },
    ],
  },
  {
    id: 'usr-marta',
    dni: '66666666',
    email: 'marta.quispe@taller.pe',
    nombres: 'Marta',
    apellidoPaterno: 'Quispe',
    apellidoMaterno: 'Vega',
    descripcion: 'Evaluador: valida, observa o rechaza lo verificado',
    perfiles: [perfil('perfil-marta-evaluador', 'EVALUADOR', 'Evaluador', 'Evaluador del Cuadro Multianual de Necesidades')],
  },
  {
    id: 'usr-evaluador-oa',
    dni: '77777777',
    email: 'evaluador-oa@minedu.gob.pe',
    nombres: 'Usuario',
    apellidoPaterno: 'Evaluador',
    apellidoMaterno: 'OA',
    descripcion: 'Evaluador OA (Ministerio de Educación): valida u observa las solicitudes del CMN',
    perfiles: [
      { id: 'perfil-evaluador-oa', ...ENTIDAD_MINEDU, rol: 'Evaluador OA', rolCodigo: 'EVALUADOR', perfilFuncional: 'Evaluador de la Oficina de Abastecimiento' },
    ],
  },
];

export function buscarUsuarioPorPerfil(perfilId: string): { usuario: UsuarioDemo; perfil: PerfilItem } | null {
  for (const usuario of USUARIOS_DEMO) {
    const encontrado = usuario.perfiles.find((p) => p.id === perfilId);
    if (encontrado) return { usuario, perfil: encontrado };
  }
  return null;
}

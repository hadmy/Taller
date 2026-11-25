import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';

import type { CambiarPerfilResponse, LoginResponse, PerfilItem } from '../core/api/auth-api.service';
import type { SolicitudResponse } from '../core/api/solicitudes-api.service';
import { APP_CONFIG } from '../core/config/app.config';
import type { EstadoDocumento } from '../core/models/documento.model';
import {
  ANIOS_CMN,
  type AreaUsuariaAnexo1,
  type ConsolidadoAnexo2,
  type ContextoAnexo2,
  type DetalleAnexo1,
  type EvaluacionAnexo1Request,
  FASES_CMN,
  faseCmn,
  nombreDocumentoFase,
  type GuardarModificacionRequest,
  type VigenteAnexo2,
} from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import { armarConsolidado } from '../modules/abastecimiento/anexo-2-fase-1/utils/consolidado-anexo-2.util';
import type { ItemEstrategico } from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import {
  CATALOGO_ITEMS_ESTRATEGICOS,
  CONTEXTO_ANEXO_2_FASE_1,
  DatosTaller,
  ENTIDAD_CREADORA,
  NotificacionMock,
  TIPOS_DOCUMENTO,
  TIPO_DOCUMENTO_SA2F1,
  TIPO_DOCUMENTO_SIE,
  UNIDAD_CREADORA,
  filaHistorial,
  guardarDatos,
  itemsAnexo1,
  leerDatos,
  nuevoId,
  numeroDocumentoAnexo2Fase1,
  numeroDocumentoItemsEstrategicos,
  tipoDocumentoDe,
} from './mock-db';
import {
  aplicarCambios,
  armarModificacion,
  baseDe,
  esModificacion,
  faseDe,
  modificacionEnCurso,
  registrosDeEntidad,
  vigenteDeFase,
} from './anexo-2-registros';
import { filtrarFilasDashboard } from './dashboard-cmn';
import { alertasIniciales, ampliacionesIniciales, parametrosIniciales } from './configuracion-cmn';
import { seguimientoEntidad } from './seguimiento-entidad-cmn';
import { seguimientoNacional } from './seguimiento-nacional-cmn';
import type { FavoritoReporte } from '../modules/consultas/favoritos/favorito-reporte.model';
import { AlertaCmn, DatosAlerta, camposFaltantes, esUnSoloDia } from '../modules/configuracion/alertas/models/alerta-cmn.model';
import { MAXIMO_MOTIVO, errorFechaAmpliacion } from '../modules/configuracion/ampliacion-plazo/models/ampliacion-plazo.model';
import { MAXIMO_ADICIONALES, MAXIMO_PREDEFINIDOS, type ParametrosCmn } from '../modules/configuracion/parametros-cmn/models/parametros-cmn.model';
import { etapaCmn, hoyIso } from '../modules/configuracion/shared/etapas-cmn';
import { CONTRASENA_DEMO, USUARIOS_DEMO, UsuarioDemo, buscarUsuarioPorPerfil } from './usuarios-demo';

/**
 * Backend simulado del taller.
 *
 * Responde las llamadas a `APP_CONFIG.api.baseUrl` como lo haría el backend de SIAF-RP, con los datos de `mock-db.ts`,
 * y deja pasar todo lo demás (assets). Respeta las reglas del flujo de una solicitud: quién puede hacer cada
 * transición, comentario obligatorio al observar o rechazar, datos obligatorios para elaborar, número al elaborar y
 * registro al aprobar. Para sumar un endpoint: una entrada en `RUTAS` con su manejador.
 */

interface Sesion {
  usuario: UsuarioDemo;
  perfil: PerfilItem;
}

interface Contexto {
  req: HttpRequest<unknown>;
  params: string[];
  query: URLSearchParams;
  sesion: Sesion | null;
  datos: DatosTaller;
}

interface Respuesta {
  status: number;
  body?: unknown;
}

type Manejador = (ctx: Contexto) => Respuesta;

const LATENCIA_MS = 250;

// ─── Token (JWT sin firma: la app solo lee `exp`) ──────────────────

function base64Url(objeto: object): string {
  return btoa(JSON.stringify(objeto)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function firmarToken(usuario: UsuarioDemo, perfil: PerfilItem): string {
  const ahora = Math.floor(Date.now() / 1000);
  const payload = { sub: usuario.id, perfilId: perfil.id, sesionId: 'taller', iat: ahora, exp: ahora + 8 * 3600 };
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.taller`;
}

function sesionDelToken(token: string | null | undefined): Sesion | null {
  if (!token) return null;
  try {
    const segmento = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(segmento)) as { perfilId?: string };
    return payload.perfilId ? buscarUsuarioPorPerfil(payload.perfilId) : null;
  } catch {
    return null;
  }
}

// ─── Respuestas ────────────────────────────────────────────────────

const ok = (body: unknown = null, status = 200): Respuesta => ({ status, body });
const error = (status: number, message: string): Respuesta => ({ status, body: { message } });

function nombreCompleto(u: { nombres: string; apellidoPaterno: string; apellidoMaterno: string }): string {
  return `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`;
}

function rolDe(perfil: PerfilItem): { codigo: string; nombre: string } {
  return { codigo: perfil.rolCodigo, nombre: perfil.rol };
}

// ─── Autenticación ─────────────────────────────────────────────────

function respuestaLogin(usuario: UsuarioDemo): LoginResponse {
  const perfilActivo = usuario.perfiles[0];
  return { accessToken: firmarToken(usuario, perfilActivo), debeCambiarPassword: false, perfilActivo, perfilesDisponibles: usuario.perfiles };
}

const login: Manejador = ({ req }) => {
  const { dni, password } = (req.body ?? {}) as { dni?: string; password?: string };
  // El campo «Usuario» del login acepta el DNI o el correo.
  const credencial = dni?.trim().toLowerCase();
  const usuario = USUARIOS_DEMO.find((u) => u.dni === credencial || u.email === credencial);
  if (!usuario || password !== CONTRASENA_DEMO) return error(401, 'Usuario o contraseña incorrectos.');
  return ok(respuestaLogin(usuario));
};

const refresh: Manejador = ({ sesion }) => {
  const actual = sesion ?? sesionDelToken(localStorage.getItem('siaf_access_token'));
  if (!actual) return error(401, 'Sesión expirada.');
  return ok({ accessToken: firmarToken(actual.usuario, actual.perfil) });
};

const cambiarPerfil: Manejador = ({ req, sesion }) => {
  if (!sesion) return error(401, 'Sesión expirada.');
  const { perfilId } = (req.body ?? {}) as { perfilId?: string };
  const perfil = sesion.usuario.perfiles.find((p) => p.id === perfilId);
  if (!perfil) return error(404, 'El perfil no pertenece al usuario.');
  const respuesta: CambiarPerfilResponse = { accessToken: firmarToken(sesion.usuario, perfil), perfilActivo: perfil };
  return ok(respuesta);
};

const solicitarOtp: Manejador = ({ req }) => {
  const { email } = (req.body ?? {}) as { email?: string };
  return USUARIOS_DEMO.some((u) => u.email === email?.trim()) ? ok(null, 204) : error(404, 'El correo no está registrado.');
};

const verificarOtp: Manejador = ({ req }) => {
  const { email, codigo } = (req.body ?? {}) as { email?: string; codigo?: string };
  const usuario = USUARIOS_DEMO.find((u) => u.email === email?.trim());
  if (!usuario) return error(404, 'El correo no está registrado.');
  if (codigo !== '123456') return error(400, 'El código no es válido. En el taller es 123456.');
  return ok(respuestaLogin(usuario));
};

// ─── Catálogos ─────────────────────────────────────────────────────

const tiposDocumento: Manejador = () => ok([
  {
    ...TIPO_DOCUMENTO_SIE,
    modulo: 'abastecimiento',
    esActivo: true,
    accionesPermitidas: [{ tipoAccion: 'inclusion' }],
    proceso: { codigo: 'items-estrategicos', nombre: 'Necesidades estratégicas', modulo: 'abastecimiento' },
  },
  {
    ...TIPO_DOCUMENTO_SA2F1,
    modulo: 'abastecimiento',
    esActivo: true,
    accionesPermitidas: [{ tipoAccion: 'creacion' }, { tipoAccion: 'modificacion' }],
    proceso: { codigo: 'cmn-anexo-2-fase-1', nombre: 'CMN Programación', modulo: 'abastecimiento' },
  },
]);

// ─── Notificaciones ────────────────────────────────────────────────

function visibles(datos: DatosTaller, sesion: Sesion): NotificacionMock[] {
  return datos.notificaciones
    .filter((n) => (n.paraUsuarioId
      ? n.paraUsuarioId === sesion.usuario.id
      : n.paraRolCodigo === sesion.perfil.rolCodigo && n.paraEntidadId === sesion.perfil.entidadId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const notificaciones: Manejador = ({ datos, sesion }) => ok(sesion ? visibles(datos, sesion).slice(0, 20) : []);
const historialNotificaciones: Manejador = ({ datos, sesion }) => ok(sesion ? visibles(datos, sesion) : []);
const contadorNotificaciones: Manejador = ({ datos, sesion }) => ok({ total: sesion ? visibles(datos, sesion).filter((n) => !n.leida).length : 0 });

const marcarLeidas: Manejador = ({ datos, sesion }) => {
  if (sesion) {
    const ahora = new Date().toISOString();
    visibles(datos, sesion).forEach((n) => { n.leida = true; n.leidaEn = n.leidaEn ?? ahora; });
    guardarDatos(datos);
  }
  return ok(null, 204);
};

const marcarLeidaDocumento: Manejador = ({ datos, sesion, params }) => {
  if (sesion) {
    const ahora = new Date().toISOString();
    visibles(datos, sesion).filter((n) => n.documento?.id === params[0]).forEach((n) => { n.leida = true; n.leidaEn = n.leidaEn ?? ahora; });
    guardarDatos(datos);
  }
  return ok(null, 204);
};

function notificar(datos: DatosTaller, s: SolicitudResponse, estado: EstadoDocumento, comentario: string | null): void {
  const textos: Partial<Record<EstadoDocumento, { titulo: string; mensaje: string }>> = {
    VERIFICADO: { titulo: 'Solicitud por validar', mensaje: `La solicitud ${s.numero} fue verificada y espera su evaluación.` },
    VALIDADO: { titulo: 'Solicitud por aprobar', mensaje: `La solicitud ${s.numero} fue validada y espera su aprobación.` },
    APROBADO: { titulo: 'Solicitud aprobada', mensaje: `La solicitud ${s.numero} fue aprobada.` },
    OBSERVADO: { titulo: 'Solicitud observada', mensaje: `La solicitud ${s.numero} fue observada: ${comentario ?? 'revise el comentario'}.` },
    RECHAZADO: { titulo: 'Solicitud rechazada', mensaje: `La solicitud ${s.numero} fue rechazada.` },
  };
  const texto = textos[estado];
  if (!texto) return;
  const paraRol = { VERIFICADO: 'EVALUADOR', VALIDADO: 'APROBADOR' } as const;
  const rolDestino = estado === 'VERIFICADO' || estado === 'VALIDADO' ? paraRol[estado] : null;
  const destino = rolDestino ? { paraRolCodigo: rolDestino, paraEntidadId: s.entidadCreadora?.id } : { paraUsuarioId: s.creador?.id };
  datos.notificaciones.push({
    id: nuevoId(datos, 'not'),
    tipo: `DOCUMENTO_${estado}`,
    ...texto,
    leida: false,
    leidaEn: null,
    createdAt: new Date().toISOString(),
    documento: { id: s.id, numero: s.numero, catDocumento: tipoDocumentoDe(s) },
    ...destino,
  });
}

// ─── Solicitudes ───────────────────────────────────────────────────

/** Una solicitud de la entidad de la sesión: las de otra entidad no existen para ella. */
function buscarSolicitud(datos: DatosTaller, id: string, sesion: Contexto['sesion']): SolicitudResponse | undefined {
  return datos.solicitudes.find((s) => s.id === id && s.entidadCreadora?.id === sesion?.perfil.entidadId);
}

function esItemsEstrategicos(s: SolicitudResponse): boolean {
  return s.catDocumento?.codigo === TIPO_DOCUMENTO_SIE.codigo;
}

function esAnexo2Fase1(s: SolicitudResponse): boolean {
  return s.catDocumento?.codigo === TIPO_DOCUMENTO_SA2F1.codigo;
}

function bandeja(ctx: Contexto, estados?: EstadoDocumento[]): Respuesta {
  const { datos, sesion, query } = ctx;
  if (!sesion) return error(401, 'Sesión expirada.');
  const tipos = (query.get('tipos') ?? '').split(',').filter(Boolean);
  const busqueda = (query.get('search') ?? '').trim().toLowerCase();

  let lista = datos.solicitudes.filter((s) => s.entidadCreadora?.id === sesion.perfil.entidadId && s.estado !== 'NUEVO');
  if (estados) lista = lista.filter((s) => estados.includes(s.estado));
  if (tipos.length) lista = lista.filter((s) => tipos.includes(s.catDocumento?.codigo ?? ''));
  if (busqueda) {
    lista = lista.filter((s) =>
      [s.numero, s.asuntoMotivo, s.catDocumento?.nombre, esAnexo2Fase1(s) ? nombreDocumentoFase(faseDe(s)) : '', s.creador ? nombreCompleto(s.creador) : '']
        .some((valor) => (valor ?? '').toLowerCase().includes(busqueda)),
    );
  }
  lista = [...lista].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pagina = Number(query.get('page'));
  const limite = Number(query.get('limit'));
  if (pagina && limite) {
    return ok({ data: lista.slice((pagina - 1) * limite, pagina * limite), total: lista.length, page: pagina, limit: limite });
  }
  return ok(lista);
}

const bandejaCreador: Manejador = (ctx) => bandeja(ctx);
/** El evaluador ve lo verificado y lo que siguió; el aprobador, desde lo validado. */
const bandejaAprobador: Manejador = (ctx) => {
  const respondidas: EstadoDocumento[] = ['VALIDADO', 'OBSERVADO', 'APROBADO', 'RECHAZADO'];
  return bandeja(ctx, ctx.sesion?.perfil.rolCodigo === 'EVALUADOR' ? ['VERIFICADO', ...respondidas] : respondidas);
};

const detalleSolicitud: Manejador = ({ datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  return s ? ok(s) : error(404, 'La solicitud no existe.');
};

const crearSolicitud: Manejador = ({ req, datos, sesion }) => {
  if (!sesion) return error(401, 'Sesión expirada.');
  if (sesion.perfil.rolCodigo !== 'CREADOR') return error(403, 'Solo un creador puede registrar solicitudes.');
  const dto = (req.body ?? {}) as { tipoDocumentoId?: string; tipoAccion?: string; organoLinea?: string; justificacion?: string };
  const tipo = TIPOS_DOCUMENTO.find((t) => t.id === dto.tipoDocumentoId);
  if (!tipo) return error(400, 'El tipo de documento no existe.');
  const ahora = new Date().toISOString();
  const id = nuevoId(datos, 'sol');
  const s: SolicitudResponse = {
    id,
    numero: null,
    catDocumento: tipo,
    tipoAccion: dto.tipoAccion ?? 'creacion',
    estado: 'NUEVO',
    asuntoMotivo: `[${dto.organoLinea ?? ''}] ${dto.justificacion ?? ''}`,
    // La solicitud queda en la entidad y la unidad del perfil que la crea (así la ve en su bandeja).
    entidadCreadora: {
      id: sesion.perfil.entidadId ?? ENTIDAD_CREADORA.id,
      codMef: sesion.perfil.entidadCodigo ?? ENTIDAD_CREADORA.codMef,
      siglas: sesion.perfil.entidadSiglas ?? ENTIDAD_CREADORA.siglas,
      nombre: sesion.perfil.entidad ?? ENTIDAD_CREADORA.nombre,
    },
    unidadCreadora: { id: sesion.perfil.unidadId ?? UNIDAD_CREADORA.id, sigla: sesion.perfil.unidadSigla ?? UNIDAD_CREADORA.sigla, nombre: sesion.perfil.unidad ?? UNIDAD_CREADORA.nombre },
    creador: { id: sesion.usuario.id, nombres: sesion.usuario.nombres, apellidoPaterno: sesion.usuario.apellidoPaterno, apellidoMaterno: sesion.usuario.apellidoMaterno },
    fechaRegistro: ahora,
    createdAt: ahora,
    updatedAt: ahora,
    itemsCuenta: [],
    detalleItemsEstrategicos: null,
    detalleAnexo2Fase1: null,
    sustentos: [],
    historialEstados: [filaHistorial(datos, null, 'NUEVO', ahora, sesion.usuario, rolDe(sesion.perfil))],
  };
  datos.solicitudes.push(s);
  guardarDatos(datos);
  return ok(s, 201);
};

const actualizarSolicitud: Manejador = ({ req, datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s) return error(404, 'La solicitud no existe.');
  if (sesion?.perfil.rolCodigo !== 'CREADOR') return error(403, 'Solo el creador puede editar la solicitud.');
  if (!['ELABORADO', 'OBSERVADO'].includes(s.estado)) return error(409, 'Solo se edita una solicitud elaborada u observada.');
  const dto = (req.body ?? {}) as { justificacion?: string; organoLinea?: string };
  s.asuntoMotivo = `[${dto.organoLinea ?? ''}] ${dto.justificacion ?? ''}`;
  s.updatedAt = new Date().toISOString();
  guardarDatos(datos);
  return ok(s);
};

const guardarItemsEstrategicos: Manejador = ({ req, datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s) return error(404, 'La solicitud no existe.');
  if (!esItemsEstrategicos(s)) return error(400, 'La solicitud no es de necesidades estratégicas.');
  if (!['NUEVO', 'ELABORADO', 'OBSERVADO'].includes(s.estado)) return error(409, 'La solicitud ya no admite cambios.');
  const items = ((req.body ?? {}) as { items?: ItemEstrategico[] }).items ?? [];
  if (!items.length) return error(400, 'Seleccione al menos una necesidad estratégica.');
  const codigos = new Set(items.map((i) => i.codigo));
  if (codigos.size !== items.length) return error(400, 'Hay necesidades repetidas en la solicitud.');
  if (items.some((i) => !CATALOGO_ITEMS_ESTRATEGICOS.some((c) => c.codigo === i.codigo))) return error(400, 'Hay necesidades que no están en el catálogo.');
  s.detalleItemsEstrategicos = { documentoId: s.id, items: items.map(({ codigo, descripcion }) => ({ codigo, descripcion })) };
  s.updatedAt = new Date().toISOString();
  guardarDatos(datos);
  return ok({ message: 'Necesidades guardadas' });
};

const guardarAnexo2Fase1: Manejador = ({ req, datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s) return error(404, 'La solicitud no existe.');
  if (!esAnexo2Fase1(s) || esModificacion(s)) return error(400, 'La solicitud no es una Creación del Anexo N.º 02.');
  if (!['NUEVO', 'ELABORADO', 'OBSERVADO'].includes(s.estado)) return error(409, 'La solicitud ya no admite cambios.');
  const cuerpo = (req.body ?? {}) as { areas?: AreaUsuariaAnexo1[]; fase?: unknown };
  const areas = cuerpo.areas ?? [];
  // Fase del CMN: la que mande el cliente (1, 2 o 3); si no manda, la que ya tenía la solicitud (o la 1).
  const fase = cuerpo.fase === 2 || cuerpo.fase === 3 || cuerpo.fase === 1 ? cuerpo.fase : (s.detalleAnexo2Fase1?.fase ?? 1);
  if (!areas.length) return error(400, 'Seleccione al menos un área usuaria.');
  if (new Set(areas.map((a) => a.id)).size !== areas.length) return error(400, 'Hay áreas usuarias repetidas en la solicitud.');
  const recibidas = CONTEXTO_ANEXO_2_FASE_1.areas;
  if (areas.some((a) => !recibidas.some((r) => r.id === a.id))) return error(400, 'Hay áreas usuarias sin Anexo 01 recibido.');
  // Se guardan los datos del Anexo 01 recibido, no los que mande el cliente; un área que ya estaba conserva su evaluación.
  const previas = s.detalleAnexo2Fase1?.areas ?? [];
  s.detalleAnexo2Fase1 = {
    documentoId: s.id,
    fase,
    areas: recibidas
      .filter((r) => areas.some((a) => a.id === r.id))
      .map((r) => {
        const previa = previas.find((p) => p.id === r.id);
        return previa ? { ...r, estadoEvaluacion: previa.estadoEvaluacion, comentarioEvaluacion: previa.comentarioEvaluacion } : { ...r };
      }),
  };
  s.updatedAt = new Date().toISOString();
  guardarDatos(datos);
  return ok({ message: 'Áreas usuarias guardadas' });
};

/** La OA evalúa los Anexos 01 mientras la solicitud está en sus manos (ELABORADO u OBSERVADO). */
const ESTADOS_EVALUACION_ANEXO_1 = ['ELABORADO', 'OBSERVADO'];

/** «Anexo N° 01» (panel lateral de la tabla «Registros»): el área de la solicitud, sus ítems y si se puede evaluar. */
const detalleAnexo1: Manejador = ({ datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s || !esAnexo2Fase1(s)) return error(404, 'La solicitud no existe.');
  const area = s.detalleAnexo2Fase1?.areas.find((a) => a.id === params[1]);
  if (!area) return error(404, 'El área usuaria no está en la solicitud.');
  const detalle: DetalleAnexo1 = {
    area,
    items: itemsAnexo1(area),
    evaluable:
      sesion?.perfil.rolCodigo === 'CREADOR' && ESTADOS_EVALUACION_ANEXO_1.includes(s.estado) && area.estadoEvaluacion === 'Pendiente',
  };
  return ok(detalle);
};

/** «Consolidado del Anexo N.º 02»: los Anexos 01 de la solicitud ya revisados, agrupados y por semestre. */
const consolidadoAnexo2: Manejador = ({ datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s || !esAnexo2Fase1(s)) return error(404, 'La solicitud no existe.');
  const areas = s.detalleAnexo2Fase1?.areas ?? [];
  const consolidado: ConsolidadoAnexo2 = {
    solicitudId: s.id,
    numeroDocumento: s.numero ?? '',
    entidad: s.entidadCreadora ? `${s.entidadCreadora.codMef} - ${s.entidadCreadora.nombre}` : CONTEXTO_ANEXO_2_FASE_1.datos.entidad,
    fase: FASES_CMN[faseDe(s)].etiqueta,
    ...armarConsolidado(areas.map((area) => ({ area, items: itemsAnexo1(area) })), ANIOS_CMN),
  };
  return ok(consolidado);
};

/** «Completo» / «Incompleto» de un Anexo 01: solo el creador, una vez por área y con comentario si está incompleto. */
const evaluarAnexo1: Manejador = ({ req, datos, params, sesion }) => {
  if (!sesion) return error(401, 'Sesión expirada.');
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s || !esAnexo2Fase1(s)) return error(404, 'La solicitud no existe.');
  if (sesion.perfil.rolCodigo !== 'CREADOR') return error(403, 'Solo la Oficina de Abastecimiento evalúa los Anexos 01.');
  if (!ESTADOS_EVALUACION_ANEXO_1.includes(s.estado)) return error(409, 'La solicitud ya no admite evaluaciones.');
  const area = s.detalleAnexo2Fase1?.areas.find((a) => a.id === params[1]);
  if (!area) return error(404, 'El área usuaria no está en la solicitud.');
  if (area.estadoEvaluacion !== 'Pendiente') return error(409, 'El Anexo 01 ya fue evaluado.');
  const dto = (req.body ?? {}) as Partial<EvaluacionAnexo1Request>;
  if (dto.estado !== 'Completo' && dto.estado !== 'Incompleto') return error(400, 'Indique si el Anexo 01 está completo o incompleto.');
  const comentario = dto.comentario?.trim() ?? '';
  if (dto.estado === 'Incompleto' && !comentario) return error(400, 'Escriba el comentario de observación.');
  if (comentario.length > 200) return error(400, 'El comentario admite hasta 200 caracteres.');
  area.estadoEvaluacion = dto.estado;
  area.comentarioEvaluacion = dto.estado === 'Incompleto' ? comentario : undefined;
  s.updatedAt = new Date().toISOString();
  guardarDatos(datos);
  return ok({ message: dto.estado === 'Completo' ? 'Se dio conformidad al Anexo 01' : 'Anexo 01 observado' });
};

const subirSustento: Manejador = ({ req, datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s) return error(404, 'La solicitud no existe.');
  const formulario = req.body instanceof FormData ? req.body : null;
  const archivo = formulario?.get('archivo');
  if (!(archivo instanceof File)) return error(400, 'Adjunte un archivo.');
  const sustento = {
    id: nuevoId(datos, 'sus'),
    tipoSustento: String(formulario?.get('tipoSustento') ?? 'sustento'),
    createdAt: new Date().toISOString(),
    archivo: {
      id: nuevoId(datos, 'arc'),
      nombreOriginal: archivo.name,
      extension: archivo.name.split('.').pop() ?? '',
      mimeType: archivo.type,
      sizeBytes: String(archivo.size),
      storagePath: 'taller',
    },
  };
  // El taller guarda solo el nombre del archivo (no su contenido) y un único sustento por solicitud.
  s.sustentos = [sustento];
  guardarDatos(datos);
  return ok(sustento, 201);
};

const listarSustentos: Manejador = ({ datos, params, sesion }) => ok(buscarSolicitud(datos, params[0], sesion)?.sustentos ?? []);

const eliminarSustento: Manejador = ({ datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (s) {
    s.sustentos = (s.sustentos ?? []).filter((x) => x.id !== params[1]);
    guardarDatos(datos);
  }
  return ok(null, 204);
};

const TRANSICIONES: Record<'CREADOR' | 'EVALUADOR' | 'APROBADOR', Partial<Record<EstadoDocumento, EstadoDocumento[]>>> = {
  CREADOR: {
    NUEVO: ['ELABORADO'],
    ELABORADO: ['ELABORADO', 'VERIFICADO', 'ELIMINADO'],
    OBSERVADO: ['ELABORADO', 'VERIFICADO'],
  },
  // El Evaluador y el Aprobador del CMN no rechazan: solo validan o aprueban, u observan.
  EVALUADOR: {
    VERIFICADO: ['VALIDADO', 'OBSERVADO'],
  },
  APROBADOR: {
    VALIDADO: ['APROBADO', 'OBSERVADO'],
  },
};

const cambiarEstado: Manejador = ({ req, datos, params, sesion }) => {
  if (!sesion) return error(401, 'Sesión expirada.');
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s) return error(404, 'La solicitud no existe.');
  const dto = (req.body ?? {}) as { estadoNuevo?: EstadoDocumento; comentario?: string; motivo?: string };
  const nuevo = dto.estadoNuevo;
  const rol = sesion.perfil.rolCodigo as 'CREADOR' | 'EVALUADOR' | 'APROBADOR';
  const permitidos = [...(TRANSICIONES[rol]?.[s.estado] ?? [])];
  // En la Modificación del Anexo 02 sí se rechaza: el vigente queda como estaba.
  if (esModificacion(s) && ((rol === 'EVALUADOR' && s.estado === 'VERIFICADO') || (rol === 'APROBADOR' && s.estado === 'VALIDADO'))) permitidos.push('RECHAZADO');
  if (!nuevo || !permitidos.includes(nuevo)) {
    return error(409, `No se puede pasar de ${s.estado} a ${nuevo ?? '—'} con el perfil ${sesion.perfil.rol}.`);
  }
  const comentario = dto.comentario?.trim() ?? '';
  if ((nuevo === 'VALIDADO' || nuevo === 'OBSERVADO' || nuevo === 'RECHAZADO') && !comentario) return error(400, 'Escriba el comentario.');
  if (nuevo === 'ELIMINADO' && (s.historialEstados ?? []).some((h) => h.estadoNuevo === 'OBSERVADO')) {
    return error(409, 'No se puede eliminar una solicitud que fue observada.');
  }
  const items = esItemsEstrategicos(s);
  const anexo2 = esAnexo2Fase1(s);
  if (nuevo === 'ELABORADO') {
    if (items && !s.detalleItemsEstrategicos?.items.length) return error(400, 'Seleccione al menos una necesidad estratégica.');
    if (anexo2 && !s.detalleAnexo2Fase1?.areas.length) return error(400, 'Seleccione al menos un área usuaria.');
  }
  // Un solo registro por fase: con un Anexo 02 aprobado ya no se crea otro, se modifica el vigente.
  if (anexo2 && (nuevo === 'ELABORADO' || nuevo === 'APROBADO')) {
    const entidadId = s.entidadCreadora?.id;
    const vigente = vigenteDeFase(datos, entidadId, faseDe(s));
    if (!esModificacion(s) && vigente) {
      return error(409, `Ya existe el Anexo 02 ${vigente.numero} aprobado de la ${FASES_CMN[faseDe(s)].etiqueta}. Regístrelo como Modificación.`);
    }
    if (esModificacion(s) && vigente?.id !== s.detalleAnexo2Fase1?.base?.documentoId) return error(409, 'El Anexo 02 vigente cambió desde que se registró la modificación.');
    if (esModificacion(s) && modificacionEnCurso(datos, entidadId, faseDe(s), s.id)) return error(409, 'Ya hay una modificación en curso de esta fase.');
  }
  // Anexo N.º 02: la OA evalúa cada Anexo 01 (Completo o Incompleto) antes de verificar; ninguno puede quedar pendiente.
  if (nuevo === 'VERIFICADO' && anexo2) {
    const pendientes = (s.detalleAnexo2Fase1?.areas ?? []).filter((a) => a.estadoEvaluacion === 'Pendiente').length;
    if (pendientes) return error(400, `Evalúe los Anexos 01 antes de verificar: ${pendientes} ${pendientes === 1 ? 'sigue pendiente' : 'siguen pendientes'}.`);
  }

  const ahora = new Date().toISOString();
  const anterior = s.estado;
  if (nuevo === 'ELABORADO' && !s.numero) {
    // Cada tipo de documento lleva su propia serie.
    if (items) {
      datos.correlativoItemsEstrategicos += 1;
      s.numero = numeroDocumentoItemsEstrategicos(datos.correlativoItemsEstrategicos);
    } else if (anexo2) {
      datos.correlativoAnexo2Fase1 += 1;
      s.numero = numeroDocumentoAnexo2Fase1(datos.correlativoAnexo2Fase1);
    }
  }
  // Volver a grabar un ELABORADO no deja fila en el historial.
  if (!(anterior === 'ELABORADO' && nuevo === 'ELABORADO')) {
    const texto = nuevo === 'RECHAZADO' && dto.motivo ? `[${dto.motivo}] ${comentario}` : comentario || null;
    s.historialEstados = [...(s.historialEstados ?? []), filaHistorial(datos, anterior, nuevo, ahora, sesion.usuario, rolDe(sesion.perfil), texto)];
  }
  s.estado = nuevo;
  s.updatedAt = ahora;
  if (nuevo === 'VALIDADO') s.fechaEvaluacion = ahora;
  if (nuevo === 'APROBADO') s.fechaAprobacion = ahora;

  // Al aprobar, los ítems pasan a los registros como vigentes; uno ya registrado vuelve a quedar vigente.
  if (nuevo === 'APROBADO' && s.detalleItemsEstrategicos) {
    for (const item of s.detalleItemsEstrategicos.items) {
      const existente = datos.registrosItemsEstrategicos.find(
        (r) => r.codigo === item.codigo && r.entidadSiglas === (s.entidadCreadora?.siglas ?? ''),
      );
      const registro = {
        ...item,
        vigente: true,
        entidadSiglas: s.entidadCreadora?.siglas ?? '',
        documentoId: s.id,
        numeroDocumento: s.numero ?? '',
        fechaRegistro: ahora,
      };
      if (existente) Object.assign(existente, registro);
      else datos.registrosItemsEstrategicos.push({ id: nuevoId(datos, 'rie'), ...registro });
    }
  }

  notificar(datos, s, nuevo, comentario || null);
  guardarDatos(datos);
  return ok({ message: 'Estado actualizado', numero: s.numero });
};

// ─── Necesidades estratégicas del CMN ────────────────────────────────────

const registrosItemsEstrategicos: Manejador = ({ datos, sesion }) =>
  ok(datos.registrosItemsEstrategicos.filter((r) => !sesion || r.entidadSiglas === sesion.perfil.entidadSiglas));

const catalogoItemsEstrategicos: Manejador = () => ok(CATALOGO_ITEMS_ESTRATEGICOS);

// ─── Anexo N.º 02, Fase 1 del CMN ──────────────────────────────────

/** Contexto del Anexo N.º 02 con la entidad, la oficina y el rol de quien lo abre (MINEDU en el Figma, MEF para Ana). */
const contextoAnexo2Fase1: Manejador = ({ sesion }) => {
  const perfil = sesion?.perfil;
  if (!perfil?.entidad) return ok(CONTEXTO_ANEXO_2_FASE_1);
  const contexto: ContextoAnexo2 = {
    ...CONTEXTO_ANEXO_2_FASE_1,
    datos: {
      ...CONTEXTO_ANEXO_2_FASE_1.datos,
      entidad: `${perfil.entidadCodigo ?? ''} - ${perfil.entidad}`,
      oficinaAbastecimiento: perfil.unidad ?? CONTEXTO_ANEXO_2_FASE_1.datos.oficinaAbastecimiento,
      elaboradoPor: perfil.rol ?? CONTEXTO_ANEXO_2_FASE_1.datos.elaboradoPor,
    },
  };
  return ok(contexto);
};

/** Registros de CMN Programación: uno por fase con Anexo 02 aprobado de la entidad, con su historial de versiones. */
const registrosAnexo2Fase1: Manejador = ({ datos, sesion }) => ok(registrosDeEntidad(datos, sesion?.perfil.entidadId));

// ─── Modificación del Anexo N.º 02 ─────────────────────────────────

/** Anexo 02 vigente de la fase pedida: lo que se puede modificar y si ya hay otra modificación en curso. */
const vigenteAnexo2: Manejador = ({ datos, sesion, query }) => {
  if (!sesion) return error(401, 'Sesión expirada.');
  const fase = faseCmn(Number(query.get('fase')));
  const vigente = vigenteDeFase(datos, sesion.perfil.entidadId, fase);
  const enCurso = modificacionEnCurso(datos, sesion.perfil.entidadId, fase);
  const respuesta: VigenteAnexo2 = {
    modificacion: vigente ? armarModificacion(fase, baseDe(vigente)) : null,
    enProceso: enCurso ? { id: enCurso.id, numero: enCurso.numero ?? '', estado: enCurso.estado } : null,
  };
  return ok(respuesta);
};

const obtenerModificacion: Manejador = ({ datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  const detalle = s?.detalleAnexo2Fase1;
  if (!s || !detalle?.base) return error(404, 'La solicitud no tiene una modificación.');
  return ok(armarModificacion(faseDe(s), detalle.base, detalle.areas));
};

const guardarModificacion: Manejador = ({ req, datos, params, sesion }) => {
  const s = buscarSolicitud(datos, params[0], sesion);
  if (!s || !sesion) return error(404, 'La solicitud no existe.');
  if (sesion.perfil.rolCodigo !== 'CREADOR') return error(403, 'Solo un creador puede modificar el Anexo 02.');
  if (!esAnexo2Fase1(s) || !esModificacion(s)) return error(400, 'La solicitud no es una Modificación del Anexo N.º 02.');
  if (!['NUEVO', 'ELABORADO', 'OBSERVADO'].includes(s.estado)) return error(409, 'La solicitud ya no admite cambios.');
  const cuerpo = (req.body ?? {}) as Partial<GuardarModificacionRequest>;
  const fase = s.detalleAnexo2Fase1 ? faseDe(s) : faseCmn(cuerpo.fase);
  const entidadId = sesion.perfil.entidadId;
  const vigente = vigenteDeFase(datos, entidadId, fase);
  if (!vigente) return error(409, 'No hay un Anexo 02 aprobado de esta fase para modificar.');
  if (modificacionEnCurso(datos, entidadId, fase, s.id)) return error(409, 'Ya hay una modificación en curso de esta fase.');
  if (cuerpo.baseId !== vigente.id) return error(409, 'El Anexo 02 vigente cambió desde que se abrió la modificación.');
  const base = baseDe(vigente);
  const resultado = aplicarCambios(base, cuerpo.areas ?? []);
  if ('error' in resultado) return error(400, resultado.error);
  s.detalleAnexo2Fase1 = { documentoId: s.id, fase, areas: resultado.areas, base };
  s.updatedAt = new Date().toISOString();
  guardarDatos(datos);
  return ok({ message: 'Modificación guardada' });
};

// ─── Configuración: áreas usuarias del CMN ─────────────────────────

const listarAreasUsuarias: Manejador = ({ datos }) => ok(datos.areasUsuarias.filter((a) => !a.pendiente));

/** Catálogo de commodities/ítems de «Buscar commodities u ítems» (Figma nodo 5056:124676). */
const CATALOGO_COMMODITIES_ITEMS = (
  [
    ['78101800', 'Papel y cartón', '78101801', 'Papel bond A4 75gr'],
    ['43211500', 'Equipos de cómputo', '43211502', 'Monitor LED 24 pulgadas'],
    ['46181500', 'Equipos de protección personal', '46181501', 'Guantes de seguridad industrial'],
    ['81112200', 'Servicios de soporte informático', '81112201', 'Servicio de soporte técnico de computadoras'],
    ['73152100', 'Servicios de mantenimiento y reparación de equipos', '73152108', 'Servicio de mantenimiento de equipos'],
    ['84131600', 'Servicios de impresión y copiado', '84131600', 'Servicio de fotocopiado externo'],
  ] as const
).map(([commodity, descripcionCommodity, item, descripcionItem], i) => ({
  id: `cat-${i + 1}`,
  commodity,
  descripcionCommodity,
  item,
  descripcionItem,
}));

const catalogoItemsAreaUsuaria: Manejador = () => ok(CATALOGO_COMMODITIES_ITEMS);

const guardarItemsAreaUsuaria: Manejador = ({ req, datos, params }) => {
  const area = datos.areasUsuarias.find((a) => a.id === params[0]);
  if (!area) return error(404, 'El área usuaria no existe.');
  const { items } = (req.body ?? {}) as { items?: (typeof datos.itemsAreaUsuaria)[number][] };
  datos.itemsAreaUsuaria = [
    ...datos.itemsAreaUsuaria.filter((i) => i.areaUsuariaId !== area.id),
    ...(items ?? []).map((i) => ({ ...i, id: i.id.startsWith('nuevo-') ? nuevoId(datos, 'aui') : i.id, areaUsuariaId: area.id })),
  ];
  guardarDatos(datos);
  return ok({ message: 'Necesidades guardadas' });
};

// ─── Configuración: servicios básicos excluidos de la ley ──────────

/** Catálogo de «Seleccionar ítems» (Figma «Configuración de servicios básicos excluidos de la ley»). */
const CATALOGO_SERVICIOS_BASICOS = (
  [
    ['51', '20', '17', '22', '44152789', 'Bien', 'Servicio de Agua'],
    ['51', '20', '17', '22', '45152785', 'Bien', 'Servicio de Luz'],
    ['51', '20', '17', '22', '46152888', 'Bien', 'Servicio de Gas Natural'],
    ['51', '20', '17', '23', '47152901', 'Servicio', 'Servicio de Telefonía Fija'],
    ['51', '20', '17', '23', '47152902', 'Servicio', 'Servicio de Internet'],
    ['51', '20', '18', '10', '48153010', 'Servicio', 'Servicio de Limpieza Pública'],
    ['52', '10', '11', '05', '49160011', 'Bien', 'Papel bond A4'],
  ] as const
).map(([segmento, familia, clase, commodity, item, tipo, descripcion], i) => ({
  id: `sb-${i + 1}`,
  segmento,
  familia,
  clase,
  commodity,
  item,
  tipo,
  descripcion,
  vigente: true,
}));

const catalogoServiciosBasicos: Manejador = () => ok(CATALOGO_SERVICIOS_BASICOS);

/**
 * Entidades asignables a un servicio básico: las municipalidades provinciales y distritales del departamento de
 * Tumbes (código de ubigeo), por provincia.
 */
const ENTIDADES_SERVICIOS_BASICOS = [
  { id: 'ent-mun-tumbes', codigo: '240101', nombre: 'Municipalidad Provincial de Tumbes' },
  { id: 'ent-mun-corrales', codigo: '240102', nombre: 'Municipalidad Distrital de Corrales' },
  { id: 'ent-mun-la-cruz', codigo: '240103', nombre: 'Municipalidad Distrital de La Cruz' },
  { id: 'ent-mun-pampas-hospital', codigo: '240104', nombre: 'Municipalidad Distrital de Pampas de Hospital' },
  { id: 'ent-mun-san-jacinto', codigo: '240105', nombre: 'Municipalidad Distrital de San Jacinto' },
  { id: 'ent-mun-san-juan-virgen', codigo: '240106', nombre: 'Municipalidad Distrital de San Juan de la Virgen' },
  { id: 'ent-mun-contralmirante-villar', codigo: '240201', nombre: 'Municipalidad Provincial de Contralmirante Villar' },
  { id: 'ent-mun-casitas', codigo: '240202', nombre: 'Municipalidad Distrital de Casitas' },
  { id: 'ent-mun-canoas-punta-sal', codigo: '240203', nombre: 'Municipalidad Distrital de Canoas de Punta Sal' },
  { id: 'ent-mun-zarumilla', codigo: '240301', nombre: 'Municipalidad Provincial de Zarumilla' },
  { id: 'ent-mun-aguas-verdes', codigo: '240302', nombre: 'Municipalidad Distrital de Aguas Verdes' },
  { id: 'ent-mun-matapalo', codigo: '240303', nombre: 'Municipalidad Distrital de Matapalo' },
  { id: 'ent-mun-papayal', codigo: '240304', nombre: 'Municipalidad Distrital de Papayal' },
];

const entidadesServiciosBasicos: Manejador = () => ok(ENTIDADES_SERVICIOS_BASICOS);

const listarServiciosBasicosExcluidos: Manejador = ({ datos }) =>
  ok(datos.serviciosBasicosExcluidos.map((s) => ({ ...s, entidades: s.entidades ?? [] })));

/** Graba la lista vinculada; cada entidad asignada tiene que existir en el catálogo (si no, 400). */
const guardarServiciosBasicosExcluidos: Manejador = ({ req, datos }) => {
  const { items } = (req.body ?? {}) as { items?: typeof datos.serviciosBasicosExcluidos };
  const validas = new Set(ENTIDADES_SERVICIOS_BASICOS.map((e) => e.id));
  const lista = (items ?? []).map((s) => ({ ...s, entidades: [...new Set(s.entidades ?? [])] }));
  if (lista.some((s) => s.entidades.some((id) => !validas.has(id)))) {
    return error(400, 'Una de las entidades asignadas no existe.');
  }
  datos.serviciosBasicosExcluidos = lista;
  guardarDatos(datos);
  return ok({ message: 'Servicios básicos guardados' });
};

/** «Sincronizar»: trae del pliego la siguiente área que la lista aún no tiene, marcada como nueva; `null` si no hay más. */
const sincronizarAreasUsuarias: Manejador = ({ datos }) => {
  const area = datos.areasUsuarias.find((a) => a.pendiente);
  if (!area) return ok({ area: null });
  area.pendiente = false;
  area.nuevo = true;
  guardarDatos(datos);
  return ok({ area });
};

/**
 * Panel «Sincronizar»: unidades organizacionales del clasificador que todavía no están en la lista de la entidad.
 * No cambia nada: las elegidas se incorporan en pantalla y quedan registradas recién al grabar.
 */
const disponiblesAreasUsuarias: Manejador = ({ datos }) => ok(datos.areasUsuarias.filter((a) => a.pendiente));

/** «Sincronizar» → «Aceptar»: las unidades elegidas pasan a la lista con «¿Genera CMN?» y la etiqueta «Nuevo». */
const incorporarAreasUsuarias: Manejador = ({ req, datos }) => {
  const { ids } = (req.body ?? {}) as { ids?: string[] };
  let n = 0;
  for (const area of datos.areasUsuarias) {
    if (!area.pendiente || !ids?.includes(area.id)) continue;
    Object.assign(area, { pendiente: false, nuevo: true, generaCmn: true, activo: true });
    n++;
  }
  guardarDatos(datos);
  return ok({ incorporadas: n });
};

/**
 * «Transferir datos»: los commodities/ítems elegidos de un área inactiva pasan al área de destino (activa). Los que
 * el destino ya tiene (mismo commodity e ítem en la misma pestaña) no se duplican.
 */
const transferirAreaUsuaria: Manejador = ({ req, datos, params }) => {
  const origen = datos.areasUsuarias.find((a) => a.id === params[0]);
  const { destinoId, itemIds } = (req.body ?? {}) as { destinoId?: string; itemIds?: string[] };
  const destino = datos.areasUsuarias.find((a) => a.id === destinoId);
  if (!origen) return error(404, 'El área de origen no existe.');
  if (origen.activo !== false) return error(400, 'Solo se transfieren datos de un área inactiva.');
  if (!destino || destino.activo === false || destino.id === origen.id) return error(400, 'Seleccione un área de destino activa.');
  if (!itemIds?.length) return error(400, 'Seleccione al menos un registro.');
  const clave = (i: { tipo: string; commodity: string; item: string }) => `${i.tipo}|${i.commodity}|${i.item}`;
  const yaEnDestino = new Set(datos.itemsAreaUsuaria.filter((i) => i.areaUsuariaId === destino.id).map(clave));
  let transferidos = 0;
  datos.itemsAreaUsuaria = datos.itemsAreaUsuaria.filter((i) => {
    if (i.areaUsuariaId !== origen.id || !itemIds.includes(i.id)) return true;
    if (yaEnDestino.has(clave(i))) return false;
    i.areaUsuariaId = destino.id;
    transferidos++;
    return true;
  });
  guardarDatos(datos);
  return ok({ transferidos });
};

const detalleAreaUsuaria: Manejador = ({ datos, params }) => {
  const area = datos.areasUsuarias.find((a) => a.id === params[0]);
  if (!area) return error(404, 'El área usuaria no existe.');
  return ok({ area, items: datos.itemsAreaUsuaria.filter((i) => i.areaUsuariaId === area.id) });
};

// ─── Configuración: fechas de fase del CMN para la entidad ─────────

const listarFechasFaseCmnEntidad: Manejador = ({ datos }) =>
  ok([...datos.fechasFaseCmnEntidad].sort((a, b) => a.anio - b.anio));

const faseVacia = (): { inicio: string; fin: string } => ({ inicio: '', fin: '' });
const etapasVacias = () => ({ etapa1: faseVacia(), etapa2: faseVacia(), etapa3: faseVacia() });

const guardarFechaFaseCmnEntidad: Manejador = ({ req, datos }) => {
  const body = (req.body ?? {}) as { anio?: number; fase1?: unknown; fase2?: unknown; fase3?: unknown };
  const anio = body.anio;
  if (!anio || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return error(400, 'Ingrese un año válido.');
  }
  const existente = datos.fechasFaseCmnEntidad.find((f) => f.anio === anio);
  const fases = {
    fase1: (body.fase1 as ReturnType<typeof etapasVacias>) ?? etapasVacias(),
    fase2: (body.fase2 as ReturnType<typeof etapasVacias>) ?? etapasVacias(),
    fase3: (body.fase3 as ReturnType<typeof etapasVacias>) ?? etapasVacias(),
  };
  if (existente) {
    Object.assign(existente, fases);
    guardarDatos(datos);
    return ok(existente);
  }
  const nuevo = { id: nuevoId(datos, 'ffce'), anio, estado: 'En Proceso' as const, ...fases };
  datos.fechasFaseCmnEntidad.push(nuevo);
  guardarDatos(datos);
  return ok(nuevo, 201);
};

const eliminarFechaFaseCmnEntidad: Manejador = ({ datos, params }) => {
  const existe = datos.fechasFaseCmnEntidad.some((f) => f.id === params[0]);
  if (!existe) return error(404, 'El año no existe.');
  datos.fechasFaseCmnEntidad = datos.fechasFaseCmnEntidad.filter((f) => f.id !== params[0]);
  guardarDatos(datos);
  return ok(null, 204);
};

// ─── Configuración: fechas de fase del CMN - DPLAIP ────────────────

const listarFechasFaseCmnDplaip: Manejador = ({ datos }) =>
  ok([...datos.fechasFaseCmnDplaip].sort((a, b) => a.anio - b.anio));

const guardarFechaFaseCmnDplaip: Manejador = ({ req, datos }) => {
  const body = (req.body ?? {}) as { anio?: number; fase1?: unknown; fase2?: unknown; fase3?: unknown };
  const anio = body.anio;
  if (!anio || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return error(400, 'Ingrese un año válido.');
  }
  const existente = datos.fechasFaseCmnDplaip.find((f) => f.anio === anio);
  const fases = {
    fase1: (body.fase1 as { inicio: string; fin: string }) ?? faseVacia(),
    fase2: (body.fase2 as { inicio: string; fin: string }) ?? faseVacia(),
    fase3: (body.fase3 as { inicio: string; fin: string }) ?? faseVacia(),
  };
  if (existente) {
    Object.assign(existente, fases);
    guardarDatos(datos);
    return ok(existente);
  }
  const nuevo = { id: nuevoId(datos, 'ffcd'), anio, estado: 'En Proceso' as const, ...fases };
  datos.fechasFaseCmnDplaip.push(nuevo);
  guardarDatos(datos);
  return ok(nuevo, 201);
};

const eliminarFechaFaseCmnDplaip: Manejador = ({ datos, params }) => {
  const existe = datos.fechasFaseCmnDplaip.some((f) => f.id === params[0]);
  if (!existe) return error(404, 'El año no existe.');
  datos.fechasFaseCmnDplaip = datos.fechasFaseCmnDplaip.filter((f) => f.id !== params[0]);
  guardarDatos(datos);
  return ok(null, 204);
};

// ─── Configuración: alertas, ampliaciones de plazo y parámetros generales ───

const listarAlertas: Manejador = ({ datos }) => ok((datos.alertasCmn ??= alertasIniciales()));

const guardarAlerta: Manejador = ({ req, datos }) => {
  const { id, ...cuerpo } = req.body as DatosAlerta & { id: string | null };
  if (camposFaltantes(cuerpo).length || !etapaCmn(cuerpo.etapaId)) return error(400, 'Complete los campos obligatorios.');
  const campos: DatosAlerta = esUnSoloDia(cuerpo.momento) ? { ...cuerpo, tiempo: '', unidad: '', frecuencia: '' } : cuerpo;
  const alertas = (datos.alertasCmn ??= alertasIniciales());
  const existente = alertas.find((a) => a.id === id);
  if (id && !existente) return error(404, 'La alerta no existe.');
  const alerta: AlertaCmn = existente
    ? Object.assign(existente, campos)
    : { ...campos, id: nuevoId(datos, 'alerta'), fechaRegistro: hoyIso(), motivo: `Alerta nueva: ${campos.nombre.trim()}`, estado: 'Activo' };
  if (!existente) alertas.unshift(alerta);
  guardarDatos(datos);
  return ok(alerta, existente ? 200 : 201);
};

const inactivarAlerta: Manejador = ({ datos, params }) => {
  const alerta = (datos.alertasCmn ??= alertasIniciales()).find((a) => a.id === params[0]);
  if (!alerta) return error(404, 'La alerta no existe.');
  alerta.estado = 'Inactivo';
  guardarDatos(datos);
  return ok(alerta);
};

const eliminarAlerta: Manejador = ({ datos, params }) => {
  datos.alertasCmn = (datos.alertasCmn ?? alertasIniciales()).filter((a) => a.id !== params[0]);
  guardarDatos(datos);
  return ok(null, 204);
};

/** El creador (en el taller, el Área usuaria) ve las suyas; quien evalúa (Abastecimiento), todas. */
const listarAmpliaciones: Manejador = ({ datos, sesion }) => {
  const todas = (datos.ampliacionesPlazo ??= ampliacionesIniciales());
  return ok(sesion?.perfil.rolCodigo === 'CREADOR' ? todas.filter((a) => a.usuarioId === sesion.usuario.id) : todas);
};

const registrarAmpliacion: Manejador = ({ req, datos, sesion }) => {
  const { etapaId, motivo } = req.body as { etapaId: string; motivo: string };
  const etapa = etapaCmn(etapaId);
  if (!sesion || sesion.perfil.rolCodigo !== 'CREADOR') return error(403, 'Solo el Área usuaria registra solicitudes.');
  if (!etapa || !motivo?.trim() || motivo.length > MAXIMO_MOTIVO) return error(400, 'Ingrese el motivo de la ampliación.');
  const nueva = {
    id: nuevoId(datos, 'ampliacion'),
    usuarioId: sesion.usuario.id,
    areaUsuaria: sesion.perfil.unidad ?? '',
    etapa: etapa.nombre,
    fechaFinEtapa: etapa.fin,
    fechaRegistro: hoyIso(),
    fechaAmpliacion: '',
    motivo: motivo.trim(),
    motivoRechazo: '',
    situacion: 'Pendiente' as const,
  };
  (datos.ampliacionesPlazo ??= ampliacionesIniciales()).push(nueva);
  guardarDatos(datos);
  return ok(nueva, 201);
};

/** Acepta (con la fecha de ampliación) o rechaza (con el motivo) una solicitud pendiente. */
const evaluarAmpliacion: Manejador = ({ req, datos, sesion, params }) => {
  const ampliacion = (datos.ampliacionesPlazo ??= ampliacionesIniciales()).find((a) => a.id === params[0]);
  if (!ampliacion) return error(404, 'La solicitud no existe.');
  if (sesion?.perfil.rolCodigo === 'CREADOR') return error(403, 'Solo Abastecimiento evalúa las solicitudes.');
  if (ampliacion.situacion !== 'Pendiente') return error(409, 'La solicitud ya fue evaluada.');
  const { fechaAmpliacion = '', motivoRechazo = '' } = req.body as { fechaAmpliacion?: string; motivoRechazo?: string };
  if (params[1] === 'aceptar') {
    const problema = errorFechaAmpliacion(fechaAmpliacion, ampliacion);
    if (problema) return error(400, problema);
    Object.assign(ampliacion, { fechaAmpliacion, situacion: 'Aceptado' });
  } else {
    if (!motivoRechazo.trim()) return error(400, 'Ingrese el motivo del rechazo.');
    Object.assign(ampliacion, { motivoRechazo: motivoRechazo.trim().slice(0, MAXIMO_MOTIVO), situacion: 'Rechazado' });
  }
  guardarDatos(datos);
  return ok(ampliacion);
};

const obtenerParametrosCmn: Manejador = ({ datos }) => ok((datos.parametrosCmn ??= parametrosIniciales()));

const guardarParametrosCmn: Manejador = ({ req, datos }) => {
  const nuevos: ParametrosCmn = { ...(datos.parametrosCmn ?? parametrosIniciales()), ...(req.body as Partial<ParametrosCmn>) };
  const enRango = (n: number, hasta: number): boolean => Number.isInteger(n) && n >= 1 && n <= hasta;
  if (nuevos.aniosPredefinidos !== null && !enRango(nuevos.aniosPredefinidos, MAXIMO_PREDEFINIDOS)) return error(400, 'Los años predefinidos van de 1 a 5.');
  if (!enRango(nuevos.maximoAdicionales, MAXIMO_ADICIONALES)) return error(400, 'El máximo de años adicionales va de 1 a 20.');
  datos.parametrosCmn = nuevos;
  guardarDatos(datos);
  return ok(nuevos);
};

// ─── Configuración: distribución interna de presupuesto ────────────

const listarDistribucionInternaPresupuesto: Manejador = ({ datos }) =>
  ok([...datos.distribucionInternaPresupuesto].sort((a, b) => a.anio - b.anio));

/** Área usuaria titular, genéricas y filas fijas para armar un año nuevo: no dependen de `datos`, así siempre existen aunque se borren todos los años. */
function plantillaBaseDistribucion() {
  return {
    areaUsuariaTitular: { codigo: 'A.02.01.01.05-01', denominacion: 'Oficina General de Tecnologías de la Información' },
    entidadUe: 'MEF / Administración General',
    periodo: new Date().getFullYear(),
    genericas: [
      { codigo: '3', presupuestoRecibido: 1200000 },
      { codigo: '4', presupuestoRecibido: 300000 },
      { codigo: '7', presupuestoRecibido: 900000 },
    ],
    filas: [
      {
        id: 'plantilla-titular',
        codigoOu: 'A.02.01.01.05-01',
        denominacion: 'Oficina General de Tecnologías de la Información',
        rol: 'AU titular' as const,
        esTitular: true,
        montos: { '3': 550000, '4': 100000, '7': 400000 } as Record<string, number>,
      },
      {
        id: 'plantilla-au-1',
        codigoOu: 'A.03.01.01.05.01-01',
        denominacion: 'Oficina de Infraestructura Tecnológica',
        rol: 'AU' as const,
        esTitular: false,
        montos: { '3': 0, '4': 0, '7': 0 } as Record<string, number>,
      },
      {
        id: 'plantilla-au-2',
        codigoOu: 'A.03.01.01.05.02-01',
        denominacion: 'Oficina de Sistemas de Información',
        rol: 'AU' as const,
        esTitular: false,
        montos: { '3': 0, '4': 0, '7': 0 } as Record<string, number>,
      },
      {
        id: 'plantilla-ate-1',
        codigoOu: 'A.03.01.01.05.02.01-01',
        denominacion: 'Unidad de Desarrollo de Sistemas',
        rol: 'ATE' as const,
        esTitular: false,
        montos: { '3': 0, '4': 0, '7': 0 } as Record<string, number>,
      },
    ],
  };
}

const plantillaDistribucionInternaPresupuesto: Manejador = () => ok(plantillaBaseDistribucion());

const guardarDistribucionInternaPresupuesto: Manejador = ({ req, datos }) => {
  const body = (req.body ?? {}) as {
    anio?: number;
    presupuestoFase?: string;
    filas?: { id: string; montos: Record<string, number> }[];
  };
  const anio = body.anio;
  if (!anio || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return error(400, 'Ingrese un año válido.');
  }
  if (!body.presupuestoFase) {
    return error(400, 'Elija un presupuesto de fase.');
  }
  const contexto = plantillaBaseDistribucion();

  const existente = datos.distribucionInternaPresupuesto.find((d) => d.anio === anio && d.presupuestoFase === body.presupuestoFase);
  const filas = contexto.filas.map((fila) => {
    const cambio = (body.filas ?? []).find((f) => f.id === fila.id);
    return { ...fila, montos: cambio ? { ...cambio.montos } : { ...fila.montos } };
  });

  // Regla APM: lo asignado a las áreas no titulares de cada genérica no puede superar su presupuesto recibido.
  for (const generica of contexto.genericas) {
    const asignado = filas.filter((f) => !f.esTitular).reduce((suma, f) => suma + (f.montos[generica.codigo] || 0), 0);
    const exceso = asignado - generica.presupuestoRecibido;
    if (exceso > 0) return error(400, `Genérica ${generica.codigo}: Excede la APM recibida en S/ ${exceso.toFixed(2)}.`);
  }

  if (existente) {
    existente.filas = filas;
    guardarDatos(datos);
    return ok(existente);
  }

  const nuevo = {
    id: nuevoId(datos, 'dip'),
    anio,
    estado: 'En Proceso' as const,
    presupuestoFase: body.presupuestoFase,
    areaUsuariaTitular: contexto.areaUsuariaTitular,
    entidadUe: contexto.entidadUe,
    periodo: contexto.periodo,
    genericas: contexto.genericas,
    // Conservan el id de la plantilla: con él, «Editar» carga los montos grabados.
    filas,
  };
  datos.distribucionInternaPresupuesto.push(nuevo);
  guardarDatos(datos);
  return ok(nuevo, 201);
};

const eliminarDistribucionInternaPresupuesto: Manejador = ({ datos, params }) => {
  const existe = datos.distribucionInternaPresupuesto.some((d) => d.id === params[0]);
  if (!existe) return error(404, 'El año no existe.');
  datos.distribucionInternaPresupuesto = datos.distribucionInternaPresupuesto.filter((d) => d.id !== params[0]);
  guardarDatos(datos);
  return ok(null, 204);
};

// ─── Configuración: precios diferenciados ───────────────────────────

/**
 * Filas del «Dashboard» de Reportes (Anexo 01 de las áreas usuarias, por ítem y año): `anios` y `areas` separados
 * por coma y `tipo`, si vienen. Solo lectura.
 */
/** «Seguimiento nacional del CMN» (DPLAIP): `periodo` (por defecto 2026) y `fase` (por defecto, la vigente). */
const seguimientoNacionalCmn: Manejador = ({ query }) => {
  const fase = query.get('fase');
  const respuesta = seguimientoNacional(query.get('periodo') ?? undefined, fase ? Number(fase) : undefined);
  return respuesta ? ok(respuesta) : error(404, 'El periodo o la fase no existen.');
};

const favoritosDe = ({ datos, sesion, params }: Contexto): FavoritoReporte[] =>
  (datos.favoritosReporte ?? [])
    .filter((f) => f.usuarioId === sesion?.usuario.id && f.reporte === params[0])
    .map(({ id, nombre, predeterminado, parametros, condiciones }) => ({ id, nombre, predeterminado, parametros, condiciones }));

/** Favoritos que guardó el usuario en el reporte. */
const listarFavoritos: Manejador = (ctx) => ok(favoritosDe(ctx));

/** Guarda (o reemplaza, si trae id) un favorito; solo uno por reporte queda predeterminado. */
const guardarFavorito: Manejador = (ctx) => {
  const { datos, sesion, params, req } = ctx;
  if (!sesion) return error(401, 'Sesión expirada.');
  const f = req.body as FavoritoReporte;
  if (!f.nombre?.trim()) return error(400, 'Ingrese la descripción del favorito.');
  const lista = (datos.favoritosReporte ??= []);
  const propios = lista.filter((x) => x.usuarioId === sesion.usuario.id && x.reporte === params[0]);
  if (f.predeterminado) propios.forEach((x) => (x.predeterminado = false));
  const campos = { nombre: f.nombre.trim(), predeterminado: f.predeterminado, parametros: f.parametros, condiciones: f.condiciones };
  const existente = propios.find((x) => x.id === f.id);
  if (existente) Object.assign(existente, campos);
  else lista.push({ ...campos, id: nuevoId(datos, 'fav'), usuarioId: sesion.usuario.id, reporte: params[0] });
  guardarDatos(datos);
  return ok(favoritosDe(ctx));
};

const eliminarFavorito: Manejador = (ctx) => {
  const { datos, sesion, params } = ctx;
  datos.favoritosReporte = (datos.favoritosReporte ?? []).filter((f) => !(f.id === params[1] && f.usuarioId === sesion?.usuario.id));
  guardarDatos(datos);
  return ok(favoritosDe(ctx));
};

/** «Resumen de la Entidad» del seguimiento del CMN: áreas usuarias, Anexos N.º 01 y necesidades de las tres fases. */
const seguimientoEntidadCmn: Manejador = () => ok(seguimientoEntidad());

const filasDashboard: Manejador = ({ query }) => {
  const lista = (clave: string): string[] => (query.get(clave) ?? '').split(',').filter(Boolean);
  return ok(filtrarFilasDashboard({ anios: lista('anios'), areas: lista('areas'), tipo: query.get('tipo') ?? undefined }));
};

const listarPreciosDiferenciados: Manejador = ({ datos }) => ok(datos.preciosDiferenciados);

/** Catálogo CUBSO del que se elige en «Seleccionar ítems» (Figma, nodo 4683:867558). */
const CATALOGO_CUBSO = (
  [
    ['5311000100021482', 'Servicio de vigilancia diurna sin armas'],
    ['5311000100021483', 'Servicio de seguridad para transporte'],
    ['7412000300019920', 'Servicios de monitoreo'],
    ['5311000100021490', 'Servicio de vigilancia nocturna con armas'],
    ['7611150100014561', 'Servicio de limpieza de oficinas'],
    ['7611150100014562', 'Servicio de limpieza de ambientes hospitalarios'],
    ['7810180100003311', 'Servicio de transporte de personal'],
    ['8111220100007781', 'Servicio de soporte técnico informático'],
    ['8213150100002201', 'Servicio de impresión de documentos'],
    ['9010150100004410', 'Servicio de alimentación para personal'],
  ] as const
).map(([codigoCubso, descripcion], i) => ({ id: `cubso-${i + 1}`, codigoCubso, descripcion }));

const catalogoCubso: Manejador = () => ok(CATALOGO_CUBSO);

/**
 * «Grabar» de la pantalla: los CUBSO elegidos no se guardan uno por uno, sino como un solo registro con el primero
 * (código y descripción) y, en «N° de precios generado», el total de CUBSO elegidos. Si ese código ya estaba, el
 * total se suma al suyo.
 */
const agregarPreciosDiferenciados: Manejador = ({ req, datos }) => {
  const { cubsos } = (req.body ?? {}) as { cubsos?: { codigoCubso: string; descripcion: string }[] };
  if (!cubsos?.length) return error(400, 'Seleccione al menos un CUBSO.');
  const [primero] = cubsos;
  const existente = datos.preciosDiferenciados.find((p) => p.codigoCubso === primero.codigoCubso);
  if (existente) {
    existente.numPreciosGenerados += cubsos.length;
  } else {
    datos.preciosDiferenciados.push({
      id: nuevoId(datos, 'pd'),
      codigoCubso: primero.codigoCubso,
      descripcion: primero.descripcion,
      numPreciosGenerados: cubsos.length,
      precios: [],
    });
  }
  guardarDatos(datos);
  return ok(datos.preciosDiferenciados);
};

const obtenerPrecioDiferenciado: Manejador = ({ datos, params }) => {
  const cubso = datos.preciosDiferenciados.find((p) => p.id === params[0]);
  if (!cubso) return error(404, 'El CUBSO no existe.');
  return ok(cubso);
};

/**
 * «Grabar» de «Editar precios diferenciados»: reemplaza los precios por área (cada uno necesita área y monto) y deja
 * en «N° de precios generado» la cantidad de precios vigentes.
 */
const guardarPreciosArea: Manejador = ({ req, datos, params }) => {
  const cubso = datos.preciosDiferenciados.find((p) => p.id === params[0]);
  if (!cubso) return error(404, 'El CUBSO no existe.');
  const { precios } = (req.body ?? {}) as { precios?: { area: string; descripcion: string; monto: number | null; vigente: boolean }[] };
  const lista = precios ?? [];
  if (lista.some((p) => !p.area?.trim() || p.monto === null || !(p.monto > 0))) {
    return error(400, 'Cada precio necesita un área y un monto mayor que cero.');
  }
  cubso.precios = lista.map((p) => ({
    id: nuevoId(datos, 'pa'),
    area: p.area.trim(),
    descripcion: p.descripcion?.trim() ?? '',
    monto: p.monto,
    vigente: !!p.vigente,
  }));
  // Solo cuentan los precios vigentes: apagar la vigencia de uno lo descuenta del total.
  cubso.numPreciosGenerados = cubso.precios.filter((p) => p.vigente).length;
  guardarDatos(datos);
  return ok(cubso);
};

const eliminarPrecioDiferenciado: Manejador = ({ datos, params }) => {
  const existe = datos.preciosDiferenciados.some((p) => p.id === params[0]);
  if (!existe) return error(404, 'El CUBSO no existe.');
  datos.preciosDiferenciados = datos.preciosDiferenciados.filter((p) => p.id !== params[0]);
  guardarDatos(datos);
  return ok(null, 204);
};

const guardarAreasUsuarias: Manejador = ({ req, datos }) => {
  const { areas } = (req.body ?? {}) as { areas?: { id: string; generaCmn: boolean; esAte: boolean; esOa: boolean; esMaa: boolean }[] };
  // Reglas MAA y OA: solo un área puede serlo. La que se acaba de marcar (antes no lo era) desplaza a la anterior.
  let nuevaMaa: string | null = null;
  let nuevaOa: string | null = null;
  for (const cambio of areas ?? []) {
    const area = datos.areasUsuarias.find((a) => a.id === cambio.id);
    if (!area) continue;
    if (cambio.esMaa && !area.esMaa) nuevaMaa = area.id;
    if (cambio.esOa && !area.esOa) nuevaOa = area.id;
    // Una unidad incorporada desde «Sincronizar» deja de estar pendiente al grabarse.
    Object.assign(area, cambio, { nuevo: false, configurada: true, pendiente: false });
  }
  for (const area of datos.areasUsuarias) {
    if (nuevaMaa && area.id !== nuevaMaa) area.esMaa = false;
    if (nuevaOa && area.id !== nuevaOa) area.esOa = false;
  }
  guardarDatos(datos);
  return ok({ message: 'Configuración guardada' });
};

// ─── Enrutador ─────────────────────────────────────────────────────

const RUTAS: [string, RegExp, Manejador][] = [
  ['POST', /^\/auth\/login$/, login],
  ['POST', /^\/auth\/logout$/, () => ok(null, 204)],
  ['POST', /^\/auth\/refresh$/, refresh],
  ['PATCH', /^\/auth\/cambiar-perfil$/, cambiarPerfil],
  ['POST', /^\/auth\/cambiar-password$/, () => ok(null, 204)],
  ['POST', /^\/auth\/solicitar-otp$/, solicitarOtp],
  ['POST', /^\/auth\/verificar-otp$/, verificarOtp],
  ['POST', /^\/auth\/reenviar-otp-whatsapp$/, () => ok(null, 204)],
  ['GET', /^\/tipos-documento$/, tiposDocumento],
  ['GET', /^\/notificaciones$/, notificaciones],
  ['GET', /^\/notificaciones\/historial$/, historialNotificaciones],
  ['GET', /^\/notificaciones\/contador$/, contadorNotificaciones],
  ['PATCH', /^\/notificaciones\/marcar-leidas$/, marcarLeidas],
  ['PATCH', /^\/notificaciones\/marcar-leida-documento\/([^/]+)$/, marcarLeidaDocumento],
  ['GET', /^\/solicitudes\/bandeja-creador$/, bandejaCreador],
  ['GET', /^\/solicitudes\/bandeja-aprobador$/, bandejaAprobador],
  ['POST', /^\/solicitudes$/, crearSolicitud],
  ['PATCH', /^\/solicitudes\/([^/]+)\/estado$/, cambiarEstado],
  ['POST', /^\/solicitudes\/([^/]+)\/items-estrategicos$/, guardarItemsEstrategicos],
  ['POST', /^\/solicitudes\/([^/]+)\/sustentos$/, subirSustento],
  ['GET', /^\/solicitudes\/([^/]+)\/sustentos$/, listarSustentos],
  ['DELETE', /^\/solicitudes\/([^/]+)\/sustentos\/([^/]+)$/, eliminarSustento],
  ['GET', /^\/solicitudes\/([^/]+)$/, detalleSolicitud],
  ['PATCH', /^\/solicitudes\/([^/]+)$/, actualizarSolicitud],
  ['GET', /^\/items-estrategicos$/, registrosItemsEstrategicos],
  ['GET', /^\/items-estrategicos\/catalogo$/, catalogoItemsEstrategicos],
  ['POST', /^\/solicitudes\/([^/]+)\/anexo-2-fase-1$/, guardarAnexo2Fase1],
  ['GET', /^\/solicitudes\/([^/]+)\/anexo-2-fase-1\/areas\/([^/]+)$/, detalleAnexo1],
  ['POST', /^\/solicitudes\/([^/]+)\/anexo-2-fase-1\/areas\/([^/]+)\/evaluacion$/, evaluarAnexo1],
  ['GET', /^\/solicitudes\/([^/]+)\/anexo-2-fase-1\/consolidado$/, consolidadoAnexo2],
  ['GET', /^\/cmn\/anexo-2-fase-1\/contexto$/, contextoAnexo2Fase1],
  ['GET', /^\/cmn\/anexo-2-fase-1\/registros$/, registrosAnexo2Fase1],
  ['GET', /^\/solicitudes\/([^/]+)\/anexo-2-fase-1\/modificacion$/, obtenerModificacion],
  ['POST', /^\/solicitudes\/([^/]+)\/anexo-2-fase-1\/modificacion$/, guardarModificacion],
  ['GET', /^\/cmn\/anexo-2\/vigente$/, vigenteAnexo2],
  ['GET', /^\/configuracion\/areas-usuarias$/, listarAreasUsuarias],
  ['PUT', /^\/configuracion\/areas-usuarias$/, guardarAreasUsuarias],
  ['POST', /^\/configuracion\/areas-usuarias\/sincronizar$/, sincronizarAreasUsuarias],
  ['GET', /^\/configuracion\/areas-usuarias\/disponibles$/, disponiblesAreasUsuarias],
  ['POST', /^\/configuracion\/areas-usuarias\/incorporar$/, incorporarAreasUsuarias],
  ['POST', /^\/configuracion\/areas-usuarias\/([^/]+)\/transferir$/, transferirAreaUsuaria],
  ['GET', /^\/configuracion\/servicios-basicos-excluidos$/, listarServiciosBasicosExcluidos],
  ['GET', /^\/configuracion\/servicios-basicos-excluidos\/catalogo$/, catalogoServiciosBasicos],
  ['GET', /^\/configuracion\/servicios-basicos-excluidos\/entidades$/, entidadesServiciosBasicos],
  ['PUT', /^\/configuracion\/servicios-basicos-excluidos$/, guardarServiciosBasicosExcluidos],
  ['GET', /^\/configuracion\/areas-usuarias\/catalogo-items$/, catalogoItemsAreaUsuaria],
  ['PUT', /^\/configuracion\/areas-usuarias\/([^/]+)\/items$/, guardarItemsAreaUsuaria],
  ['GET', /^\/configuracion\/areas-usuarias\/([^/]+)\/detalle$/, detalleAreaUsuaria],
  ['GET', /^\/configuracion\/fechas-fase-cmn-entidad$/, listarFechasFaseCmnEntidad],
  ['PUT', /^\/configuracion\/fechas-fase-cmn-entidad$/, guardarFechaFaseCmnEntidad],
  ['DELETE', /^\/configuracion\/fechas-fase-cmn-entidad\/([^/]+)$/, eliminarFechaFaseCmnEntidad],
  ['GET', /^\/configuracion\/fechas-fase-cmn-dplaip$/, listarFechasFaseCmnDplaip],
  ['PUT', /^\/configuracion\/fechas-fase-cmn-dplaip$/, guardarFechaFaseCmnDplaip],
  ['GET', /^\/configuracion\/alertas$/, listarAlertas],
  ['POST', /^\/configuracion\/alertas$/, guardarAlerta],
  ['POST', /^\/configuracion\/alertas\/([^/]+)\/inactivar$/, inactivarAlerta],
  ['DELETE', /^\/configuracion\/alertas\/([^/]+)$/, eliminarAlerta],
  ['GET', /^\/configuracion\/ampliaciones-plazo$/, listarAmpliaciones],
  ['POST', /^\/configuracion\/ampliaciones-plazo$/, registrarAmpliacion],
  ['POST', /^\/configuracion\/ampliaciones-plazo\/([^/]+)\/(aceptar|rechazar)$/, evaluarAmpliacion],
  ['GET', /^\/configuracion\/parametros-cmn$/, obtenerParametrosCmn],
  ['PUT', /^\/configuracion\/parametros-cmn$/, guardarParametrosCmn],
  ['DELETE', /^\/configuracion\/fechas-fase-cmn-dplaip\/([^/]+)$/, eliminarFechaFaseCmnDplaip],
  ['GET', /^\/configuracion\/distribucion-interna-presupuesto\/plantilla$/, plantillaDistribucionInternaPresupuesto],
  ['GET', /^\/configuracion\/distribucion-interna-presupuesto$/, listarDistribucionInternaPresupuesto],
  ['PUT', /^\/configuracion\/distribucion-interna-presupuesto$/, guardarDistribucionInternaPresupuesto],
  ['DELETE', /^\/configuracion\/distribucion-interna-presupuesto\/([^/]+)$/, eliminarDistribucionInternaPresupuesto],
  ['GET', /^\/configuracion\/precios-diferenciados$/, listarPreciosDiferenciados],
  ['GET', /^\/configuracion\/precios-diferenciados\/catalogo-cubso$/, catalogoCubso],
  ['POST', /^\/configuracion\/precios-diferenciados$/, agregarPreciosDiferenciados],
  ['GET', /^\/configuracion\/precios-diferenciados\/([^/]+)$/, obtenerPrecioDiferenciado],
  ['PUT', /^\/configuracion\/precios-diferenciados\/([^/]+)\/precios$/, guardarPreciosArea],
  ['DELETE', /^\/configuracion\/precios-diferenciados\/([^/]+)$/, eliminarPrecioDiferenciado],
  ['GET', /^\/reportes\/dashboard-cmn$/, filasDashboard],
  ['GET', /^\/reportes\/seguimiento-nacional-cmn$/, seguimientoNacionalCmn],
  ['GET', /^\/reportes\/([^/]+)\/favoritos$/, listarFavoritos],
  ['POST', /^\/reportes\/([^/]+)\/favoritos$/, guardarFavorito],
  ['DELETE', /^\/reportes\/([^/]+)\/favoritos\/([^/]+)$/, eliminarFavorito],
  ['GET', /^\/reportes\/seguimiento-entidad-cmn$/, seguimientoEntidadCmn],
];

export const mockBackendInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const base = APP_CONFIG.api.baseUrl;
  const url = new URL(req.url, window.location.origin);
  if (!url.pathname.startsWith(base)) return next(req);

  const ruta = url.pathname.slice(base.length) || '/';
  // Los parámetros pueden venir en la URL o en HttpParams.
  const query = new URLSearchParams(url.search);
  req.params.keys().forEach((clave) => query.set(clave, req.params.get(clave) ?? ''));

  for (const [metodo, patron, manejador] of RUTAS) {
    const coincidencia = req.method === metodo ? patron.exec(ruta) : null;
    if (!coincidencia) continue;
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const respuesta = manejador({ req, params: coincidencia.slice(1), query, sesion: sesionDelToken(token), datos: leerDatos() });
    return responder(req, respuesta);
  }

  console.warn(`[mock] Endpoint no simulado: ${req.method} ${ruta}`);
  return responder(req, error(404, `El backend simulado no responde ${req.method} ${ruta}.`));
};

function responder(req: HttpRequest<unknown>, respuesta: Respuesta): Observable<HttpEvent<unknown>> {
  if (respuesta.status < 400) {
    return of(new HttpResponse({ status: respuesta.status, body: respuesta.body ?? null, url: req.url })).pipe(delay(LATENCIA_MS));
  }
  return timer(LATENCIA_MS).pipe(
    mergeMap(() => throwError(() => new HttpErrorResponse({ status: respuesta.status, error: respuesta.body, url: req.url }))),
  );
}

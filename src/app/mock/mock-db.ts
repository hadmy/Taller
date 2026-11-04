import type { NotificacionResponse } from '../core/api/notificaciones-api.service';
import type { HistorialItem, SolicitudResponse } from '../core/api/solicitudes-api.service';
import type { EstadoDocumento } from '../core/models/documento.model';
import type { ItemEstrategico, ItemEstrategicoCatalogo, ItemEstrategicoRegistro } from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import {
  CODIGO_DOCUMENTO as CODIGO_DOCUMENTO_SIE,
  NOMBRE_DOCUMENTO as NOMBRE_DOCUMENTO_SIE,
  TIPO_ACCION as TIPO_ACCION_SIE,
} from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import type { ContextoAnexo2 } from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import {
  CODIGO_DOCUMENTO as CODIGO_DOCUMENTO_SA2F1,
  NOMBRE_DOCUMENTO as NOMBRE_DOCUMENTO_SA2F1,
  TIPO_ACCION as TIPO_ACCION_SA2F1,
} from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import type { AreaUsuaria, AreaUsuariaItem } from '../modules/configuracion/areas-usuarias/models/area-usuaria.model';
import type { DistribucionInternaPresupuesto } from '../modules/configuracion/distribucion-interna-presupuesto/models/distribucion-interna-presupuesto.model';
import type { FechaFaseCmnDplaip } from '../modules/configuracion/fechas-fase-cmn-dplaip/models/fecha-fase-cmn.model';
import type { FechaFaseCmnEntidad } from '../modules/configuracion/fechas-fase-cmn-entidad/models/fecha-fase-cmn.model';
import type { PrecioDiferenciado } from '../modules/configuracion/precios-diferenciados/models/precio-diferenciado.model';
import type { ServicioBasico } from '../modules/configuracion/servicios-basicos-excluidos/models/servicio-basico.model';
import { USUARIOS_DEMO, UsuarioDemo } from './usuarios-demo';

/**
 * «Base de datos» del backend simulado: vive en el `localStorage` del navegador, así lo que hace un usuario lo ve
 * otro al iniciar sesión (en el mismo navegador). `reiniciarDatosDemo()` vuelve a los datos iniciales.
 */

const CLAVE = 'taller-siaf-rp:datos';
const VERSION = 34;

export interface NotificacionMock extends NotificacionResponse {
  /** Destinatario: un usuario puntual o, si no hay, todos los perfiles con este rol en la entidad de la solicitud. */
  paraUsuarioId?: string;
  paraRolCodigo?: 'CREADOR' | 'EVALUADOR' | 'APROBADOR';
  paraEntidadId?: string;
}

export interface DatosTaller {
  version: number;
  solicitudes: SolicitudResponse[];
  /** Ítems aprobados como estratégicos (proceso SIE del CMN). */
  registrosItemsEstrategicos: ItemEstrategicoRegistro[];
  areasUsuarias: AreaUsuaria[];
  itemsAreaUsuaria: AreaUsuariaItem[];
  fechasFaseCmnEntidad: FechaFaseCmnEntidad[];
  fechasFaseCmnDplaip: FechaFaseCmnDplaip[];
  distribucionInternaPresupuesto: DistribucionInternaPresupuesto[];
  preciosDiferenciados: PrecioDiferenciado[];
  serviciosBasicosExcluidos: ServicioBasico[];
  notificaciones: NotificacionMock[];
  /** Correlativo propio de las Solicitudes de Necesidades Estratégicas (su número tiene otra serie). */
  correlativoItemsEstrategicos: number;
  /** Correlativo propio de las Solicitudes de CMN - Anexo N.º 02, Fase 1. */
  correlativoAnexo2Fase1: number;
  secuencia: number;
}

export const TIPO_DOCUMENTO_SIE = { id: 'td-sie', codigo: CODIGO_DOCUMENTO_SIE, nombre: NOMBRE_DOCUMENTO_SIE };
export const TIPO_DOCUMENTO_SA2F1 = { id: 'td-sa2f1', codigo: CODIGO_DOCUMENTO_SA2F1, nombre: NOMBRE_DOCUMENTO_SA2F1 };
/** Tipos de documento del taller: la solicitud se crea con uno de estos (por `tipoDocumentoId`). */
export const TIPOS_DOCUMENTO = [TIPO_DOCUMENTO_SIE, TIPO_DOCUMENTO_SA2F1];
export type TipoDocumentoTaller = (typeof TIPOS_DOCUMENTO)[number];

/** Tipo de documento de una solicitud (el de las notificaciones); sin uno conocido, el que trae la solicitud. */
export function tipoDocumentoDe(s: SolicitudResponse): TipoDocumentoTaller {
  return TIPOS_DOCUMENTO.find((t) => t.codigo === s.catDocumento?.codigo)
    ?? { id: s.catDocumento?.id ?? '', codigo: s.catDocumento?.codigo ?? '', nombre: s.catDocumento?.nombre ?? '' };
}
export const ENTIDAD_CREADORA = { id: 'ent-mef', codMef: '0001', siglas: 'MEF', nombre: 'Ministerio de Economía y Finanzas' };
export const UNIDAD_CREADORA = { id: 'uo-oga', sigla: 'OGA', nombre: 'Oficina General de Administración' };

export function leerDatos(): DatosTaller {
  try {
    const guardados = localStorage.getItem(CLAVE);
    if (guardados) {
      const datos = JSON.parse(guardados) as DatosTaller;
      if (datos.version === VERSION) return datos;
    }
  } catch {
    // Datos corruptos o sin acceso al almacenamiento: se empieza de nuevo.
  }
  const iniciales = crearDatosIniciales();
  guardarDatos(iniciales);
  return iniciales;
}

export function guardarDatos(datos: DatosTaller): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento (modo privado estricto): los cambios duran lo que dure la pestaña.
  }
}

/** Vuelve a los datos iniciales de la demo. */
export function reiniciarDatosDemo(): void {
  guardarDatos(crearDatosIniciales());
}

export function nuevoId(datos: DatosTaller, prefijo: string): string {
  datos.secuencia += 1;
  return `${prefijo}-${datos.secuencia}`;
}

/** Número de una Solicitud de Necesidades Estratégicas: serie propia del CMN. */
export function numeroDocumentoItemsEstrategicos(correlativo: number, fecha: Date): string {
  return `CMN-SIE-${String(correlativo).padStart(5, '0')}-${fecha.getFullYear()}-MEF-OGA`;
}

/** Número de una Solicitud de CMN - Anexo N.º 02, Fase 1: correlativo propio de cuatro dígitos («0002», Figma EV-009). */
export function numeroDocumentoAnexo2Fase1(correlativo: number): string {
  return String(correlativo).padStart(4, '0');
}

/** Fecha ISO (`AAAA-MM-DD`) a `dias` de hoy. */
function diaRelativo(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/**
 * Contexto de la Solicitud de CMN - Anexo N.º 02, Fase 1 (Figma «2. Registro de solicitud»): datos del anexo, resumen de
 * la consolidación, marco presupuestario y los Anexos 01 que remitieron las áreas usuarias.
 */
export const CONTEXTO_ANEXO_2_FASE_1: ContextoAnexo2 = {
  datos: {
    entidad: '011 - Ministerio de Educación',
    oficinaAbastecimiento: 'Oficina de Logística y Abastecimiento',
    referenciaPresupuestaria: 'APM 2025',
    fase: 'Fase 1 - Identificación',
    elaboradoPor: 'Especialista OA',
  },
  resumen: { anexosRecibidos: 4, conformes: 2, observados: 1, necesidades: 21, anexosEvaluados: 3 },
  marcoPresupuestario: [
    { anio: 2027, referencia: 'APM 2025 - Año 2 (2027)', techoPresupuestal: 920_000, consolidadoAnexo1: 412_480 },
    { anio: 2028, referencia: 'APM 2025 - Año 3 (2028)', techoPresupuestal: 980_000, consolidadoAnexo1: 316_200 },
    { anio: 2029, referencia: 'APM 2025 - Año 4 (2029)', techoPresupuestal: 980_000, consolidadoAnexo1: 316_200 },
  ],
  // Plazos relativos a hoy, como en el Figma (19/08): tres vigentes y uno vencido.
  areas: [
    { id: 'a1-rrhh', nombre: 'Oficina de Recursos Humanos', items: 6, montoProgramado: 524_600, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(3) },
    { id: 'a1-oti', nombre: 'Oficina de Tecnología de la Información', items: 5, montoProgramado: 577_000, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(-1) },
    { id: 'a1-oa', nombre: 'Oficina de Abastecimiento', items: 7, montoProgramado: 467_880, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(5) },
    { id: 'a1-oc', nombre: 'Oficina de Contabilidad', items: 3, montoProgramado: 112_200, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(4) },
  ],
};

/** Catálogo de ítems que se pueden proponer como estratégicos (los del prototipo y algunos más para paginar). */
export const CATALOGO_ITEMS_ESTRATEGICOS: ItemEstrategicoCatalogo[] = (
  [
    ['4215271000010524', 'Placas radiográficas'],
    ['4215281500010638', 'Antibiótico de amplio espectro'],
    ['4215320800010127', 'Oxígeno medicinal'],
    ['4215271200011622', 'Tomógrafo'],
    ['4215271200011812', 'Ecógrafo'],
    ['4215271200011933', 'Resonador magnético'],
    ['4215271000022011', 'Desfibrilador portátil'],
    ['4215281500033022', 'Analgésico intravenoso'],
    ['4215320800044033', 'Mascarilla de oxígeno adulto'],
    ['4215271200055044', 'Equipo de rayos X portátil'],
    ['4215271200066055', 'Monitor de signos vitales'],
    ['4214150200017741', 'Jeringa descartable 5 ml'],
    ['4214220600018852', 'Guantes quirúrgicos estériles'],
    ['4218150100019963', 'Termómetro clínico digital'],
    ['4222150300020074', 'Ventilador mecánico'],
    ['4229170400021185', 'Bisturí descartable'],
    ['4231150100022296', 'Gasa estéril'],
    ['4214170300023307', 'Catéter venoso periférico'],
  ] as const
).map(([codigo, descripcion], i) => ({ id: `ie-${i + 1}`, codigo, descripcion }));

export function filaHistorial(
  datos: DatosTaller,
  anterior: EstadoDocumento | null,
  nuevo: EstadoDocumento,
  fecha: string,
  usuario: UsuarioDemo,
  rol: { codigo: string; nombre: string },
  comentario: string | null = null,
): HistorialItem {
  return {
    id: nuevoId(datos, 'hist'),
    estadoAnterior: anterior,
    estadoNuevo: nuevo,
    comentario,
    createdAt: fecha,
    creador: { nombres: usuario.nombres, apellidoPaterno: usuario.apellidoPaterno, apellidoMaterno: usuario.apellidoMaterno },
    perfil: { cfgPerfil: { rol } },
    unidadOrganica: usuario.perfiles[0]?.unidad ? { nombre: usuario.perfiles[0].unidad } : null,
  };
}

// ─── Datos iniciales ───────────────────────────────────────────────

const ROL_CREADOR = { codigo: 'CREADOR', nombre: 'Creador' };
const ROL_EVALUADOR = { codigo: 'EVALUADOR', nombre: 'Evaluador' };
const ROL_APROBADOR = { codigo: 'APROBADOR', nombre: 'Aprobador' };

type EstadoSemilla = 'ELABORADO' | 'VERIFICADO' | 'VALIDADO' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

/** Áreas usuarias del pliego demo: jerarquía corta por código (`01`, `01.01`, `01.01.01`…). */
const AREAS_USUARIAS_SEMILLA: Omit<AreaUsuaria, 'id'>[] = [
  ['01', 'ALTA DIRECCIÓN'],
  ['01.01', 'RECTORADO'],
  ['01.01.01', 'SECRETARÍA GENERAL'],
  ['01.01.01.01', 'OFICINA ADMINISTRATIVA'],
  ['01.01.01.01.01', 'MESA DE PARTES'],
  ['01.01.01.01.01.02', 'UNIDAD DE GRADOS Y TÍTULOS'],
  ['01.01.01.02.01', 'REGISTRO DE DIPLOMAS'],
  ['01.01.01.01.01.02', 'UNIDAD DE GRADOS Y TÍTULOS'],
  ['01.01.02', 'OFICINA DE IMAGEN INSTITUCIONAL'],
  ['01.01.02.01', 'UNIDAD DE COMUNICACIONES'],
  ['01.01.02.02', 'UNIDAD DE PROTOCOLO Y EVENTOS'],
  ['01.02', 'VICERRECTORADO ACADÉMICO'],
  // «Mesa de partes» y «Vicerrectorado académico» están en el pliego pero la lista los recibe al pulsar «Sincronizar».
].map(([codigo, denominacion]) => ({
  codigo,
  denominacion,
  generaCmn: true,
  esAte: false,
  esOa: false,
  esMaa: false,
  pendiente: ['01.01.01.01.01', '01.02'].includes(codigo),
}));

interface SemillaItems {
  /** Posiciones en `CATALOGO_ITEMS_ESTRATEGICOS`. */
  items: number[];
  /** Día en que se creó la solicitud (yyyy-mm-dd). */
  creada: string;
  estado: EstadoSemilla;
  justificacion: string;
  comentario?: string;
  /** Códigos que quedan como no vigentes en los registros. */
  noVigentes?: string[];
}

const SEMILLAS_ITEMS: SemillaItems[] = [
  { creada: '2026-02-10', estado: 'APROBADO', items: [0, 1, 2], justificacion: 'Inclusión de insumos críticos para la atención de emergencias en los establecimientos de salud.' },
  { creada: '2026-04-15', estado: 'APROBADO', items: [3, 4, 5], justificacion: 'Inclusión de equipos de diagnóstico por imágenes priorizados en el plan multianual.', noVigentes: ['4215271200011933'] },
  { creada: '2026-07-08', estado: 'RECHAZADO', items: [6], justificacion: 'Inclusión del desfibrilador portátil para las unidades móviles.', comentario: '[No procede] El desfibrilador portátil ya forma parte del plan de equipamiento vigente.' },
  { creada: '2026-08-20', estado: 'VERIFICADO', items: [7, 8], justificacion: 'Inclusión de analgésicos y mascarillas de oxígeno para hospitalización.' },
  { creada: '2026-09-03', estado: 'OBSERVADO', items: [9, 10], justificacion: 'Inclusión de equipos portátiles para la atención en zonas rurales.', comentario: 'Sustente la criticidad del equipo de rayos X portátil con el informe técnico del área usuaria.' },
  { creada: '2026-09-25', estado: 'ELABORADO', items: [11, 12, 13], justificacion: 'Inclusión de material médico descartable de alta rotación.' },
  { creada: '2026-09-28', estado: 'VALIDADO', items: [14, 15], justificacion: 'Inclusión de insumos priorizados para la campaña de vacunación.' },
];

/** Anexos 02 sembrados: los del Figma «A.2-OA-EV-009» (0001 aprobado en 2025, 0002 elaborado en 2026). */
const SEMILLAS_ANEXO_2: { creada: string; estado: EstadoSemilla }[] = [
  { creada: '2025-01-20', estado: 'APROBADO' },
  { creada: '2026-08-19', estado: 'ELABORADO' },
];

function enFecha(dia: string, horas: number, dias = 0): string {
  const fecha = new Date(`${dia}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(horas, 15 + dias * 7, 0, 0);
  return fecha.toISOString();
}

/** Historial de una solicitud sembrada: el creador (Ana, si no se dice otro) la elabora y la verifica, el evaluador (Marta) la valida y el aprobador (Luis) la responde. */
function historialSemilla(datos: DatosTaller, dia: string, estado: EstadoSemilla, comentario?: string, ana = USUARIOS_DEMO[0], luis = USUARIOS_DEMO[1], evaluador = USUARIOS_DEMO.find((u) => u.id === 'usr-marta')!): HistorialItem[] {
  const historial: HistorialItem[] = [
    filaHistorial(datos, null, 'NUEVO', enFecha(dia, 9), ana, ROL_CREADOR),
    filaHistorial(datos, 'NUEVO', 'ELABORADO', enFecha(dia, 9, 0), ana, ROL_CREADOR),
  ];
  if (estado !== 'ELABORADO') {
    historial.push(filaHistorial(datos, 'ELABORADO', 'VERIFICADO', enFecha(dia, 10, 1), ana, ROL_CREADOR));
  }
  if (['VALIDADO', 'APROBADO', 'OBSERVADO', 'RECHAZADO'].includes(estado)) {
    historial.push(filaHistorial(datos, 'VERIFICADO', 'VALIDADO', enFecha(dia, 10, 2), evaluador, ROL_EVALUADOR, 'Documento evaluado conforme.'));
  }
  if (['APROBADO', 'OBSERVADO', 'RECHAZADO'].includes(estado)) {
    historial.push(filaHistorial(datos, 'VALIDADO', estado, enFecha(dia, 11, 2), luis, ROL_APROBADOR, comentario ?? null));
  }
  return historial;
}

function crearDatosIniciales(): DatosTaller {
  const datos: DatosTaller = {
    version: VERSION,
    solicitudes: [],
    registrosItemsEstrategicos: [],
    areasUsuarias: [],
    itemsAreaUsuaria: [],
    fechasFaseCmnEntidad: [],
    fechasFaseCmnDplaip: [],
    distribucionInternaPresupuesto: [],
    preciosDiferenciados: [],
    serviciosBasicosExcluidos: [],
    notificaciones: [],
    correlativoItemsEstrategicos: 0,
    correlativoAnexo2Fase1: 0,
    secuencia: 0,
  };
  datos.areasUsuarias = AREAS_USUARIAS_SEMILLA.map((area) => ({ id: nuevoId(datos, 'au'), ...area }));
  datos.fechasFaseCmnEntidad = [
    {
      id: nuevoId(datos, 'ffce'),
      anio: 2025,
      estado: 'Activo',
      fase1: {
        etapa1: { inicio: '2025-01-01', fin: '2025-02-28' },
        etapa2: { inicio: '2025-03-01', fin: '2025-03-20' },
        etapa3: { inicio: '2025-03-21', fin: '2025-04-09' },
      },
      fase2: {
        etapa1: { inicio: '2025-07-01', fin: '2025-08-15' },
        etapa2: { inicio: '2025-08-16', fin: '2025-09-10' },
        etapa3: { inicio: '2025-09-11', fin: '2025-09-30' },
      },
      fase3: {
        etapa1: { inicio: '2025-12-22', fin: '2026-01-05' },
        etapa2: { inicio: '2026-01-06', fin: '2026-01-10' },
        etapa3: { inicio: '2026-01-11', fin: '2026-01-15' },
      },
    },
  ];
  datos.fechasFaseCmnDplaip = [
    {
      id: nuevoId(datos, 'ffcd'),
      anio: 2025,
      estado: 'Activo',
      fase1: { inicio: '2025-01-01', fin: '2025-04-09' },
      fase2: { inicio: '2025-07-01', fin: '2025-09-30' },
      fase3: { inicio: '2025-12-22', fin: '2026-01-15' },
    },
  ];
  datos.distribucionInternaPresupuesto = [
    {
      id: nuevoId(datos, 'dip'),
      anio: 2025,
      estado: 'Validado',
      presupuestoFase: 'fase1',
      areaUsuariaTitular: { codigo: 'A.02.01.01.05-01', denominacion: 'Oficina General de Tecnologías de la Información' },
      entidadUe: 'MEF / Administración General',
      periodo: 2026,
      genericas: [
        { codigo: '3', presupuestoRecibido: 1200000 },
        { codigo: '4', presupuestoRecibido: 300000 },
        { codigo: '7', presupuestoRecibido: 900000 },
      ],
      filas: [
        {
          id: nuevoId(datos, 'dipf'),
          codigoOu: 'A.02.01.01.05-01',
          denominacion: 'Oficina General de Tecnologías de la Información',
          rol: 'AU titular',
          esTitular: true,
          montos: { '3': 550000, '4': 100000, '7': 400000 },
        },
        {
          id: nuevoId(datos, 'dipf'),
          codigoOu: 'A.03.01.01.05.01-01',
          denominacion: 'Oficina de Infraestructura Tecnológica',
          rol: 'AU',
          esTitular: false,
          montos: { '3': 0, '4': 0, '7': 0 },
        },
        {
          id: nuevoId(datos, 'dipf'),
          codigoOu: 'A.03.01.01.05.02-01',
          denominacion: 'Oficina de Sistemas de Información',
          rol: 'AU',
          esTitular: false,
          montos: { '3': 0, '4': 0, '7': 0 },
        },
        {
          id: nuevoId(datos, 'dipf'),
          codigoOu: 'A.04.01.01.05.02.01-01',
          denominacion: 'Unidad de Desarrollo de Sistemas',
          rol: 'ATE',
          esTitular: false,
          montos: { '3': 0, '4': 0, '7': 0 },
        },
      ],
    },
  ];
  // Pantalla principal (Figma «Configuracion_precios 01»): los CUBSO de la entidad, todavía sin precios generados.
  datos.preciosDiferenciados = (
    [
      ['5311000100021451', 'Servicio de Comedor Gerencia'],
      ['5311000100021455', 'Servicio de Comedor Empleados'],
      ['7412000300019960', 'Servicios de Comedor Invitados'],
      ['7412000300019961', 'Servicio de Limpieza de Oficinas'],
      ['7412000300019965', 'Servicio de Limpieza de Áreas Comunes'],
      ['7412000300019978', 'Servicio de Mantenimiento Preventivo'],
      ['7412000300019988', 'Servicio de Mantenimiento de Equipos'],
      ['5311000100021482', 'Servicio de vigilancia diurna sin armas'],
      ['5311000100021483', 'Servicio de seguridad para transporte'],
      ['7412000300019920', 'Servicios de monitoreo'],
    ] as const
  ).map(([codigoCubso, descripcion]) => ({ id: nuevoId(datos, 'pd'), codigoCubso, descripcion, numPreciosGenerados: 0, precios: [] }));
  const ana = USUARIOS_DEMO[0];

  // Solicitudes de Necesidades Estratégicas: las aprobadas dejan sus ítems en los registros.
  for (const semilla of SEMILLAS_ITEMS) {
    const id = nuevoId(datos, 'sol');
    datos.correlativoItemsEstrategicos += 1;
    const creada = enFecha(semilla.creada, 9);
    const numero = numeroDocumentoItemsEstrategicos(datos.correlativoItemsEstrategicos, new Date(creada));
    const historial = historialSemilla(datos, semilla.creada, semilla.estado, semilla.comentario);
    const ultima = historial[historial.length - 1].createdAt;
    const items: ItemEstrategico[] = semilla.items.map((i) => ({
      codigo: CATALOGO_ITEMS_ESTRATEGICOS[i].codigo,
      descripcion: CATALOGO_ITEMS_ESTRATEGICOS[i].descripcion,
    }));

    datos.solicitudes.push({
      id,
      numero,
      catDocumento: TIPO_DOCUMENTO_SIE,
      tipoAccion: TIPO_ACCION_SIE,
      estado: semilla.estado,
      asuntoMotivo: `[OFICINA GENERAL DE ADMINISTRACIÓN] ${semilla.justificacion}`,
      entidadCreadora: ENTIDAD_CREADORA,
      unidadCreadora: UNIDAD_CREADORA,
      creador: { id: ana.id, nombres: ana.nombres, apellidoPaterno: ana.apellidoPaterno, apellidoMaterno: ana.apellidoMaterno },
      fechaRegistro: creada,
      createdAt: creada,
      updatedAt: ultima,
      itemsCuenta: [],
      detalleItemsEstrategicos: { documentoId: id, items },
      sustentos: [
        {
          id: nuevoId(datos, 'sus'),
          tipoSustento: 'sustento',
          archivo: { nombreOriginal: `Informe técnico de necesidades estratégicas ${String(datos.correlativoItemsEstrategicos).padStart(2, '0')}.pdf`, storagePath: 'taller' },
        },
      ],
      historialEstados: historial,
    });

    if (semilla.estado === 'APROBADO') {
      for (const item of items) {
        datos.registrosItemsEstrategicos.push({
          id: nuevoId(datos, 'rie'),
          ...item,
          vigente: !semilla.noVigentes?.includes(item.codigo),
          entidadSiglas: 'MEF',
          documentoId: id,
          numeroDocumento: numero,
          fechaRegistro: ultima,
        });
      }
    }
  }

  // Anexos 02 de CMN Programación (Figma «A.2-OA-EV-009»): los registra la Especialista OA del Ministerio de Educación.
  const especialista = USUARIOS_DEMO.find((u) => u.id === 'usr-especialista-oa')!;
  const aprobadorOa = USUARIOS_DEMO.find((u) => u.id === 'usr-aprobador-oa')!;
  const evaluadorOa = USUARIOS_DEMO.find((u) => u.id === 'usr-evaluador-oa')!;
  const perfilOa = especialista.perfiles[0];
  for (const semilla of SEMILLAS_ANEXO_2) {
    const id = nuevoId(datos, 'sol');
    datos.correlativoAnexo2Fase1 += 1;
    const creada = enFecha(semilla.creada, 9);
    const historial = historialSemilla(datos, semilla.creada, semilla.estado, undefined, especialista, aprobadorOa, evaluadorOa);
    datos.solicitudes.push({
      id,
      numero: numeroDocumentoAnexo2Fase1(datos.correlativoAnexo2Fase1),
      catDocumento: TIPO_DOCUMENTO_SA2F1,
      tipoAccion: TIPO_ACCION_SA2F1,
      estado: semilla.estado,
      asuntoMotivo: `[${(perfilOa.unidad ?? '').toUpperCase()}] `,
      entidadCreadora: { id: perfilOa.entidadId ?? '', codMef: perfilOa.entidadCodigo ?? '', siglas: perfilOa.entidadSiglas ?? '', nombre: perfilOa.entidad ?? '' },
      unidadCreadora: { id: perfilOa.unidadId ?? '', sigla: perfilOa.unidadSigla ?? '', nombre: perfilOa.unidad ?? '' },
      creador: { id: especialista.id, nombres: especialista.nombres, apellidoPaterno: especialista.apellidoPaterno, apellidoMaterno: especialista.apellidoMaterno },
      fechaRegistro: creada,
      createdAt: creada,
      updatedAt: historial[historial.length - 1].createdAt,
      ...(semilla.estado === 'APROBADO' ? { fechaAprobacion: historial[historial.length - 1].createdAt } : {}),
      itemsCuenta: [],
      detalleAnexo2Fase1: { documentoId: id, areas: [...CONTEXTO_ANEXO_2_FASE_1.areas] },
      sustentos: [],
      historialEstados: historial,
    });
  }

  // Notificaciones: el evaluador tiene una solicitud por validar, el aprobador una por aprobar; el creador, una observada y otras ya leídas.
  const aviso = (s: SolicitudResponse, tipo: string, titulo: string, mensaje: string, leida: boolean, destino: Pick<NotificacionMock, 'paraUsuarioId' | 'paraRolCodigo' | 'paraEntidadId'>): NotificacionMock => ({
    id: nuevoId(datos, 'not'),
    tipo,
    titulo,
    mensaje,
    leida,
    leidaEn: leida ? s.updatedAt ?? null : null,
    createdAt: s.updatedAt ?? s.createdAt,
    documento: { id: s.id, numero: s.numero, catDocumento: tipoDocumentoDe(s) },
    ...destino,
  });
  const porEstado = (estado: string) => datos.solicitudes.filter((s) => s.estado === estado);
  for (const s of porEstado('VERIFICADO')) {
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_VERIFICADO', 'Solicitud por validar', `La solicitud ${s.numero} fue verificada y espera su evaluación.`, false, { paraRolCodigo: 'EVALUADOR', paraEntidadId: s.entidadCreadora?.id }));
  }
  for (const s of porEstado('VALIDADO')) {
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_VALIDADO', 'Solicitud por aprobar', `La solicitud ${s.numero} fue validada y espera su aprobación.`, false, { paraRolCodigo: 'APROBADOR', paraEntidadId: s.entidadCreadora?.id }));
  }
  for (const s of porEstado('OBSERVADO')) {
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_OBSERVADO', 'Solicitud observada', `La solicitud ${s.numero} fue observada: revise el comentario y subsane.`, false, { paraUsuarioId: ana.id }));
  }
  for (const s of porEstado('RECHAZADO')) {
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_RECHAZADO', 'Solicitud rechazada', `La solicitud ${s.numero} fue rechazada.`, true, { paraUsuarioId: ana.id }));
  }
  const ultimaAprobada = porEstado('APROBADO').filter((s) => s.creador?.id === ana.id).at(-1);
  if (ultimaAprobada) {
    datos.notificaciones.push(aviso(ultimaAprobada, 'DOCUMENTO_APROBADO', 'Solicitud aprobada', `La solicitud ${ultimaAprobada.numero} fue aprobada.`, true, { paraUsuarioId: ana.id }));
  }

  return datos;
}


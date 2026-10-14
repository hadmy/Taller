import type { NotificacionResponse } from '../core/api/notificaciones-api.service';
import type { HistorialItem, SolicitudResponse } from '../core/api/solicitudes-api.service';
import type { EstadoDocumento } from '../core/models/documento.model';
import type { ItemEstrategico, ItemEstrategicoCatalogo, ItemEstrategicoRegistro } from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import {
  CODIGO_DOCUMENTO as CODIGO_DOCUMENTO_SIE,
  NOMBRE_DOCUMENTO as NOMBRE_DOCUMENTO_SIE,
  TIPO_ACCION as TIPO_ACCION_SIE,
} from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import type { AreaUsuaria, AreaUsuariaItem } from '../modules/configuracion/areas-usuarias/models/area-usuaria.model';
import type { DistribucionInternaPresupuesto } from '../modules/configuracion/distribucion-interna-presupuesto/models/distribucion-interna-presupuesto.model';
import type { FechaFaseCmnDplaip } from '../modules/configuracion/fechas-fase-cmn-dplaip/models/fecha-fase-cmn.model';
import type { FechaFaseCmnEntidad } from '../modules/configuracion/fechas-fase-cmn-entidad/models/fecha-fase-cmn.model';
import type { PrecioDiferenciado } from '../modules/configuracion/precios-diferenciados/models/precio-diferenciado.model';
import type { ServicioBasico } from '../modules/configuracion/servicios-basicos-excluidos/models/servicio-basico.model';
import {
  CODIGO_DOCUMENTO,
  CuentaBancariaDatos,
  CuentaBancariaRegistro,
  NOMBRE_DOCUMENTO,
} from '../modules/tesoreria/cuentas-bancarias/models/cuenta-bancaria.model';
import { USUARIOS_DEMO, UsuarioDemo } from './usuarios-demo';

/**
 * «Base de datos» del backend simulado: vive en el `localStorage` del navegador, así lo que hace un usuario lo ve
 * otro al iniciar sesión (en el mismo navegador). `reiniciarDatosDemo()` vuelve a los datos iniciales.
 */

const CLAVE = 'taller-siaf-rp:datos';
const VERSION = 26;

export interface NotificacionMock extends NotificacionResponse {
  /** Destinatario: un usuario puntual o, si no hay, todos los perfiles con este rol. */
  paraUsuarioId?: string;
  paraRolCodigo?: 'CREADOR' | 'APROBADOR';
}

export interface DatosTaller {
  version: number;
  solicitudes: SolicitudResponse[];
  registros: CuentaBancariaRegistro[];
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
  correlativoDocumento: number;
  /** Correlativo propio de las Solicitudes de Ítems Estratégicos (su número tiene otra serie). */
  correlativoItemsEstrategicos: number;
  correlativoRegistro: number;
  secuencia: number;
}

export const TIPO_DOCUMENTO = { id: 'td-srcb', codigo: CODIGO_DOCUMENTO, nombre: NOMBRE_DOCUMENTO };
export const TIPO_DOCUMENTO_SIE = { id: 'td-sie', codigo: CODIGO_DOCUMENTO_SIE, nombre: NOMBRE_DOCUMENTO_SIE };
/** Tipos de documento del taller: la solicitud se crea con uno de estos (por `tipoDocumentoId`). */
export const TIPOS_DOCUMENTO = [TIPO_DOCUMENTO, TIPO_DOCUMENTO_SIE];

/** Tipo de documento de una solicitud (el de las notificaciones); sin uno conocido, el del proceso de ejemplo. */
export function tipoDocumentoDe(s: SolicitudResponse): typeof TIPO_DOCUMENTO {
  return TIPOS_DOCUMENTO.find((t) => t.codigo === s.catDocumento?.codigo) ?? TIPO_DOCUMENTO;
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

export function numeroDocumento(correlativo: number, fecha: Date): string {
  return `PCB-SRCB-${String(correlativo).padStart(5, '0')}-${fecha.getFullYear()}-MEF-OGA`;
}

/** Número de una Solicitud de Ítems Estratégicos: serie propia del CMN. */
export function numeroDocumentoItemsEstrategicos(correlativo: number, fecha: Date): string {
  return `CMN-SIE-${String(correlativo).padStart(5, '0')}-${fecha.getFullYear()}-MEF-OGA`;
}

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
  };
}

// ─── Datos iniciales ───────────────────────────────────────────────

const ROL_CREADOR = { codigo: 'CREADOR', nombre: 'Creador' };
const ROL_APROBADOR = { codigo: 'APROBADOR', nombre: 'Aprobador' };

interface Semilla {
  datos: CuentaBancariaDatos;
  /** Día en que se creó la solicitud (yyyy-mm-dd). */
  creada: string;
  estado: 'ELABORADO' | 'VERIFICADO' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';
  justificacion: string;
  comentario?: string;
  registroInactivo?: boolean;
}

function cuenta(banco: string, tipo: 'CORRIENTE' | 'AHORROS', moneda: 'PEN' | 'USD', n: number, denominacion: string, apertura: string, recaudadora: boolean): CuentaBancariaDatos {
  return {
    bancoCodigo: banco,
    tipoCuenta: tipo,
    moneda,
    numeroCuenta: `${banco}100${String(58213400000000 + n * 7919).slice(-14)}`,
    denominacion,
    fechaApertura: apertura,
    esRecaudadora: recaudadora,
  };
}

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

const SEMILLAS: Semilla[] = [
  { creada: '2026-01-16', estado: 'APROBADO', justificacion: 'Cuenta para la recaudación de tasas por procedimientos administrativos.', datos: cuenta('018', 'CORRIENTE', 'PEN', 1, 'Recaudación de tasas administrativas', '2026-01-15', true) },
  { creada: '2026-02-04', estado: 'APROBADO', justificacion: 'Cuenta para pagos a proveedores del exterior en dólares.', datos: cuenta('002', 'CORRIENTE', 'USD', 2, 'Pagos a proveedores del exterior', '2026-02-03', false) },
  { creada: '2026-02-23', estado: 'APROBADO', justificacion: 'Cuenta de ahorros para el fondo de caja chica de la oficina.', datos: cuenta('003', 'AHORROS', 'PEN', 3, 'Fondo de caja chica', '2026-02-20', false) },
  { creada: '2026-03-12', estado: 'APROBADO', justificacion: 'Cuenta para la recaudación de multas administrativas.', datos: cuenta('011', 'CORRIENTE', 'PEN', 4, 'Recaudación de multas', '2026-03-11', true) },
  { creada: '2026-04-09', estado: 'APROBADO', justificacion: 'Cuenta para las transferencias a unidades ejecutoras.', datos: cuenta('018', 'CORRIENTE', 'PEN', 5, 'Transferencias a unidades ejecutoras', '2026-04-08', false) },
  { creada: '2026-05-20', estado: 'APROBADO', justificacion: 'Cuenta para garantías recibidas en moneda extranjera.', datos: cuenta('009', 'AHORROS', 'USD', 6, 'Garantías en moneda extranjera', '2026-05-19', false), registroInactivo: true },
  { creada: '2026-06-03', estado: 'APROBADO', justificacion: 'Cuenta para la recaudación de servicios no exclusivos.', datos: cuenta('018', 'CORRIENTE', 'PEN', 7, 'Recaudación de servicios no exclusivos', '2026-06-02', true) },
  { creada: '2026-07-15', estado: 'APROBADO', justificacion: 'Cuenta de ahorros para encargos a las oficinas desconcentradas.', datos: cuenta('002', 'AHORROS', 'PEN', 8, 'Encargos a oficinas desconcentradas', '2026-07-14', false) },
  { creada: '2026-08-06', estado: 'RECHAZADO', justificacion: 'Cuenta para la recaudación de derechos de trámite.', datos: cuenta('009', 'CORRIENTE', 'PEN', 9, 'Recaudación de derechos de trámite', '2026-08-05', true), comentario: '[Información incorrecta] La cuenta ya está registrada con el código CB-0004.' },
  { creada: '2026-08-24', estado: 'VERIFICADO', justificacion: 'Cuenta en dólares para los fondos de cooperación internacional.', datos: cuenta('003', 'CORRIENTE', 'USD', 10, 'Fondos de cooperación internacional', '2026-08-21', false) },
  { creada: '2026-09-02', estado: 'OBSERVADO', justificacion: 'Cuenta para la recaudación por alquiler de ambientes.', datos: cuenta('011', 'CORRIENTE', 'PEN', 11, 'Recaudación de alquileres', '2026-09-01', true), comentario: 'Adjunte la constancia de apertura emitida por el banco.' },
  { creada: '2026-09-09', estado: 'ELABORADO', justificacion: 'Cuenta de ahorros para el fondo de viáticos.', datos: cuenta('018', 'AHORROS', 'PEN', 12, 'Fondo de viáticos', '2026-09-08', false) },
];

interface SemillaItems {
  /** Posiciones en `CATALOGO_ITEMS_ESTRATEGICOS`. */
  items: number[];
  creada: string;
  estado: Semilla['estado'];
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
];

function enFecha(dia: string, horas: number, dias = 0): string {
  const fecha = new Date(`${dia}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(horas, 15 + dias * 7, 0, 0);
  return fecha.toISOString();
}

/** Historial de una solicitud sembrada: Ana la crea, la elabora y la verifica; Luis la responde. */
function historialSemilla(datos: DatosTaller, dia: string, estado: Semilla['estado'], comentario?: string): HistorialItem[] {
  const [ana, luis] = USUARIOS_DEMO;
  const historial: HistorialItem[] = [
    filaHistorial(datos, null, 'NUEVO', enFecha(dia, 9), ana, ROL_CREADOR),
    filaHistorial(datos, 'NUEVO', 'ELABORADO', enFecha(dia, 9, 0), ana, ROL_CREADOR),
  ];
  if (estado !== 'ELABORADO') {
    historial.push(filaHistorial(datos, 'ELABORADO', 'VERIFICADO', enFecha(dia, 10, 1), ana, ROL_CREADOR));
  }
  if (['APROBADO', 'OBSERVADO', 'RECHAZADO'].includes(estado)) {
    historial.push(filaHistorial(datos, 'VERIFICADO', estado, enFecha(dia, 11, 2), luis, ROL_APROBADOR, comentario ?? null));
  }
  return historial;
}

function crearDatosIniciales(): DatosTaller {
  const datos: DatosTaller = {
    version: VERSION,
    solicitudes: [],
    registros: [],
    registrosItemsEstrategicos: [],
    areasUsuarias: [],
    itemsAreaUsuaria: [],
    fechasFaseCmnEntidad: [],
    fechasFaseCmnDplaip: [],
    distribucionInternaPresupuesto: [],
    preciosDiferenciados: [],
    serviciosBasicosExcluidos: [],
    notificaciones: [],
    correlativoDocumento: 0,
    correlativoItemsEstrategicos: 0,
    correlativoRegistro: 0,
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

  for (const semilla of SEMILLAS) {
    const id = nuevoId(datos, 'sol');
    datos.correlativoDocumento += 1;
    const creada = enFecha(semilla.creada, 9);
    const numero = numeroDocumento(datos.correlativoDocumento, new Date(creada));
    const historial = historialSemilla(datos, semilla.creada, semilla.estado, semilla.comentario);
    const ultima = historial[historial.length - 1].createdAt;

    const solicitud: SolicitudResponse = {
      id,
      numero,
      catDocumento: TIPO_DOCUMENTO,
      tipoAccion: 'creacion',
      estado: semilla.estado,
      asuntoMotivo: `[OFICINA GENERAL DE ADMINISTRACIÓN] ${semilla.justificacion}`,
      entidadCreadora: ENTIDAD_CREADORA,
      unidadCreadora: UNIDAD_CREADORA,
      creador: { id: ana.id, nombres: ana.nombres, apellidoPaterno: ana.apellidoPaterno, apellidoMaterno: ana.apellidoMaterno },
      fechaRegistro: creada,
      createdAt: creada,
      updatedAt: ultima,
      itemsCuenta: [],
      detalleCuentaBancaria: { documentoId: id, ...semilla.datos },
      sustentos: [
        {
          id: nuevoId(datos, 'sus'),
          tipoSustento: 'sustento',
          archivo: { nombreOriginal: `Constancia de apertura ${String(datos.correlativoDocumento).padStart(2, '0')}.pdf`, storagePath: 'taller' },
        },
      ],
      historialEstados: historial,
    };
    datos.solicitudes.push(solicitud);

    if (semilla.estado === 'APROBADO') {
      datos.correlativoRegistro += 1;
      datos.registros.push({
        id: nuevoId(datos, 'cb'),
        codigo: `CB-${String(datos.correlativoRegistro).padStart(4, '0')}`,
        estado: semilla.registroInactivo ? 'Inactivo' : 'Activo',
        entidadSiglas: 'MEF',
        documentoId: id,
        numeroDocumento: numero,
        fechaRegistro: ultima,
        ...semilla.datos,
      });
    }
  }

  // Solicitudes de Ítems Estratégicos: las aprobadas dejan sus ítems en los registros.
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
          archivo: { nombreOriginal: `Informe técnico de ítems estratégicos ${String(datos.correlativoItemsEstrategicos).padStart(2, '0')}.pdf`, storagePath: 'taller' },
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

  // Notificaciones: el aprobador tiene una solicitud por aprobar; el creador, una observada y otras ya leídas.
  const aviso = (s: SolicitudResponse, tipo: string, titulo: string, mensaje: string, leida: boolean, destino: Pick<NotificacionMock, 'paraUsuarioId' | 'paraRolCodigo'>): NotificacionMock => ({
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
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_VERIFICADO', 'Solicitud por aprobar', `La solicitud ${s.numero} fue verificada y espera su aprobación.`, false, { paraRolCodigo: 'APROBADOR' }));
  }
  for (const s of porEstado('OBSERVADO')) {
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_OBSERVADO', 'Solicitud observada', `La solicitud ${s.numero} fue observada: revise el comentario y subsane.`, false, { paraUsuarioId: ana.id }));
  }
  for (const s of porEstado('RECHAZADO')) {
    datos.notificaciones.push(aviso(s, 'DOCUMENTO_RECHAZADO', 'Solicitud rechazada', `La solicitud ${s.numero} fue rechazada.`, true, { paraUsuarioId: ana.id }));
  }
  const ultimaAprobada = porEstado('APROBADO').at(-1);
  if (ultimaAprobada) {
    datos.notificaciones.push(aviso(ultimaAprobada, 'DOCUMENTO_APROBADO', 'Solicitud aprobada', `La solicitud ${ultimaAprobada.numero} fue aprobada.`, true, { paraUsuarioId: ana.id }));
  }

  return datos;
}


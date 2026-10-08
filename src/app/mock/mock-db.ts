import type { NotificacionResponse } from '../core/api/notificaciones-api.service';
import type { HistorialItem, SolicitudResponse } from '../core/api/solicitudes-api.service';
import type { EstadoDocumento } from '../core/models/documento.model';
import type { AreaUsuaria, AreaUsuariaItem } from '../modules/configuracion/areas-usuarias/models/area-usuaria.model';
import type { DistribucionInternaPresupuesto } from '../modules/configuracion/distribucion-interna-presupuesto/models/distribucion-interna-presupuesto.model';
import type { FechaFaseCmnDplaip } from '../modules/configuracion/fechas-fase-cmn-dplaip/models/fecha-fase-cmn.model';
import type { FechaFaseCmnEntidad } from '../modules/configuracion/fechas-fase-cmn-entidad/models/fecha-fase-cmn.model';
import type { PrecioDiferenciado } from '../modules/configuracion/precios-diferenciados/models/precio-diferenciado.model';
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
const VERSION = 16;

export interface NotificacionMock extends NotificacionResponse {
  /** Destinatario: un usuario puntual o, si no hay, todos los perfiles con este rol. */
  paraUsuarioId?: string;
  paraRolCodigo?: 'CREADOR' | 'APROBADOR';
}

export interface DatosTaller {
  version: number;
  solicitudes: SolicitudResponse[];
  registros: CuentaBancariaRegistro[];
  areasUsuarias: AreaUsuaria[];
  itemsAreaUsuaria: AreaUsuariaItem[];
  fechasFaseCmnEntidad: FechaFaseCmnEntidad[];
  fechasFaseCmnDplaip: FechaFaseCmnDplaip[];
  distribucionInternaPresupuesto: DistribucionInternaPresupuesto[];
  preciosDiferenciados: PrecioDiferenciado[];
  notificaciones: NotificacionMock[];
  correlativoDocumento: number;
  correlativoRegistro: number;
  secuencia: number;
}

export const TIPO_DOCUMENTO = { id: 'td-srcb', codigo: CODIGO_DOCUMENTO, nombre: NOMBRE_DOCUMENTO };
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

function enFecha(dia: string, horas: number, dias = 0): string {
  const fecha = new Date(`${dia}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(horas, 15 + dias * 7, 0, 0);
  return fecha.toISOString();
}

function crearDatosIniciales(): DatosTaller {
  const datos: DatosTaller = {
    version: VERSION,
    solicitudes: [],
    registros: [],
    areasUsuarias: [],
    itemsAreaUsuaria: [],
    fechasFaseCmnEntidad: [],
    fechasFaseCmnDplaip: [],
    distribucionInternaPresupuesto: [],
    preciosDiferenciados: [],
    notificaciones: [],
    correlativoDocumento: 0,
    correlativoRegistro: 0,
    secuencia: 0,
  };
  datos.areasUsuarias = AREAS_USUARIAS_SEMILLA.map((area) => ({ id: nuevoId(datos, 'au'), ...area }));
  const etapasFase = (desde: string) => ({
    etapa1: { inicio: `${desde}-01-01`, fin: `${desde}-04-09` },
    etapa2: { inicio: `${desde}-04-10`, fin: `${desde}-06-30` },
    etapa3: { inicio: `${desde}-07-01`, fin: `${desde}-09-30` },
  });
  datos.fechasFaseCmnEntidad = [
    {
      id: nuevoId(datos, 'ffce'),
      anio: 2026,
      estado: 'Activo',
      fase1: { inicio: '2026-01-05', fin: '2026-03-31' },
      fase2: { inicio: '2026-04-01', fin: '2026-06-30' },
      fase3: { inicio: '2026-07-01', fin: '2026-09-30' },
    },
  ];
  datos.fechasFaseCmnDplaip = [
    {
      id: nuevoId(datos, 'ffcd'),
      anio: 2026,
      estado: 'Activo',
      fase1: etapasFase('2026'),
      fase2: etapasFase('2026'),
      fase3: etapasFase('2026'),
    },
  ];
  datos.distribucionInternaPresupuesto = [
    {
      id: nuevoId(datos, 'dip'),
      anio: 2026,
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
  datos.preciosDiferenciados = [
    {
      id: nuevoId(datos, 'pd'),
      codigoCubso: '5311000100021482',
      descripcion: 'Servicio de vigilancia diurna sin armas',
      numPreciosGenerados: 2,
      precios: [
        { id: nuevoId(datos, 'pa'), area: 'Oficina de Seguridad y Vigilancia', descripcion: 'Servicio de vigilancia diurna sin armas', monto: 7000, vigente: true },
        { id: nuevoId(datos, 'pa'), area: 'Oficina de Seguridad y Vigilancia', descripcion: 'Servicio de vigilancia diurna sin armas', monto: 9000, vigente: true },
      ],
    },
    {
      id: nuevoId(datos, 'pd'),
      codigoCubso: '5311000100021483',
      descripcion: 'Servicio de seguridad para transporte',
      numPreciosGenerados: 3,
      precios: [
        { id: nuevoId(datos, 'pa'), area: 'Oficina de Abastecimiento', descripcion: 'Seguridad para transporte de valores', monto: 12000, vigente: true },
        { id: nuevoId(datos, 'pa'), area: 'Oficina de Tesorería', descripcion: 'Seguridad para transporte de documentos', monto: 4500, vigente: true },
        { id: nuevoId(datos, 'pa'), area: 'Unidad de Logística', descripcion: 'Seguridad para transporte de bienes', monto: 6800, vigente: true },
      ],
    },
    { id: nuevoId(datos, 'pd'), codigoCubso: '7412000300019920', descripcion: 'Servicios de monitoreo', numPreciosGenerados: 0, precios: [] },
  ];
  const ana = USUARIOS_DEMO[0];
  const luis = USUARIOS_DEMO[1];

  for (const semilla of SEMILLAS) {
    const id = nuevoId(datos, 'sol');
    datos.correlativoDocumento += 1;
    const creada = enFecha(semilla.creada, 9);
    const numero = numeroDocumento(datos.correlativoDocumento, new Date(creada));
    const historial: HistorialItem[] = [
      filaHistorial(datos, null, 'NUEVO', creada, ana, ROL_CREADOR),
      filaHistorial(datos, 'NUEVO', 'ELABORADO', enFecha(semilla.creada, 9, 0), ana, ROL_CREADOR),
    ];
    if (semilla.estado !== 'ELABORADO') {
      historial.push(filaHistorial(datos, 'ELABORADO', 'VERIFICADO', enFecha(semilla.creada, 10, 1), ana, ROL_CREADOR));
    }
    if (['APROBADO', 'OBSERVADO', 'RECHAZADO'].includes(semilla.estado)) {
      historial.push(filaHistorial(datos, 'VERIFICADO', semilla.estado, enFecha(semilla.creada, 11, 2), luis, ROL_APROBADOR, semilla.comentario ?? null));
    }
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

  // Notificaciones: el aprobador tiene una solicitud por aprobar; el creador, una observada y otras ya leídas.
  const aviso = (s: SolicitudResponse, tipo: string, titulo: string, mensaje: string, leida: boolean, destino: Pick<NotificacionMock, 'paraUsuarioId' | 'paraRolCodigo'>): NotificacionMock => ({
    id: nuevoId(datos, 'not'),
    tipo,
    titulo,
    mensaje,
    leida,
    leidaEn: leida ? s.updatedAt ?? null : null,
    createdAt: s.updatedAt ?? s.createdAt,
    documento: { id: s.id, numero: s.numero, catDocumento: TIPO_DOCUMENTO },
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

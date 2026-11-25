import type { AlertaCmn } from '../modules/configuracion/alertas/models/alerta-cmn.model';
import type { AmpliacionPlazo } from '../modules/configuracion/ampliacion-plazo/models/ampliacion-plazo.model';
import type { ParametrosCmn } from '../modules/configuracion/parametros-cmn/models/parametros-cmn.model';
import type { FavoritoReporte } from '../modules/consultas/favoritos/favorito-reporte.model';
import type { NotificacionResponse } from '../core/api/notificaciones-api.service';
import type { HistorialItem, SolicitudResponse } from '../core/api/solicitudes-api.service';
import type { EstadoDocumento } from '../core/models/documento.model';
import type { ItemEstrategico, ItemEstrategicoCatalogo, ItemEstrategicoRegistro } from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import {
  CODIGO_DOCUMENTO as CODIGO_DOCUMENTO_SIE,
  NOMBRE_DOCUMENTO as NOMBRE_DOCUMENTO_SIE,
  TIPO_ACCION as TIPO_ACCION_SIE,
} from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import { ANIOS_CMN, type AreaUsuariaAnexo1, type ContextoAnexo2, type FaseCmn, type ItemAnexo1 } from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
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
const VERSION = 44;

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
  /** Alertas, ampliaciones de plazo y parámetros generales del CMN. Opcionales: los datos guardados antes no los traen. */
  alertasCmn?: AlertaCmn[];
  ampliacionesPlazo?: (AmpliacionPlazo & { usuarioId: string })[];
  parametrosCmn?: ParametrosCmn;
  /** Favoritos de los reportes, por usuario. Opcional: los datos guardados antes no lo traen. */
  favoritosReporte?: (FavoritoReporte & { usuarioId: string; reporte: string })[];
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

/** Número de una Solicitud de Necesidades Estratégicas: correlativo propio de cuatro dígitos («0001», Figma A.1-RC-020). */
export function numeroDocumentoItemsEstrategicos(correlativo: number): string {
  return String(correlativo).padStart(4, '0');
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
  // Referencial: la pantalla calcula el resumen de las áreas de cada solicitud.
  resumen: { anexosRecibidos: 12, conformes: 0, observados: 0, necesidades: 104, anexosEvaluados: 0 },
  // El consolidado de cada año se calcula de las necesidades de las áreas (más abajo, después de `itemsAnexo1`).
  marcoPresupuestario: [
    { anio: 2027, referencia: 'APM 2025 - Año 2 (2027)', techoPresupuestal: 3_600_000, consolidadoAnexo1: 0 },
    { anio: 2028, referencia: 'APM 2025 - Año 3 (2028)', techoPresupuestal: 2_800_000, consolidadoAnexo1: 0 },
    { anio: 2029, referencia: 'APM 2025 - Año 4 (2029)', techoPresupuestal: 2_800_000, consolidadoAnexo1: 0 },
  ],
  // Plazos relativos a hoy, como en el Figma (19/08): las cuatro primeras son las del Figma (tres vigentes y una
  // vencida); las demás amplían la lista de áreas usuarias (una más con el plazo vencido).
  areas: [
    { id: 'a1-rrhh', nombre: 'Oficina de Recursos Humanos', items: 10, montoProgramado: 865_400, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(3) },
    { id: 'a1-oti', nombre: 'Oficina de Tecnología de la Información', items: 9, montoProgramado: 1_124_500, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(-1) },
    { id: 'a1-oa', nombre: 'Oficina de Abastecimiento', items: 11, montoProgramado: 742_360, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(5) },
    { id: 'a1-oc', nombre: 'Oficina de Contabilidad', items: 6, montoProgramado: 228_900, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(4) },
    { id: 'a1-oaj', nombre: 'Oficina General de Asesoría Jurídica', items: 7, montoProgramado: 176_300, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(6) },
    { id: 'a1-opp', nombre: 'Oficina de Planeamiento y Presupuesto', items: 8, montoProgramado: 312_750, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(2) },
    { id: 'a1-ocom', nombre: 'Oficina de Comunicaciones e Imagen Institucional', items: 9, montoProgramado: 398_600, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(7) },
    { id: 'a1-oci', nombre: 'Órgano de Control Institucional', items: 5, montoProgramado: 132_450, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(-2) },
    { id: 'a1-digebr', nombre: 'Dirección General de Educación Básica Regular', items: 14, montoProgramado: 1_486_200, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(5) },
    { id: 'a1-oac', nombre: 'Oficina de Atención al Ciudadano', items: 7, montoProgramado: 241_800, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(3) },
    { id: 'a1-oie', nombre: 'Oficina de Infraestructura Educativa', items: 12, montoProgramado: 1_935_000, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(4) },
    { id: 'a1-oagd', nombre: 'Oficina de Archivo y Gestión Documental', items: 6, montoProgramado: 104_700, estadoEvaluacion: 'Pendiente', plazoModificacion: diaRelativo(6) },
  ],
};

/**
 * Ítems de catálogo con que se arman los Anexos 01 (los tres primeros son los del Figma «Anexo N° 01»): tipo,
 * unidad de medida, precio unitario (solo bienes) y clasificador de gastos, como en el formato del Anexo N.º 02.
 */
const ITEMS_CATALOGO_ANEXO_1: {
  item: string;
  descripcion: string;
  tipo: ItemAnexo1['tipo'];
  unidadMedida: string;
  precioUnitario: number | null;
  clasificador: string;
}[] = [
  { item: '1520283078101801', descripcion: 'Papel bond A4 75 gr', tipo: 'Bien', unidadMedida: 'EMPAQUE X 500', precioUnitario: 14.5, clasificador: '3 - Bienes' },
  { item: '1520283543211502', descripcion: 'Monitor LED 24 pulgadas', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 650, clasificador: '7 - Adquisición de Activos No Financieros' },
  { item: '1520284584131600', descripcion: 'Servicio de fotocopiado externo', tipo: 'Servicio', unidadMedida: 'SERVICIO', precioUnitario: null, clasificador: '4 - Servicios' },
  { item: '1520284618150101', descripcion: 'Guantes de seguridad industrial', tipo: 'Bien', unidadMedida: 'PAR', precioUnitario: 18.5, clasificador: '3 - Bienes' },
  { item: '1520288111220102', descripcion: 'Servicio de soporte técnico de computadoras', tipo: 'Servicio', unidadMedida: 'SERVICIO', precioUnitario: null, clasificador: '4 - Servicios' },
  { item: '1520287315210803', descripcion: 'Servicio de mantenimiento de equipos', tipo: 'Servicio', unidadMedida: 'SERVICIO', precioUnitario: null, clasificador: '4 - Servicios' },
  { item: '1520284412170504', descripcion: 'Tóner para impresora láser', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 290, clasificador: '3 - Bienes' },
  { item: '1520285612100105', descripcion: 'Silla ergonómica de oficina', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 480, clasificador: '7 - Adquisición de Activos No Financieros' },
  { item: '1520285612100212', descripcion: 'Escritorio de melamina', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 520, clasificador: '7 - Adquisición de Activos No Financieros' },
  { item: '1520288613100307', descripcion: 'Servicio de capacitación especializada', tipo: 'Servicio', unidadMedida: 'SERVICIO', precioUnitario: null, clasificador: '4 - Servicios' },
  { item: '1520283543211609', descripcion: 'Laptop core i7 16 GB', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 4_200, clasificador: '7 - Adquisición de Activos No Financieros' },
  { item: '1520284412170711', descripcion: 'Archivador de palanca lomo ancho', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 9.5, clasificador: '3 - Bienes' },
  { item: '1520288214100814', descripcion: 'Servicio de impresión de materiales educativos', tipo: 'Servicio', unidadMedida: 'SERVICIO', precioUnitario: null, clasificador: '4 - Servicios' },
  { item: '1520283543211916', descripcion: 'Proyector multimedia', tipo: 'Bien', unidadMedida: 'UNIDAD', precioUnitario: 2_350, clasificador: '7 - Adquisición de Activos No Financieros' },
  { item: '1520284412171018', descripcion: 'Kit de útiles de escritorio', tipo: 'Bien', unidadMedida: 'KIT', precioUnitario: 35, clasificador: '3 - Bienes' },
  { item: '1520287315211120', descripcion: 'Servicio de mantenimiento de infraestructura', tipo: 'Servicio', unidadMedida: 'SERVICIO', precioUnitario: null, clasificador: '4 - Servicios' },
];

/**
 * Actividad presupuestaria y meta de cada área usuaria (información presupuestaria del Anexo 01), y `desde`: en qué ítem
 * del catálogo empiezan sus necesidades (por defecto el primero), para que las áreas no repitan los mismos ítems.
 * Con tres ítems o más, cada área tiene al menos un servicio, que absorbe el redondeo del reparto.
 */
const PRESUPUESTO_AREA_ANEXO_1: Record<string, { actividad: string; meta: string; desde?: number }> = {
  'a1-rrhh': { actividad: 'CP-RRHH-003 - Gestión de recursos humanos', meta: '0030' },
  'a1-oti': { actividad: 'CP-TEC-001 - Gestión de tecnologías de la información', meta: '0015' },
  'a1-oa': { actividad: 'CP-OA-002 - Gestión administrativa y de abastecimiento', meta: '0020' },
  'a1-oc': { actividad: 'CP-ADM-001 - Gestión contable', meta: '0012' },
  'a1-oaj': { actividad: 'CP-OAJ-001 - Asesoría jurídica institucional', meta: '0005', desde: 8 },
  'a1-opp': { actividad: 'CP-OPP-002 - Planeamiento y presupuesto', meta: '0008', desde: 11 },
  'a1-ocom': { actividad: 'CP-COM-001 - Comunicación e imagen institucional', meta: '0010', desde: 12 },
  'a1-oci': { actividad: 'CP-OCI-001 - Control gubernamental', meta: '0003', desde: 9 },
  'a1-digebr': { actividad: 'CP-EBR-004 - Gestión de la educación básica regular', meta: '0045', desde: 8 },
  'a1-oac': { actividad: 'CP-OAC-001 - Atención al ciudadano', meta: '0018', desde: 14 },
  'a1-oie': { actividad: 'CP-OIE-003 - Mantenimiento de infraestructura educativa', meta: '0052', desde: 13 },
  'a1-oagd': { actividad: 'CP-ADM-004 - Gestión documental y archivo', meta: '0014', desde: 11 },
};

/** Reparto del monto de un ítem entre los años del CMN (40 % el Año 1 y 30 % cada uno de los otros dos). */
const REPARTO_ANIOS_CMN = [0.4, 0.3, 0.3];

const redondear = (n: number): number => Math.round(n * 100) / 100;

/**
 * Ítems del Anexo 01 de un área usuaria: tantos como `area.items`, con el monto programado repartido en partes casi
 * iguales y cada monto repartido entre los años del CMN. Todos van con fuente RO/00 y la actividad presupuestaria y meta del
 * área.
 *
 * Para que el consolidado del Anexo N.º 02 cuadre con el Anexo 01, en un bien el monto de cada año es un múltiplo de su
 * precio unitario (la cantidad sale entera y cantidad × precio da el valor exacto); lo que el redondeo les quita o les
 * suma lo absorbe el último servicio del área, así la suma de los ítems es siempre el monto del Anexo 01.
 */
export function itemsAnexo1(area: AreaUsuariaAnexo1): ItemAnexo1[] {
  // Un área modificada parte de su monto original; los ajustes de la modificación se aplican al final.
  const montoArea = area.montoBase ?? area.montoProgramado;
  const base = Math.floor((montoArea / area.items) * 100) / 100;
  const presupuesto = PRESUPUESTO_AREA_ANEXO_1[area.id] ?? { actividad: 'CP-GEN-000 - Gestión institucional', meta: '0001' };
  const items: ItemAnexo1[] = Array.from({ length: area.items }, (_, i) => {
    const catalogo = ITEMS_CATALOGO_ANEXO_1[((presupuesto.desde ?? 0) + i) % ITEMS_CATALOGO_ANEXO_1.length];
    // El último ítem se lleva el redondeo del reparto en partes iguales; lo mismo el último año.
    const montoBase = i === area.items - 1 ? redondear(montoArea - base * (area.items - 1)) : base;
    const montosPorAnio: Record<number, number> = {};
    let repartido = 0;
    ANIOS_CMN.forEach((anio, k) => {
      let valor = k === ANIOS_CMN.length - 1 ? redondear(montoBase - repartido) : redondear(montoBase * REPARTO_ANIOS_CMN[k]);
      repartido = redondear(repartido + valor);
      // Bien: unidades enteras por año.
      if (catalogo.tipo === 'Bien' && catalogo.precioUnitario) {
        valor = redondear(Math.round(valor / catalogo.precioUnitario) * catalogo.precioUnitario);
      }
      montosPorAnio[anio] = valor;
    });
    return {
      id: `${area.id}-item-${i + 1}`,
      ...catalogo,
      montoProgramado: redondear(ANIOS_CMN.reduce((suma, anio) => suma + montosPorAnio[anio], 0)),
      fuente: 'RO/00',
      actividadOperativa: presupuesto.actividad,
      meta: presupuesto.meta,
      montosPorAnio,
    };
  });

  // El último servicio absorbe la diferencia (en su último año) para que la suma sea el monto del Anexo 01.
  const diferencia = redondear(montoArea - items.reduce((suma, item) => suma + item.montoProgramado, 0));
  const servicio = [...items].reverse().find((item) => item.tipo === 'Servicio');
  if (servicio && diferencia !== 0) {
    const ultimoAnio = ANIOS_CMN[ANIOS_CMN.length - 1];
    servicio.montosPorAnio[ultimoAnio] = redondear(servicio.montosPorAnio[ultimoAnio] + diferencia);
    servicio.montoProgramado = redondear(servicio.montoProgramado + diferencia);
  }
  return items.map((item) => {
    const monto = area.ajustes?.[item.id];
    return monto === undefined ? item : { ...item, montoProgramado: monto, montosPorAnio: repartirPorAnio(item, monto) };
  });
}

/** Reparte entre los años del CMN el monto nuevo de una necesidad; en un bien, en unidades enteras. */
function repartirPorAnio(item: ItemAnexo1, monto: number): Record<number, number> {
  const unidad = item.tipo === 'Bien' && item.precioUnitario ? item.precioUnitario : 0.01;
  const total = Math.round(monto / unidad);
  let repartido = 0;
  return Object.fromEntries(
    ANIOS_CMN.map((anio, k) => {
      const unidades = k === ANIOS_CMN.length - 1 ? total - repartido : Math.round(total * REPARTO_ANIOS_CMN[k]);
      repartido += unidades;
      return [anio, redondear(unidades * unidad)];
    }),
  );
}

// «Consolidado Anexo 01» del marco presupuestario: lo programado por todas las áreas usuarias en cada año del CMN, así
// cuadra con sus necesidades al cambiar las áreas, sus ítems o sus montos.
for (const marco of CONTEXTO_ANEXO_2_FASE_1.marcoPresupuestario) {
  marco.consolidadoAnexo1 = redondear(
    CONTEXTO_ANEXO_2_FASE_1.areas.reduce(
      (suma, area) => suma + itemsAnexo1(area).reduce((sumaArea, item) => sumaArea + (item.montosPorAnio[marco.anio] ?? 0), 0),
      0,
    ),
  );
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
    unidadOrganica: usuario.perfiles[0]?.unidad ? { nombre: usuario.perfiles[0].unidad } : null,
  };
}

// ─── Datos iniciales ───────────────────────────────────────────────

const ROL_CREADOR = { codigo: 'CREADOR', nombre: 'Creador' };
const ROL_EVALUADOR = { codigo: 'EVALUADOR', nombre: 'Evaluador' };
const ROL_APROBADOR = { codigo: 'APROBADOR', nombre: 'Aprobador' };

type EstadoSemilla = 'ELABORADO' | 'VERIFICADO' | 'VALIDADO' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

/** Áreas usuarias del pliego demo: jerarquía corta por código (`01`, `01.01`, `01.01.01`…). */
/**
 * Áreas usuarias del pliego (Figma «A.1 Configuración de Áreas Usuarias»). «Mesa de partes» está inactiva y tiene
 * commodities/ítems para el ejemplo de «Transferir datos»; «Unidad de desarrollo de software» y «Oficina de imagen
 * institucional» están en el pliego pero la lista las recibe recién con «Sincronizar».
 */
const AREAS_USUARIAS_SEMILLA: Omit<AreaUsuaria, 'id'>[] = (
  [
    ['01', 'ALTA DIRECCIÓN', {}],
    ['01.01', 'RECTORADO', {}],
    ['01.01.02', 'UNIDAD DE DESARROLLO DE SOFTWARE', { pendiente: true }],
    ['01.01.02.02', 'UNIDAD DE PROTOCOLO Y EVENTOS', {}],
    ['01.01.02.03', 'UNIDAD DE COMUNICACIONES', {}],
    ['01.01.02.03.04', 'MESA DE PARTES', { activo: false }],
    ['01.01.02.03.04.01', 'OFICINA DE IMAGEN INSTITUCIONAL', { pendiente: true }],
    ['01.01.02.03.04.05', 'UNIDAD DE GRADOS Y TÍTULOS', {}],
  ] as [string, string, Partial<AreaUsuaria>][]
).map(([codigo, denominacion, extra]) => ({
  codigo,
  denominacion,
  generaCmn: true,
  esAte: false,
  esOa: false,
  esMaa: false,
  activo: true,
  ...extra,
}));

/** Commodities/ítems de «Mesa de partes» (inactiva): los que se transfieren en el ejemplo de «Transferir datos». */
const ITEMS_MESA_DE_PARTES: [string, string, string, string][] = [
  ['43211500', 'Equipos de cómputo', '43211502', 'Monitor LED 24 pulgadas'],
  ['46181500', 'Equipos de protección personal', '46181501', 'Guantes de seguridad industrial'],
  ['81112200', 'Servicios de soporte informático', '81112201', 'Servicio de soporte técnico de computadoras'],
  ['81112501', 'Servicios de mantenimiento', '73152108', 'Servicio de mantenimiento de equipos'],
  ['81112502', 'Servicios de publicación', '84131600', 'Servicio de fotocopiado externo'],
];

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

/**
 * Anexos 02 sembrados, en el orden de las fases del CMN. El Ministerio de Educación ya aprobó las Fases 1 y 2 (0001 y
 * 0002: se pueden modificar) y tiene la Fase 3 elaborada (0003: la recorren evaluador y aprobador). El MEF tiene aprobada
 * la Fase 1 (0004), para que Registros también tenga datos con sus usuarios (Ana, Luis, Carla y Marta).
 */
const SEMILLAS_ANEXO_2: { creada: string; estado: EstadoSemilla; entidad: 'MINEDU' | 'MEF'; fase: FaseCmn }[] = [
  { creada: '2026-03-16', estado: 'APROBADO', entidad: 'MINEDU', fase: 1 },
  { creada: '2026-06-15', estado: 'APROBADO', entidad: 'MINEDU', fase: 2 },
  { creada: '2026-08-19', estado: 'ELABORADO', entidad: 'MINEDU', fase: 3 },
  { creada: '2025-02-10', estado: 'APROBADO', entidad: 'MEF', fase: 1 },
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
  const mesaDePartes = datos.areasUsuarias.find((a) => a.codigo === '01.01.02.03.04');
  if (mesaDePartes) {
    datos.itemsAreaUsuaria = ITEMS_MESA_DE_PARTES.map(([commodity, descripcionCommodity, item, descripcionItem]) => ({
      id: nuevoId(datos, 'aui'),
      areaUsuariaId: mesaDePartes.id,
      tipo: 'puede-pedir' as const,
      commodity,
      descripcionCommodity,
      item,
      descripcionItem,
      vigente: true,
      especialidad: 'General' as const,
    }));
  }
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
          id: 'plantilla-titular',
          codigoOu: 'A.02.01.01.05-01',
          denominacion: 'Oficina General de Tecnologías de la Información',
          rol: 'AU titular',
          esTitular: true,
          montos: { '3': 200000, '4': 80000, '7': 400000 },
        },
        {
          id: 'plantilla-au-1',
          codigoOu: 'A.03.01.01.05.01-01',
          denominacion: 'Oficina de Infraestructura Tecnológica',
          rol: 'AU',
          esTitular: false,
          montos: { '3': 500000, '4': 100000, '7': 200000 },
        },
        {
          id: 'plantilla-au-2',
          codigoOu: 'A.03.01.01.05.02-01',
          denominacion: 'Oficina de Sistemas de Información',
          rol: 'AU',
          esTitular: false,
          montos: { '3': 500000, '4': 120000, '7': 300000 },
        },
        {
          id: 'plantilla-ate-1',
          codigoOu: 'A.03.01.01.05.02.01-01',
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
    const numero = numeroDocumentoItemsEstrategicos(datos.correlativoItemsEstrategicos);
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

  // Anexos 02 de CMN Programación (Figma «A.2-OA-EV-009»): los del Ministerio de Educación los registra la Especialista OA
  // (los responden el Evaluador OA y el Aprobador OA); el del MEF, Ana (lo valida Marta y lo aprueba Luis).
  const especialista = USUARIOS_DEMO.find((u) => u.id === 'usr-especialista-oa')!;
  const aprobadorOa = USUARIOS_DEMO.find((u) => u.id === 'usr-aprobador-oa')!;
  const evaluadorOa = USUARIOS_DEMO.find((u) => u.id === 'usr-evaluador-oa')!;
  const perfilOa = especialista.perfiles[0];
  for (const semilla of SEMILLAS_ANEXO_2) {
    const id = nuevoId(datos, 'sol');
    datos.correlativoAnexo2Fase1 += 1;
    const creada = enFecha(semilla.creada, 9);
    const mef = semilla.entidad === 'MEF';
    const creador = mef ? ana : especialista;
    const historial = mef
      ? historialSemilla(datos, semilla.creada, semilla.estado)
      : historialSemilla(datos, semilla.creada, semilla.estado, undefined, especialista, aprobadorOa, evaluadorOa);
    datos.solicitudes.push({
      id,
      numero: numeroDocumentoAnexo2Fase1(datos.correlativoAnexo2Fase1),
      catDocumento: TIPO_DOCUMENTO_SA2F1,
      tipoAccion: TIPO_ACCION_SA2F1,
      estado: semilla.estado,
      asuntoMotivo: `[${(mef ? UNIDAD_CREADORA.nombre : perfilOa.unidad ?? '').toUpperCase()}] `,
      entidadCreadora: mef
        ? ENTIDAD_CREADORA
        : { id: perfilOa.entidadId ?? '', codMef: perfilOa.entidadCodigo ?? '', siglas: perfilOa.entidadSiglas ?? '', nombre: perfilOa.entidad ?? '' },
      unidadCreadora: mef ? UNIDAD_CREADORA : { id: perfilOa.unidadId ?? '', sigla: perfilOa.unidadSigla ?? '', nombre: perfilOa.unidad ?? '' },
      creador: { id: creador.id, nombres: creador.nombres, apellidoPaterno: creador.apellidoPaterno, apellidoMaterno: creador.apellidoMaterno },
      fechaRegistro: creada,
      createdAt: creada,
      updatedAt: historial[historial.length - 1].createdAt,
      ...(semilla.estado === 'APROBADO' ? { fechaAprobacion: historial[historial.length - 1].createdAt } : {}),
      itemsCuenta: [],
      detalleAnexo2Fase1: {
        documentoId: id,
        fase: semilla.fase,
        // Un Anexo 02 aprobado ya tiene evaluados todos sus Anexos 01.
        areas: CONTEXTO_ANEXO_2_FASE_1.areas.map((a) => ({ ...a, estadoEvaluacion: semilla.estado === 'APROBADO' ? ('Completo' as const) : a.estadoEvaluacion })),
      },
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


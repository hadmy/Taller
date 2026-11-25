import { HttpClient, HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';

import type { LoginResponse } from '../core/api/auth-api.service';
import type { SolicitudResponse } from '../core/api/solicitudes-api.service';
import type {
  ConsolidadoAnexo2,
  ContextoAnexo2,
  DetalleAnexo1,
  GuardarModificacionRequest,
  ModificacionAnexo2,
  RegistroAnexo2,
  VigenteAnexo2,
} from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import type { ItemEstrategicoCatalogo, ItemEstrategicoRegistro } from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import type { FilaDashboardCmn } from '../modules/reportes/dashboard/models/dashboard-cmn.model';
import type { SeguimientoNacional } from '../modules/reportes/seguimiento-nacional/models/seguimiento-nacional.model';
import type { EntidadServicioBasico, ServicioBasico } from '../modules/configuracion/servicios-basicos-excluidos/models/servicio-basico.model';
import type { AreaUsuaria, AreaUsuariaItem } from '../modules/configuracion/areas-usuarias/models/area-usuaria.model';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { CONTEXTO_ANEXO_2_FASE_1, reiniciarDatosDemo } from './mock-db';
import { CONTRASENA_DEMO } from './usuarios-demo';

/**
 * El backend simulado sigue las reglas del flujo de una solicitud. Si una clase cambia una regla, este spec dice
 * cuál se rompió.
 */
describe('mockBackendInterceptor', () => {
  const API = '/api/v1';
  let http: HttpClient;
  let red: HttpTestingController;

  /** Solicitud de necesidades estratégicas: el tipo de documento con el que se prueban las reglas generales. */
  const NUEVA_SIE = { tipoDocumentoId: 'td-sie', tipoAccion: 'inclusion', organoLinea: 'OGA', justificacion: 'Ítems nuevos' };
  const ITEMS = [{ codigo: '4215271000010524', descripcion: 'Placas radiográficas' }];

  /** Resuelve la petición simulada (tiene una latencia de 250 ms) y devuelve la respuesta o el error. */
  function esperar<T>(peticion: Observable<T>): { valor?: T; error?: HttpErrorResponse } {
    const resultado: { valor?: T; error?: HttpErrorResponse } = {};
    peticion.subscribe({ next: (v) => (resultado.valor = v), error: (e: HttpErrorResponse) => (resultado.error = e) });
    tick(300);
    return resultado;
  }

  function entrar(dni: string): HttpHeaders {
    const { valor } = esperar(http.post<LoginResponse>(`${API}/auth/login`, { dni, password: CONTRASENA_DEMO }));
    return new HttpHeaders({ Authorization: `Bearer ${valor!.accessToken}` });
  }

  function archivo(): FormData {
    const form = new FormData();
    form.append('archivo', new File(['%PDF'], 'constancia.pdf', { type: 'application/pdf' }));
    return form;
  }

  beforeEach(() => {
    reiniciarDatosDemo();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockBackendInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    red = TestBed.inject(HttpTestingController);
  });

  // Ninguna llamada a la API sale a la red: las responde el simulador.
  afterEach(() => red.verify());

  afterAll(() => reiniciarDatosDemo());

  it('rechaza una contraseña incorrecta con el mensaje que muestra el login', fakeAsync(() => {
    const { error } = esperar(http.post(`${API}/auth/login`, { dni: '11111111', password: 'otra' }));

    expect(error?.status).toBe(401);
    expect(error?.error.message).toContain('Usuario o contraseña incorrectos');
  }));

  it('entrega los perfiles del usuario y cambia al que se elige', fakeAsync(() => {
    const { valor } = esperar(http.post<LoginResponse>(`${API}/auth/login`, { dni: '33333333', password: CONTRASENA_DEMO }));
    expect(valor?.perfilesDisponibles.map((p) => p.rolCodigo)).toEqual(['CREADOR', 'APROBADOR']);

    const headers = new HttpHeaders({ Authorization: `Bearer ${valor!.accessToken}` });
    const cambio = esperar(http.patch<{ perfilActivo: { rolCodigo: string } }>(`${API}/auth/cambiar-perfil`, { perfilId: 'perfil-carla-aprobador' }, { headers }));

    expect(cambio.valor?.perfilActivo.rolCodigo).toBe('APROBADOR');
  }));

  it('la bandeja no muestra solicitudes en NUEVO y pagina si se pide', fakeAsync(() => {
    const headers = entrar('11111111');
    esperar(http.post(`${API}/solicitudes`, NUEVA_SIE, { headers }));

    const { valor } = esperar(http.get<{ data: SolicitudResponse[]; total: number }>(`${API}/solicitudes/bandeja-creador?tipos=SIE&page=1&limit=5`, { headers }));

    expect(valor?.data.length).toBe(5);
    expect(valor?.total).toBe(7);
  }));

  it('no crea solicitudes de un tipo de documento que no existe', fakeAsync(() => {
    const headers = entrar('11111111');
    const { error } = esperar(http.post(`${API}/solicitudes`, { ...NUEVA_SIE, tipoDocumentoId: 'td-inexistente' }, { headers }));

    expect(error?.status).toBe(400);
  }));

  it('recorre el flujo completo: elaborar, verificar y aprobar avisa a cada rol', fakeAsync(() => {
    const ana = entrar('11111111');
    const creada = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, NUEVA_SIE, { headers: ana }));
    const id = creada.valor!.id;

    // Sin datos no se puede elaborar.
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana })).error?.status).toBe(400);

    esperar(http.post(`${API}/solicitudes/${id}/items-estrategicos`, { items: ITEMS }, { headers: ana }));
    const elaborada = esperar(http.patch<{ numero: string }>(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    expect(elaborada.valor?.numero).toMatch(/^CMN-SIE-00008-\d{4}-MEF-OGA$/);

    // El creador no puede aprobar.
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: ana })).error?.status).toBe(409);
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: ana }));

    // El aprobador no responde lo que el evaluador aún no valida.
    const luis = entrar('22222222');
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: luis })).error?.status).toBe(409);

    const marta = entrar('66666666');
    const avisosMarta = esperar(http.get<{ titulo: string; documento: { id: string } }[]>(`${API}/notificaciones`, { headers: marta }));
    expect(avisosMarta.valor?.some((n) => n.documento.id === id && n.titulo === 'Solicitud por validar')).toBeTrue();
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VALIDADO' }, { headers: marta })).error?.status).toBe(400);
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VALIDADO', comentario: 'Conforme.' }, { headers: marta }));

    const avisos = esperar(http.get<{ titulo: string; documento: { id: string } }[]>(`${API}/notificaciones`, { headers: luis }));
    expect(avisos.valor?.some((n) => n.documento.id === id && n.titulo === 'Solicitud por aprobar')).toBeTrue();

    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: luis }));

    const detalle = esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: luis }));
    expect(detalle.valor?.historialEstados?.map((h) => h.estadoNuevo)).toEqual(['NUEVO', 'ELABORADO', 'VERIFICADO', 'VALIDADO', 'APROBADO']);

    const avisosAna = esperar(http.get<{ titulo: string; documento: { id: string } }[]>(`${API}/notificaciones`, { headers: ana }));
    expect(avisosAna.valor?.some((n) => n.documento.id === id && n.titulo === 'Solicitud aprobada')).toBeTrue();
  }));

  it('observar pide comentario y una solicitud observada ya no se puede eliminar', fakeAsync(() => {
    const luis = entrar('22222222');
    const bandeja = esperar(http.get<SolicitudResponse[]>(`${API}/solicitudes/bandeja-aprobador?tipos=SIE`, { headers: luis }));
    const validada = bandeja.valor!.find((s) => s.estado === 'VALIDADO')!;

    expect(esperar(http.patch(`${API}/solicitudes/${validada.id}/estado`, { estadoNuevo: 'OBSERVADO' }, { headers: luis })).error?.status).toBe(400);
    esperar(http.patch(`${API}/solicitudes/${validada.id}/estado`, { estadoNuevo: 'OBSERVADO', comentario: 'Falta la constancia.' }, { headers: luis }));

    const ana = entrar('11111111');
    esperar(http.patch(`${API}/solicitudes/${validada.id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    const eliminar = esperar(http.patch(`${API}/solicitudes/${validada.id}/estado`, { estadoNuevo: 'ELIMINADO' }, { headers: ana }));

    expect(eliminar.error?.status).toBe(409);
    expect(eliminar.error?.error.message).toContain('observada');
  }));

  it('necesidades estratégicas: elaborar pide ítems, numera con su serie y aprobar deja los ítems vigentes', fakeAsync(() => {
    const ana = entrar('11111111');
    const creada = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sie', tipoAccion: 'inclusion', organoLinea: 'OGA', justificacion: 'Ítems nuevos' }, { headers: ana }));
    const id = creada.valor!.id;
    expect(creada.valor?.catDocumento?.codigo).toBe('SIE');

    // Sin ítems no se puede elaborar, y no se aceptan ítems fuera del catálogo.
    esperar(http.post(`${API}/solicitudes/${id}/sustentos`, archivo(), { headers: ana }));
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana })).error?.status).toBe(400);
    expect(esperar(http.post(`${API}/solicitudes/${id}/items-estrategicos`, { items: [{ codigo: '0000', descripcion: 'Otro' }] }, { headers: ana })).error?.status).toBe(400);

    const catalogo = esperar(http.get<ItemEstrategicoCatalogo[]>(`${API}/items-estrategicos/catalogo`, { headers: ana })).valor!;
    const elegidos = catalogo.slice(14, 16).map(({ codigo, descripcion }) => ({ codigo, descripcion }));
    esperar(http.post(`${API}/solicitudes/${id}/items-estrategicos`, { items: elegidos }, { headers: ana }));
    const elaborada = esperar(http.patch<{ numero: string }>(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    expect(elaborada.valor?.numero).toMatch(/^CMN-SIE-00008-\d{4}-MEF-OGA$/);

    // Cada proceso tiene su bandeja.
    const bandeja = esperar(http.get<SolicitudResponse[]>(`${API}/solicitudes/bandeja-creador?tipos=SIE`, { headers: ana }));
    expect(bandeja.valor?.every((s) => s.catDocumento?.codigo === 'SIE')).toBeTrue();
    expect(bandeja.valor?.length).toBe(8);

    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: ana }));
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VALIDADO', comentario: 'Conforme.' }, { headers: entrar('66666666') }));
    const luis = entrar('22222222');
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: luis }));

    const registros = esperar(http.get<ItemEstrategicoRegistro[]>(`${API}/items-estrategicos`, { headers: luis })).valor!;
    const nuevos = registros.filter((r) => r.documentoId === id);
    expect(nuevos.map((r) => r.codigo)).toEqual(elegidos.map((i) => i.codigo));
    expect(nuevos.every((r) => r.vigente)).toBeTrue();
  }));

  it('anexo 02, fase 1: elaborar pide áreas usuarias con Anexo 01 recibido, sin sustento, y numera con su serie', fakeAsync(() => {
    const ana = entrar('11111111');
    const contexto = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: ana })).valor!;
    expect(contexto.areas.length).toBe(contexto.resumen.anexosRecibidos);

    const creada = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'creacion', organoLinea: 'OGA', justificacion: '' }, { headers: ana }));
    const id = creada.valor!.id;
    expect(creada.valor?.catDocumento?.codigo).toBe('SA2F1');

    // Sin áreas no se puede elaborar, y no se aceptan áreas sin Anexo 01 recibido.
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana })).error?.status).toBe(400);
    const ajena = { ...contexto.areas[0], id: 'otra', nombre: 'Otra oficina' };
    expect(esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: [ajena] }, { headers: ana })).error?.status).toBe(400);

    // La Fase 1 del MEF ya tiene un Anexo 02 aprobado (0004): no se crea otro, se modifica ese.
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 2) }, { headers: ana }));
    const repetida = esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    expect(repetida.error?.status).toBe(409);
    expect(repetida.error?.error.message).toContain('0004');

    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 2), fase: 2 }, { headers: ana }));
    const elaborada = esperar(http.patch<{ numero: string }>(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    // Los Anexos 02 sembrados van del 0001 al 0003 (MINEDU, Fases 1 a 3) y el 0004 (MEF, Fase 1).
    expect(elaborada.valor?.numero).toBe('0005');

    const detalle = esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: ana })).valor!;
    expect(detalle.detalleAnexo2Fase1?.areas.map((a) => a.id)).toEqual(contexto.areas.slice(0, 2).map((a) => a.id));
    expect(detalle.detalleAnexo2Fase1?.fase).toBe(2);
  }));

  it('anexo 02: la fase del CMN (2 o 3) se guarda con las áreas y se conserva al volver a grabar sin fase', fakeAsync(() => {
    const ana = entrar('11111111');
    const contexto = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: ana })).valor!;
    const id = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'creacion', organoLinea: 'OGA', justificacion: '' }, { headers: ana })).valor!.id;
    const fase = () => esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: ana })).valor!.detalleAnexo2Fase1?.fase;

    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 1), fase: 3 }, { headers: ana }));
    expect(fase()).toBe(3);
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 2) }, { headers: ana }));
    expect(fase()).toBe(3);
  }));

  it('anexo 02, fase 1: la OA evalúa cada Anexo 01 una sola vez; «Incompleto» pide comentario y la evaluación se conserva al regrabar', fakeAsync(() => {
    const oa = entrar('44444444');
    const contexto = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: oa })).valor!;
    const id = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'creacion', organoLinea: 'OLA', justificacion: '' }, { headers: oa })).valor!.id;
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas, fase: 3 }, { headers: oa }));
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: oa }));
    const contabilidad = contexto.areas.find((a) => a.id === 'a1-oc')!;
    const urlArea = (areaId: string) => `${API}/solicitudes/${id}/anexo-2-fase-1/areas/${areaId}`;

    // El detalle trae los ítems del Anexo 01: su monto suma el del área (Figma: 3 × S/ 37,400.00).
    const detalle = esperar(http.get<DetalleAnexo1>(urlArea(contabilidad.id), { headers: oa })).valor!;
    expect(detalle.evaluable).toBeTrue();
    expect(detalle.items.length).toBe(contabilidad.items);
    expect(detalle.items.reduce((s, i) => s + i.montoProgramado, 0)).toBeCloseTo(contabilidad.montoProgramado, 2);

    // «Incompleto» sin comentario no pasa; con comentario queda observado y ya no se puede volver a evaluar.
    expect(esperar(http.post(`${urlArea(contabilidad.id)}/evaluacion`, { estado: 'Incompleto' }, { headers: oa })).error?.status).toBe(400);
    esperar(http.post(`${urlArea(contabilidad.id)}/evaluacion`, { estado: 'Incompleto', comentario: 'Reevaluar si corresponde' }, { headers: oa }));
    const observado = esperar(http.get<DetalleAnexo1>(urlArea(contabilidad.id), { headers: oa })).valor!;
    expect(observado.area.estadoEvaluacion).toBe('Incompleto');
    expect(observado.area.comentarioEvaluacion).toBe('Reevaluar si corresponde');
    expect(observado.evaluable).toBeFalse();
    expect(esperar(http.post(`${urlArea(contabilidad.id)}/evaluacion`, { estado: 'Completo' }, { headers: oa })).error?.status).toBe(409);

    // Volver a grabar las áreas no borra la evaluación.
    esperar(http.post(`${urlArea('a1-oa')}/evaluacion`, { estado: 'Completo' }, { headers: oa }));
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas, fase: 3 }, { headers: oa }));
    const grabada = esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: oa })).valor!;
    const estados = Object.fromEntries((grabada.detalleAnexo2Fase1?.areas ?? []).map((a) => [a.id, a.estadoEvaluacion]));
    const esperados = Object.fromEntries(
      contexto.areas.map((a) => [a.id, a.id === 'a1-oa' ? 'Completo' : a.id === 'a1-oc' ? 'Incompleto' : 'Pendiente'] as const),
    );
    expect(estados).toEqual(esperados);

    // Verificada, la solicitud ya no admite evaluaciones.
    // La OA evalúa todos los Anexos 01 antes de verificar: con alguno pendiente, no se puede.
    const verificar = () => esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: oa }));
    expect(verificar().error?.status).toBe(400);
    for (const area of contexto.areas.filter((a) => a.id !== 'a1-oa' && a.id !== 'a1-oc')) {
      esperar(http.post(`${urlArea(area.id)}/evaluacion`, { estado: 'Completo' }, { headers: oa }));
    }
    expect(verificar().error).toBeUndefined();
    // Verificar no cambia las evaluaciones: el observado sigue observado con su comentario.
    const verificada = esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: oa })).valor!;
    const contabilidadVerificada = verificada.detalleAnexo2Fase1?.areas.find((a) => a.id === 'a1-oc');
    expect(contabilidadVerificada?.estadoEvaluacion).toBe('Incompleto');
    expect(contabilidadVerificada?.comentarioEvaluacion).toBe('Reevaluar si corresponde');
    expect(esperar(http.post(`${urlArea('a1-rrhh')}/evaluacion`, { estado: 'Completo' }, { headers: oa })).error?.status).toBe(409);
    expect(esperar(http.get<DetalleAnexo1>(urlArea('a1-rrhh'), { headers: oa })).valor?.evaluable).toBeFalse();
  }));

  it('anexo 02, fase 1: el consolidado integra solo los Anexos 01 revisados, agrupados y con los observados marcados', fakeAsync(() => {
    const oa = entrar('44444444');
    const contexto = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: oa })).valor!;
    const id = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'creacion', organoLinea: 'OLA', justificacion: '' }, { headers: oa })).valor!.id;
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas, fase: 3 }, { headers: oa }));
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: oa }));
    const url = `${API}/solicitudes/${id}/anexo-2-fase-1/consolidado`;

    // Sin Anexos 01 revisados, el consolidado está vacío.
    const vacio = esperar(http.get<ConsolidadoAnexo2>(url, { headers: oa })).valor!;
    expect(vacio.anios).toEqual([2027, 2028, 2029]);
    expect(vacio.grupos).toEqual([]);
    expect(vacio.totalGeneral).toBe(0);

    const evaluar = (areaId: string, cuerpo: object) =>
      esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1/areas/${areaId}/evaluacion`, cuerpo, { headers: oa }));
    evaluar('a1-oa', { estado: 'Completo' });
    evaluar('a1-oc', { estado: 'Incompleto', comentario: 'Sustentar cantidades' });

    const c = esperar(http.get<ConsolidadoAnexo2>(url, { headers: oa })).valor!;
    const filas = c.grupos.flatMap((g) => g.filas);
    // Los ítems de la Oficina de Abastecimiento y la Oficina de Contabilidad; las pendientes no entran.
    const revisadas = CONTEXTO_ANEXO_2_FASE_1.areas.filter((a) => a.id === 'a1-oa' || a.id === 'a1-oc');
    expect(filas.length).toBe(revisadas.reduce((suma, a) => suma + a.items, 0));
    expect(new Set(filas.map((f) => f.area))).toEqual(new Set(['Oficina de Abastecimiento', 'Oficina de Contabilidad']));
    const contabilidad = filas.filter((f) => f.area === 'Oficina de Contabilidad');
    expect(contabilidad.every((f) => f.estadoEvaluacion === 'Incompleto' && f.comentario === 'Sustentar cantidades')).toBeTrue();
    // Cada grupo es una sola combinación de fuente, clasificador, actividad y meta.
    const claves = c.grupos.map((g) => [g.fuente, g.clasificador, g.actividadOperativa, g.meta].join('|'));
    expect(new Set(claves).size).toBe(claves.length);
    // Los servicios van sin precio ni cantidad; los bienes, con ambos.
    expect(filas.filter((f) => f.tipo === 'Servicio').every((f) => f.precioUnitario === null && f.semestres.every(([a, b]) => a.cantidad === null && b.cantidad === null))).toBeTrue();
    expect(filas.filter((f) => f.tipo === 'Bien').every((f) => f.precioUnitario! > 0 && f.semestres[0][0].cantidad !== null)).toBeTrue();
    expect(c.totalGeneral).toBeCloseTo(c.totales.reduce((s, [a, b]) => s + a + b, 0), 2);

    expect(esperar(http.get(`${API}/solicitudes/sol-inexistente/anexo-2-fase-1/consolidado`, { headers: oa })).error?.status).toBe(404);
  }));

  it('áreas usuarias: «Sincronizar» incorpora las unidades pendientes con la etiqueta «Nuevo»', fakeAsync(() => {
    const headers = entrar('11111111');
    const URL = `${API}/configuracion/areas-usuarias`;
    const antes = esperar(http.get<AreaUsuaria[]>(URL, { headers })).valor!;
    const disponibles = esperar(http.get<AreaUsuaria[]>(`${URL}/disponibles`, { headers })).valor!;
    expect(disponibles.map((a) => a.denominacion)).toEqual(['UNIDAD DE DESARROLLO DE SOFTWARE', 'OFICINA DE IMAGEN INSTITUCIONAL']);

    const { valor } = esperar(http.post<{ incorporadas: number }>(`${URL}/incorporar`, { ids: disponibles.map((a) => a.id) }, { headers }));
    expect(valor?.incorporadas).toBe(2);

    const despues = esperar(http.get<AreaUsuaria[]>(URL, { headers })).valor!;
    expect(despues.length).toBe(antes.length + 2);
    expect(despues.filter((a) => a.nuevo).every((a) => a.generaCmn)).toBeTrue();
    expect(esperar(http.get<AreaUsuaria[]>(`${URL}/disponibles`, { headers })).valor).toEqual([]);
  }));

  it('áreas usuarias: «Transferir datos» mueve los ítems elegidos de un área inactiva a una activa', fakeAsync(() => {
    const headers = entrar('11111111');
    const URL = `${API}/configuracion/areas-usuarias`;
    const areas = esperar(http.get<AreaUsuaria[]>(URL, { headers })).valor!;
    const mesa = areas.find((a) => a.denominacion === 'MESA DE PARTES')!;
    const destino = areas.find((a) => a.denominacion === 'RECTORADO')!;
    expect(mesa.activo).toBeFalse();

    const origen = esperar(http.get<{ items: AreaUsuariaItem[] }>(`${URL}/${mesa.id}/detalle`, { headers })).valor!;
    expect(origen.items.length).toBe(5);

    // Un área activa no transfiere, y el destino tiene que ser otra área activa.
    expect(esperar(http.post(`${URL}/${destino.id}/transferir`, { destinoId: mesa.id, itemIds: ['x'] }, { headers })).error?.status).toBe(400);
    expect(esperar(http.post(`${URL}/${mesa.id}/transferir`, { destinoId: mesa.id, itemIds: [origen.items[0].id] }, { headers })).error?.status).toBe(400);

    const elegidos = origen.items.slice(3).map((i) => i.id);
    const { valor } = esperar(http.post<{ transferidos: number }>(`${URL}/${mesa.id}/transferir`, { destinoId: destino.id, itemIds: elegidos }, { headers }));
    expect(valor?.transferidos).toBe(2);

    expect(esperar(http.get<{ items: AreaUsuariaItem[] }>(`${URL}/${mesa.id}/detalle`, { headers })).valor!.items.length).toBe(3);
    const enDestino = esperar(http.get<{ items: AreaUsuariaItem[] }>(`${URL}/${destino.id}/detalle`, { headers })).valor!.items;
    expect(enDestino.map((i) => i.id).sort()).toEqual([...elegidos].sort());
  }));

  it('servicios básicos excluidos: las entidades asignadas se graban con cada ítem y deben existir en el catálogo', fakeAsync(() => {
    const headers = entrar('11111111');
    const URL = `${API}/configuracion/servicios-basicos-excluidos`;
    const entidades = esperar(http.get<EntidadServicioBasico[]>(`${URL}/entidades`, { headers })).valor!;
    // Las 13 municipalidades del departamento de Tumbes, de la provincial de Tumbes a la distrital de Papayal.
    expect(entidades.length).toBe(13);
    expect(entidades[0].nombre).toBe('Municipalidad Provincial de Tumbes');
    expect(entidades.map((e) => e.nombre)).toContain('Municipalidad Provincial de Zarumilla');

    const [agua, luz] = esperar(http.get<ServicioBasico[]>(`${URL}/catalogo`, { headers })).valor!;
    const ids = entidades.slice(0, 2).map((e) => e.id);
    esperar(http.put(URL, { items: [{ ...agua, entidades: [...ids, ids[0]] }, luz] }, { headers }));

    // Sin entidades se lee como lista vacía, y las repetidas se graban una vez.
    const grabados = esperar(http.get<ServicioBasico[]>(URL, { headers })).valor!;
    expect(grabados.map((s) => s.entidades)).toEqual([ids, []]);

    const invalida = esperar(http.put(URL, { items: [{ ...agua, entidades: ['ent-inexistente'] }] }, { headers }));
    expect(invalida.error?.status).toBe(400);
    expect(esperar(http.get<ServicioBasico[]>(URL, { headers })).valor!.length).toBe(2);
  }));

  it('una solicitud solo la ven y la responden los perfiles de su entidad', fakeAsync(() => {
    const especialista = entrar('44444444');
    const creada = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'creacion', organoLinea: 'OLA', justificacion: '' }, { headers: especialista }));
    const id = creada.valor!.id;
    const contexto = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: especialista })).valor!;
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 2), fase: 3 }, { headers: especialista }));
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: especialista }));
    // Los Anexos 01 se evalúan antes de verificar.
    for (const area of contexto.areas.slice(0, 2)) {
      esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1/areas/${area.id}/evaluacion`, { estado: 'Completo' }, { headers: especialista }));
    }
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: especialista }));

    type Aviso = { documento: { id: string } };
    const luis = entrar('22222222');
    expect(esperar(http.get<Aviso[]>(`${API}/notificaciones`, { headers: luis })).valor?.some((n) => n.documento.id === id)).toBeFalse();
    expect(esperar(http.get(`${API}/solicitudes/${id}`, { headers: luis })).error?.status).toBe(404);
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: luis })).error?.status).toBe(404);

    const evaluador = entrar('77777777');
    expect(esperar(http.get<Aviso[]>(`${API}/notificaciones`, { headers: evaluador })).valor?.some((n) => n.documento.id === id)).toBeTrue();
    // El Evaluador del CMN no puede rechazar.
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'RECHAZADO', comentario: 'No procede.' }, { headers: evaluador })).error?.status).toBe(409);
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VALIDADO', comentario: 'Conforme.' }, { headers: evaluador }));

    const aprobador = entrar('55555555');
    const bandeja = esperar(http.get<SolicitudResponse[]>(`${API}/solicitudes/bandeja-aprobador?tipos=SA2F1`, { headers: aprobador }));
    expect(bandeja.valor?.some((s) => s.id === id)).toBeTrue();
    expect(esperar(http.get<Aviso[]>(`${API}/notificaciones`, { headers: aprobador })).valor?.some((n) => n.documento.id === id)).toBeTrue();
    // El Aprobador del CMN tampoco puede rechazar.
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'RECHAZADO', comentario: 'No procede.' }, { headers: aprobador })).error?.status).toBe(409);
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: aprobador }));
    expect(esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: especialista })).valor?.estado).toBe('APROBADO');
  }));

  it('anexo 02: cada entidad ve su contexto y un registro por fase aprobada (MINEDU, Fases 1 y 2; MEF, Fase 1)', fakeAsync(() => {
    const especialista = entrar('44444444');
    const carla = entrar('33333333');

    const deMinedu = esperar(http.get<RegistroAnexo2[]>(`${API}/cmn/anexo-2-fase-1/registros`, { headers: especialista })).valor ?? [];
    const delMef = esperar(http.get<RegistroAnexo2[]>(`${API}/cmn/anexo-2-fase-1/registros`, { headers: carla })).valor ?? [];
    // La Fase 3 de MINEDU sigue en elaboración: aún no es un registro.
    expect(deMinedu.map((r) => [r.fase, r.numeroDocumento])).toEqual([[1, '0001'], [2, '0002']]);
    expect(delMef.map((r) => [r.fase, r.numeroDocumento])).toEqual([[1, '0004']]);
    const [registro] = deMinedu;
    expect(registro.areas).toBe(CONTEXTO_ANEXO_2_FASE_1.areas.length);
    expect(registro.programado.map((p) => p.anio)).toEqual([2027, 2028, 2029]);
    expect(registro.versiones.map((v) => [v.numero, v.tipoAccion])).toEqual([['0001', 'creacion']]);

    const contextoMef = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: carla })).valor;
    expect(contextoMef?.datos.entidad).toBe('0001 - Ministerio de Economía y Finanzas');
    const contextoMinedu = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: especialista })).valor;
    expect(contextoMinedu?.datos.entidad).toBe('011 - Ministerio de Educación');
  }));

  describe('anexo 02: Modificación', () => {
    const urlMod = (id: string) => `${API}/solicitudes/${id}/anexo-2-fase-1/modificacion`;
    const vigente = (headers: HttpHeaders, fase = 1) => esperar(http.get<VigenteAnexo2>(`${API}/cmn/anexo-2/vigente?fase=${fase}`, { headers })).valor!;
    const registros = (headers: HttpHeaders) => esperar(http.get<RegistroAnexo2[]>(`${API}/cmn/anexo-2-fase-1/registros`, { headers })).valor!;
    const nueva = (headers: HttpHeaders) =>
      esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'modificacion', organoLinea: 'OLA', justificacion: '' }, { headers })).valor!.id;
    const pasar = (id: string, estadoNuevo: string, headers: HttpHeaders, comentario?: string) =>
      esperar(http.patch<{ numero: string }>(`${API}/solicitudes/${id}/estado`, { estadoNuevo, comentario }, { headers }));

    /** Un área que sigue en plazo, con un cambio en su primera necesidad (el doble de su monto). */
    function cambio(v: VigenteAnexo2): GuardarModificacionRequest {
      const area = v.modificacion!.areas.find((a) => !a.soloLectura)!;
      return {
        fase: v.modificacion!.fase,
        baseId: v.modificacion!.base.documentoId,
        areas: [{ id: area.id, quitada: false, ajustes: { [area.items[0].id]: area.items[0].montoVigente * 2 } }],
      };
    }

    it('pide cambios dentro del plazo sobre el Anexo 02 vigente', fakeAsync(() => {
      const oa = entrar('44444444');
      const v = vigente(oa);
      expect(v.modificacion?.base.numero).toBe('0001');
      expect(v.enProceso).toBeNull();
      const id = nueva(oa);
      const cuerpo = cambio(v);

      // Sin áreas modificadas no se elabora; sin cambios o con otra base no se graba.
      expect(pasar(id, 'ELABORADO', oa).error?.status).toBe(400);
      expect(esperar(http.post(urlMod(id), { ...cuerpo, areas: [] }, { headers: oa })).error?.status).toBe(400);
      expect(esperar(http.post(urlMod(id), { ...cuerpo, baseId: 'otra' }, { headers: oa })).error?.status).toBe(409);

      // Fuera del plazo, el área no se modifica ni se quita.
      const vencida = v.modificacion!.areas.find((a) => a.soloLectura);
      expect(vencida).toBeDefined();
      expect(esperar(http.post(urlMod(id), { ...cuerpo, areas: [{ id: vencida!.id, quitada: true, ajustes: {} }] }, { headers: oa })).error?.status).toBe(400);

      // Una fase sin Anexo 02 aprobado no tiene qué modificar.
      expect(vigente(oa, 3).modificacion).toBeNull();
      expect(esperar(http.post(urlMod(id), { ...cuerpo, fase: 3 }, { headers: oa })).error?.status).toBe(409);
      // Solo el creador.
      expect(esperar(http.post(urlMod(id), cuerpo, { headers: entrar('77777777') })).error?.status).toBe(403);
    }));

    it('elaborada, verificada, validada y aprobada actualiza el mismo registro y suma una versión', fakeAsync(() => {
      const oa = entrar('44444444');
      const antes = registros(oa).find((r) => r.fase === 1)!;
      const v = vigente(oa);
      const cuerpo = cambio(v);
      const monto = Object.values(cuerpo.areas[0].ajustes)[0];
      const id = nueva(oa);
      esperar(http.post(urlMod(id), cuerpo, { headers: oa }));
      expect(pasar(id, 'ELABORADO', oa).valor?.numero).toBe('0005');
      const guardada = esperar(http.get<ModificacionAnexo2>(urlMod(id), { headers: oa })).valor!;
      expect(guardada.areas.find((a) => a.id === cuerpo.areas[0].id)?.items[0].monto).toBe(monto);

      // Con una en curso no se registra otra de la misma fase.
      expect(vigente(oa).enProceso?.numero).toBe('0005');
      expect(esperar(http.post(urlMod(nueva(oa)), cuerpo, { headers: oa })).error?.status).toBe(409);

      expect(pasar(id, 'VERIFICADO', oa).error).toBeUndefined();
      expect(pasar(id, 'VALIDADO', entrar('77777777'), 'Conforme.').error).toBeUndefined();
      // Hasta aprobarse, el registro no cambia.
      expect(registros(oa).find((r) => r.fase === 1)).toEqual(antes);
      expect(pasar(id, 'APROBADO', entrar('55555555')).error).toBeUndefined();

      const despues = registros(oa);
      expect(despues.map((r) => r.fase)).toEqual([1, 2]);
      const registro = despues[0];
      expect(registro.id).toBe(antes.id);
      expect(registro.numero).toBe(antes.numero);
      expect(registro.numeroDocumento).toBe('0005');
      expect(registro.versiones.map((x) => [x.numero, x.tipoAccion])).toEqual([['0001', 'creacion'], ['0005', 'modificacion']]);
      const total = (r: RegistroAnexo2) => r.programado.reduce((s, p) => s + p.monto, 0);
      expect(total(registro) - total(antes)).toBeCloseTo(monto / 2, 1);
      expect(vigente(oa).enProceso).toBeNull();
      expect(vigente(oa).modificacion?.base.numero).toBe('0005');
    }));

    it('observada vuelve al creador; rechazada deja el Anexo 02 vigente como estaba', fakeAsync(() => {
      const oa = entrar('44444444');
      const antes = registros(oa);
      const id = nueva(oa);
      const v = vigente(oa);
      esperar(http.post(urlMod(id), cambio(v), { headers: oa }));
      pasar(id, 'ELABORADO', oa);
      pasar(id, 'VERIFICADO', oa);
      const evaluador = entrar('77777777');
      expect(pasar(id, 'OBSERVADO', evaluador, 'Revisar cantidades.').error).toBeUndefined();

      // El creador la corrige (quita el área) y la vuelve a enviar.
      const quitar = { ...cambio(v), areas: [{ id: cambio(v).areas[0].id, quitada: true, ajustes: {} }] };
      expect(esperar(http.post(urlMod(id), quitar, { headers: oa })).error).toBeUndefined();
      expect(pasar(id, 'ELABORADO', oa).error).toBeUndefined();
      expect(pasar(id, 'VERIFICADO', oa).error).toBeUndefined();
      expect(pasar(id, 'RECHAZADO', evaluador, 'No procede.').error).toBeUndefined();

      expect(registros(oa)).toEqual(antes);
      expect(vigente(oa).modificacion?.base.numero).toBe('0001');
      expect(vigente(oa).enProceso).toBeNull();
    }));
  });

  it('el seguimiento nacional trae las 2,486 Entidades en la fase pedida (por defecto la vigente) y siempre iguales', fakeAsync(() => {
    const url = `${API}/reportes/seguimiento-nacional-cmn`;
    const vigente = esperar(http.get<SeguimientoNacional>(url)).valor!;
    expect(vigente.periodo).toBe('2026');
    expect(vigente.fase).toBe(2);
    expect(vigente.entidades.length).toBe(2486);
    expect(new Set(vigente.entidades.map((e) => e.codigo)).size).toBe(2486);

    const otraVez = esperar(http.get<SeguimientoNacional>(url, { params: { periodo: '2026', fase: '2' } })).valor!;
    expect(otraVez.entidades.map((e) => e.estado)).toEqual(vigente.entidades.map((e) => e.estado));
    // La fase 3 de 2026 todavía no empieza: nadie la inició.
    const fase3 = esperar(http.get<SeguimientoNacional>(url, { params: { periodo: '2026', fase: '3' } })).valor!;
    expect(fase3.entidades.every((e) => e.estado === 0)).toBeTrue();

    expect(esperar(http.get(url, { params: { periodo: '1999' } })).error?.status).toBe(404);
  }));

  it('el dashboard del CMN suma lo mismo que los Anexos 01 de las áreas y filtra por años, áreas y tipo', fakeAsync(() => {
    const url = `${API}/reportes/dashboard-cmn`;
    const monto = (filas: FilaDashboardCmn[]): number => Math.round(filas.reduce((s, f) => s + Number(f.monto.replace(/,/g, '')), 0) * 100) / 100;
    const todas = esperar(http.get<FilaDashboardCmn[]>(url)).valor ?? [];
    const programado = CONTEXTO_ANEXO_2_FASE_1.areas.reduce((s, a) => s + a.montoProgramado, 0);
    expect(monto(todas)).toBe(programado);
    expect(new Set(todas.map((f) => f.anio))).toEqual(new Set(['2027', '2028', '2029']));
    expect(new Set(todas.map((f) => f.areaSigla)).size).toBe(CONTEXTO_ANEXO_2_FASE_1.areas.length);

    const filtradas =
      esperar(http.get<FilaDashboardCmn[]>(url, { params: { anios: '2027', areas: 'OTI,OA', tipo: 'Servicio' } })).valor ?? [];
    expect(filtradas.length).toBeGreaterThan(0);
    expect(filtradas.every((f) => f.anio === '2027' && ['OTI', 'OA'].includes(f.areaSigla) && f.tipo === 'Servicio')).toBeTrue();
  }));

  it('deja pasar lo que no es de la API (los assets)', () => {
    http.get('assets/datos.json').subscribe();

    red.expectOne('assets/datos.json').flush({});
  });
});

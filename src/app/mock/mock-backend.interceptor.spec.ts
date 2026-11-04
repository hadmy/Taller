import { HttpClient, HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';

import type { LoginResponse } from '../core/api/auth-api.service';
import type { SolicitudResponse } from '../core/api/solicitudes-api.service';
import type { ContextoAnexo2 } from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import type { ItemEstrategicoCatalogo, ItemEstrategicoRegistro } from '../modules/abastecimiento/items-estrategicos/models/item-estrategico.model';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { reiniciarDatosDemo } from './mock-db';
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
    expect(valor?.total).toBe(6);
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
    expect(elaborada.valor?.numero).toMatch(/^CMN-SIE-00007-\d{4}-MEF-OGA$/);

    // El creador no puede aprobar.
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: ana })).error?.status).toBe(409);
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: ana }));

    const luis = entrar('22222222');
    const avisos = esperar(http.get<{ titulo: string; documento: { id: string } }[]>(`${API}/notificaciones`, { headers: luis }));
    expect(avisos.valor?.some((n) => n.documento.id === id && n.titulo === 'Solicitud por aprobar')).toBeTrue();

    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: luis }));

    const detalle = esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: luis }));
    expect(detalle.valor?.historialEstados?.map((h) => h.estadoNuevo)).toEqual(['NUEVO', 'ELABORADO', 'VERIFICADO', 'APROBADO']);

    const avisosAna = esperar(http.get<{ titulo: string; documento: { id: string } }[]>(`${API}/notificaciones`, { headers: ana }));
    expect(avisosAna.valor?.some((n) => n.documento.id === id && n.titulo === 'Solicitud aprobada')).toBeTrue();
  }));

  it('observar pide comentario y una solicitud observada ya no se puede eliminar', fakeAsync(() => {
    const luis = entrar('22222222');
    const bandeja = esperar(http.get<SolicitudResponse[]>(`${API}/solicitudes/bandeja-aprobador?tipos=SIE`, { headers: luis }));
    const verificada = bandeja.valor!.find((s) => s.estado === 'VERIFICADO')!;

    expect(esperar(http.patch(`${API}/solicitudes/${verificada.id}/estado`, { estadoNuevo: 'OBSERVADO' }, { headers: luis })).error?.status).toBe(400);
    esperar(http.patch(`${API}/solicitudes/${verificada.id}/estado`, { estadoNuevo: 'OBSERVADO', comentario: 'Falta la constancia.' }, { headers: luis }));

    const ana = entrar('11111111');
    esperar(http.patch(`${API}/solicitudes/${verificada.id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    const eliminar = esperar(http.patch(`${API}/solicitudes/${verificada.id}/estado`, { estadoNuevo: 'ELIMINADO' }, { headers: ana }));

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
    expect(elaborada.valor?.numero).toMatch(/^CMN-SIE-00007-\d{4}-MEF-OGA$/);

    // Cada proceso tiene su bandeja.
    const bandeja = esperar(http.get<SolicitudResponse[]>(`${API}/solicitudes/bandeja-creador?tipos=SIE`, { headers: ana }));
    expect(bandeja.valor?.every((s) => s.catDocumento?.codigo === 'SIE')).toBeTrue();
    expect(bandeja.valor?.length).toBe(7);

    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: ana }));
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

    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 2) }, { headers: ana }));
    const elaborada = esperar(http.patch<{ numero: string }>(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: ana }));
    // Los dos Anexos 02 sembrados (Figma EV-009) son el 0001 y el 0002.
    expect(elaborada.valor?.numero).toBe('0003');

    const detalle = esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: ana })).valor!;
    expect(detalle.detalleAnexo2Fase1?.areas.map((a) => a.id)).toEqual(contexto.areas.slice(0, 2).map((a) => a.id));
  }));

  it('una solicitud solo la ven y la responden los perfiles de su entidad', fakeAsync(() => {
    const especialista = entrar('44444444');
    const creada = esperar(http.post<SolicitudResponse>(`${API}/solicitudes`, { tipoDocumentoId: 'td-sa2f1', tipoAccion: 'creacion', organoLinea: 'OLA', justificacion: '' }, { headers: especialista }));
    const id = creada.valor!.id;
    const contexto = esperar(http.get<ContextoAnexo2>(`${API}/cmn/anexo-2-fase-1/contexto`, { headers: especialista })).valor!;
    esperar(http.post(`${API}/solicitudes/${id}/anexo-2-fase-1`, { areas: contexto.areas.slice(0, 2) }, { headers: especialista }));
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'ELABORADO' }, { headers: especialista }));
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'VERIFICADO' }, { headers: especialista }));

    type Aviso = { documento: { id: string } };
    const luis = entrar('22222222');
    expect(esperar(http.get<Aviso[]>(`${API}/notificaciones`, { headers: luis })).valor?.some((n) => n.documento.id === id)).toBeFalse();
    expect(esperar(http.get(`${API}/solicitudes/${id}`, { headers: luis })).error?.status).toBe(404);
    expect(esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: luis })).error?.status).toBe(404);

    const aprobador = entrar('55555555');
    const bandeja = esperar(http.get<SolicitudResponse[]>(`${API}/solicitudes/bandeja-aprobador?tipos=SA2F1`, { headers: aprobador }));
    expect(bandeja.valor?.some((s) => s.id === id)).toBeTrue();
    expect(esperar(http.get<Aviso[]>(`${API}/notificaciones`, { headers: aprobador })).valor?.some((n) => n.documento.id === id)).toBeTrue();
    esperar(http.patch(`${API}/solicitudes/${id}/estado`, { estadoNuevo: 'APROBADO' }, { headers: aprobador }));
    expect(esperar(http.get<SolicitudResponse>(`${API}/solicitudes/${id}`, { headers: especialista })).valor?.estado).toBe('APROBADO');
  }));

  it('deja pasar lo que no es de la API (los assets)', () => {
    http.get('assets/datos.json').subscribe();

    red.expectOne('assets/datos.json').flush({});
  });
});

import { TestBed } from '@angular/core/testing';

import { SolicitudesStateService, SolicitudDemo } from './solicitudes-state.service';
import { ESTADO } from '../models/documento.model';

/**
 * Los contadores de bandeja se reescribieron en CC-001: la cadena
 * `estado === A || estado === B || estado === C` pasó a
 * `ESTADOS_RESPUESTA_APROBADOR.includes(estado)`. Estos specs fijan el
 * reparto por grupo con un documento de cada estado, para que ese cambio de
 * forma no altere ningún conteo.
 */
describe('SolicitudesStateService — contadores de bandeja', () => {
  let state: SolicitudesStateService;

  function doc(estado: SolicitudDemo['estado'], id = estado): SolicitudDemo {
    return { id, estado } as SolicitudDemo;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = TestBed.inject(SolicitudesStateService);
    // Uno de cada estado: cualquier solapamiento o hueco se ve al instante.
    state.loadAll([
      doc(ESTADO.ELABORADO),
      doc(ESTADO.VERIFICADO),
      doc(ESTADO.VALIDADO),
      doc(ESTADO.APROBADO),
      doc(ESTADO.OBSERVADO),
      doc(ESTADO.RECHAZADO),
      doc(ESTADO.ELIMINADO),
    ]);
  });

  describe('creador', () => {
    it('Recibidos = las tres respuestas del aprobador', () => {
      expect(state.creadorRecibidosCount()).toBe(3);
    });

    it('Enviados = los verificados y validados', () => {
      expect(state.creadorEnviadosCount()).toBe(2);
    });

    it('Borradores = solo los elaborados', () => {
      expect(state.creadorBorradoresCount()).toBe(1);
    });

    it('Papelera = solo los eliminados', () => {
      expect(state.creadorPapeleraCount()).toBe(1);
    });
  });

  describe('evaluador', () => {
    it('Recibidos = lo verificado, Enviados = lo validado y las respuestas', () => {
      expect(state.evaluadorRecibidosCount()).toBe(1);
      expect(state.evaluadorEnviadosCount()).toBe(4);
    });
  });

  describe('aprobador', () => {
    it('Recibidos = lo que llega para su acción (validados)', () => {
      expect(state.aprobadorRecibidosCount()).toBe(1);
    });

    it('Enviados = lo que ya respondió', () => {
      expect(state.aprobadorEnviadosCount()).toBe(3);
    });
  });

  it('la bandeja del aprobador excluye Elaborado y Eliminado', () => {
    const estados = state.bandejaAprobador().map(s => s.estado);

    expect(estados).not.toContain(ESTADO.ELABORADO);
    expect(estados).not.toContain(ESTADO.ELIMINADO);
    expect(estados.length).toBe(5);
  });

  it('cada documento cae en exactamente un grupo del creador', () => {
    const suma = state.creadorRecibidosCount() + state.creadorEnviadosCount()
      + state.creadorBorradoresCount() + state.creadorPapeleraCount();

    // El evaluador y el aprobador tienen sus propios grupos: aquí, 7 documentos sin solapamientos ni huecos.
    expect(suma).toBe(7);
  });
});

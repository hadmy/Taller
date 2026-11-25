import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { DistribucionInternaPresupuestoApiService } from '../api/distribucion-interna-presupuesto-api.service';
import { AVISO_DISTRIBUCION_GRABADA, DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE } from '../config/distribucion-interna-presupuesto.rutas';
import { DistribucionFilaOu } from '../models/distribucion-interna-presupuesto.model';
import { DistribucionInternaPresupuestoFormComponent } from './distribucion-interna-presupuesto-form.component';

describe('DistribucionInternaPresupuestoFormComponent', () => {
  const ANIO = new Date().getFullYear();
  const fila = (id: string, denominacion: string, montos: Record<string, number>, esTitular = false): DistribucionFilaOu => ({
    id, codigoOu: 'A.03.01.01.05-01', denominacion, rol: esTitular ? 'AU titular' : 'AU', esTitular, montos,
  });
  const plantilla = {
    areaUsuariaTitular: { codigo: 'A.02', denominacion: 'OGTI' },
    entidadUe: 'MEF',
    periodo: ANIO,
    genericas: [{ codigo: '3', presupuestoRecibido: 1000 }, { codigo: '4', presupuestoRecibido: 300 }],
    filas: [fila('t', 'OGTI', { '3': 0, '4': 0 }, true), fila('a', 'Infraestructura', { '3': 0, '4': 0 })],
  };

  function crear(params: Record<string, string>) {
    const distribucion = (id: string, presupuestoFase: string, monto: number) => ({
      id, anio: ANIO, estado: 'En Proceso', presupuestoFase, ...plantilla,
      // Filas grabadas antes con otro id: se reconocen por su denominación.
      filas: [fila('dipf-1', 'OGTI', { '3': 0, '4': 0 }, true), fila('dipf-2', 'Infraestructura', { '3': monto, '4': 50 })],
    });
    const guardar = jasmine.createSpy('guardar').and.returnValue(of({}));
    const api = { listar: () => of([distribucion('d1', 'fase1', 400), distribucion('d2', 'fase2', 700)]), plantilla: () => of(plantilla), guardar };
    TestBed.configureTestingModule({
      imports: [DistribucionInternaPresupuestoFormComponent],
      providers: [
        provideRouter([]),
        { provide: DistribucionInternaPresupuestoApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      ],
    });
    const ir = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(DistribucionInternaPresupuestoFormComponent);
    fixture.detectChanges();
    return { c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, guardar, ir };
  }

  it('Editar carga los montos grabados de la fase marcada y deja el saldo al titular', () => {
    const { c, el } = crear({ anio: String(ANIO), fase: 'fase2' });
    expect(c.etiquetaFase()).toBe('Fase 2: APM actual');
    expect(c.filas()[1].montos).toEqual({ '3': 700, '4': 50 });
    expect(c.filas()[0].montos).toEqual({ '3': 300, '4': 250 });
    expect(el.querySelector('[data-fila="t"] siaf-input')).toBeNull();
    expect(el.querySelectorAll('[data-fila="a"] siaf-input').length).toBe(2);
  });

  it('si una genérica excede lo recibido, avisa y no deja grabar', () => {
    const { c, guardar } = crear({ anio: String(ANIO), fase: 'fase1' });
    c.actualizarMonto('a', '4', '305');
    expect(c.excesos()).toEqual([{ codigo: '4', exceso: 5 }]);
    c.grabar();
    c.confirmarGrabar();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('al grabar vuelve a la lista con el aviso de éxito', () => {
    const { c, guardar, ir } = crear({});
    c.seleccionarAnio(String(ANIO + 1));
    c.seleccionarPresupuestoFase('fase3');
    expect(c.filas()[1].montos).toEqual({ '3': 0, '4': 0 });
    c.actualizarMonto('a', '3', '100');
    c.confirmarGrabar();
    expect(guardar).toHaveBeenCalled();
    expect(ir).toHaveBeenCalledWith(DISTRIBUCION_INTERNA_PRESUPUESTO_ROUTE, { state: { aviso: AVISO_DISTRIBUCION_GRABADA } });
  });
});

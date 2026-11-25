import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { calendarioDeFase, faseEntidad, kpisEntidad, leerFiltros, pendientesOa } from '../utils/consulta-entidad.util';
import { ConsultaEntidadComponent } from './consulta-entidad.component';

const PARAMETROS = { periodo: '2026', anexo: '01', fase: '2' };

describe('ConsultaEntidadComponent', () => {
  let fixture: ComponentFixture<ConsultaEntidadComponent>;
  const pagina = (): ConsultaEntidadComponent => fixture.componentInstance;
  const el = (): HTMLElement => fixture.nativeElement;
  const pasar = (): void => {
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConsultaEntidadComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    fixture = TestBed.createComponent(ConsultaEntidadComponent);
  });

  it('abre sin consultar; consultada, es la vista de la OA con sus 24 áreas, de mayor a menor monto', fakeAsync(() => {
    pasar();
    expect(el().querySelector('[data-consulta-vacia]')).not.toBeNull();

    pagina().consultar(PARAMETROS);
    pasar();
    expect(pagina().resultado()?.rows.length).toBe(24);
    expect(pagina().resultado()?.rows[0]['area']).toContain('0034');
    expect(el().querySelector('[data-nota-resultado]')?.textContent).toContain('vista de la Oficina de Abastecimiento');
    expect(el().querySelector('[data-parametros]')?.textContent).toContain('Año 1 (2027)');
  }));

  it('KPI, pendientes y calendario de la fase 2 como en el prototipo', fakeAsync(() => {
    pasar();
    const datos = pagina().datos()!;
    const f = leerFiltros(PARAMETROS);
    expect(kpisEntidad(datos, f, {}, '01').map((k) => k.amount)).toEqual(['14 / 24', '4', '76', 'Elaborado']);
    expect(pendientesOa(datos, f, {}).total).toBe(13);
    const calendario = calendarioDeFase(faseEntidad(datos, 2), datos.fechaCorte);
    expect(calendario.etapas.map((e) => [e.texto, e.detalle])).toEqual([
      ['01/05 – 21/05 · 21 días', 'Concluida'],
      ['22/05 – 15/06 · 25 días', 'En curso · vence 15/06'],
      ['01/05 – 30/06 · 61 días', 'En curso · vence 30/06'],
    ]);
  }));

  it('con un área usuaria muestra su vista; el estado y la selección acotan las áreas', fakeAsync(() => {
    pasar();
    pagina().consultar({ ...PARAMETROS, area: '0040' });
    pasar();
    expect(pagina().config().resultNote).toContain('vista del Área usuaria 0040');
    expect(pagina().resultado()?.rows.length).toBe(1);
    expect(pagina().pendientes()).toBeNull();

    pagina().consultar({ ...PARAMETROS, estado: 'Elaborado' });
    pasar();
    expect(pagina().resultado()?.rows.length).toBe(4);
    pagina().consultar(PARAMETROS);
    pagina().cambiarSeleccion('estado', '4');
    expect(pagina().resultado()?.rows.length).toBe(14);
  }));
});

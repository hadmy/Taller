import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { DashboardReportesComponent } from './dashboard.component';

describe('DashboardReportesComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({
      imports: [DashboardReportesComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    const fixture = TestBed.createComponent(DashboardReportesComponent);
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    return fixture;
  };

  it('abre con todo el CMN y los combos «Año del CMN» y «Área usuaria» en Todos, bajo el título del resultado', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const filtros: HTMLElement = fixture.nativeElement.querySelector('[data-resultado] [data-filtros-dashboard]');

    expect(filtros).withContext('los combos van dentro de la tarjeta del resultado').not.toBeNull();
    expect(pagina.anioElegido()).toBe('todos');
    expect(pagina.areaElegida()).toBe('todos');
    expect(pagina.opcionesAreaCombo()[0]).toEqual({ label: 'Todas', value: 'todos' });
    expect(pagina.opcionesAreaCombo().length).toBe(13);
    expect(new Set(pagina.resultado()!.rows.map((f) => f['anio']))).toEqual(new Set(['2027', '2028', '2029']));
  }));

  it('elegir año y área consulta solo eso y lo deja en «Parámetros»; «Todos» y «Todas» vuelven a todo', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.elegirAnio('2028');
    tick(300);
    pagina.elegirArea('OTI');
    tick(300);
    const filas = pagina.resultado()!.rows;
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.every((f) => f['anio'] === '2028' && f['areaSigla'] === 'OTI')).toBeTrue();
    expect(pagina.parametros()).toEqual({ anios: ['2028'], areas: ['OTI'] });
    expect(pagina.anioElegido()).toBe('2028');
    expect(pagina.areaElegida()).toBe('OTI');

    pagina.elegirAnio('todos');
    tick(300);
    pagina.elegirArea('todos');
    tick(300);
    expect(pagina.parametros()).toEqual({ anios: ['2027', '2028', '2029'] });
    expect(new Set(pagina.resultado()!.rows.map((f) => f['areaSigla'])).size).toBe(12);
  }));
});

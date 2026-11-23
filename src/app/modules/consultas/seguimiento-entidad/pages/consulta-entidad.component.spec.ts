import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { ConsultaEntidadComponent } from './consulta-entidad.component';

describe('ConsultaEntidadComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({
      imports: [ConsultaEntidadComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    const fixture = TestBed.createComponent(ConsultaEntidadComponent);
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    // Al llegar los datos cambian también las opciones de los parámetros: un ciclo más para pintar el resultado.
    tick();
    fixture.detectChanges();
    return fixture;
  };

  it('abre consultada en «Anexos N.º 01 por área usuaria»: 24 áreas, cuatro KPI y seis pestañas', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    expect(pagina.config().tabs?.length).toBe(6);
    expect(pagina.resultado()?.rows.length).toBe(24);
    expect(fixture.nativeElement.querySelectorAll('siaf-kpi-card').length).toBe(4);
    // Las áreas y las ATE del parámetro llegan con los datos.
    const campo = (clave: string) => pagina.config().parameterFields.find((p) => p.key === clave)!;
    expect(campo('areas').options?.length).toBe(24);
    expect(campo('ates').options?.length).toBeGreaterThan(0);
  }));

  it('áreas, genéricas y año filtran y recalculan sin volver a consultar', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const datos = pagina.datos();

    pagina.parametros.set({ fase: '2', anio: '0', areas: ['0021'] });
    expect(pagina.resultado()?.rows.map((f) => f['codigo'])).toEqual(['0021']);

    pagina.cambiarPestana('techo');
    pagina.parametros.set({ fase: '2', anio: '0', genericas: ['2.3'] });
    expect(pagina.resultado()?.rows.length).toBe(1);
    const anio1 = pagina.resultado()?.rows[0]['techo'];
    pagina.parametros.set({ fase: '2', anio: '2', genericas: ['2.3'] });
    expect(pagina.resultado()?.rows[0]['techo']).not.toBe(anio1);
    expect(pagina.datos()).toBe(datos);
  }));

  it('pendientes marca el urgente y la pestaña de necesidades no tiene gráficos', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.cambiarPestana('pendientes');
    const filas = pagina.resultado()!.rows;
    expect(filas.map((f) => f['pendiente'])).toEqual([
      'Anexos N.º 01 por revisar',
      'Ampliaciones por evaluar',
      'Áreas sin Anexo N.º 01 aprobado',
      'Necesidades estratégicas por aprobar',
    ]);
    expect(filas[2]['urgente']).toBe('Sí');

    pagina.cambiarPestana('necesidades');
    expect(pagina.config().charts).toBeUndefined();
    expect(pagina.resultado()!.rows.length).toBeGreaterThan(0);
  }));
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { SeguimientoDplaipComponent } from './seguimiento-dplaip.component';

describe('SeguimientoDplaipComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({
      imports: [SeguimientoDplaipComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    const fixture = TestBed.createComponent(SeguimientoDplaipComponent);
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    // Un ciclo más para que la plantilla pinte el resultado recién llegado.
    tick();
    fixture.detectChanges();
    return fixture;
  };

  it('abre consultada en «Estado del Anexo N.º 02», con seis pestañas y su vista de gráficas', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    expect(pagina.config().tabs?.map((t) => t.label)).toEqual([
      'Estado del Anexo N.º 02',
      'Avance acumulado',
      'Orden de prelación',
      'Ampliaciones de plazo',
      'Por departamento',
      'Detalle por Entidad',
    ]);
    expect(pagina.resultado()?.rows.length).toBe(2486);
    expect(pagina.config().charts?.charts.map((c) => c.type)).toEqual(['bar', 'donut']);
    expect(fixture.nativeElement.querySelectorAll('siaf-kpi-card').length).toBe(4);
  }));

  it('cada pestaña cambia columnas y gráficos; el detalle no tiene gráficos', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.cambiarPestana('departamentos');
    expect(pagina.config().columns.map((c) => c.key)).toEqual(['departamento', 'entidades', 'aprobadas', 'porcentaje']);
    expect(pagina.resultado()?.rows.length).toBe(25);

    pagina.cambiarPestana('detalle');
    expect(pagina.config().charts).toBeUndefined();
    expect(pagina.resultado()?.rows.length).toBe(2486);
  }));

  it('niveles filtra sin volver a consultar; la fase trae otros datos', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const datos = pagina.datos();

    pagina.consultar({ periodo: '2026', fase: '2', niveles: ['Gobierno Regional'] });
    expect(pagina.datos()).toBe(datos);
    expect(pagina.resultado()?.rows.every((f) => f['nivel'] === 'Gobierno Regional')).toBeTrue();

    pagina.consultar({ periodo: '2026', fase: '3' });
    tick(300);
    expect(pagina.datos()?.fase).toBe(3);
  }));
});

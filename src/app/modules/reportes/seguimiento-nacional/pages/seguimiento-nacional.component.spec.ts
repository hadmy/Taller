import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { SeguimientoNacionalComponent } from './seguimiento-nacional.component';

describe('SeguimientoNacionalComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({
      imports: [SeguimientoNacionalComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    const fixture = TestBed.createComponent(SeguimientoNacionalComponent);
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    return fixture;
  };

  it('abre en el periodo 2026, fase 2, con las 2,486 Entidades, cinco KPI y el detalle paginado de a 10', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const el: HTMLElement = fixture.nativeElement;

    expect(pagina.datos()?.fase).toBe(2);
    expect(pagina.entidades().length).toBe(2486);
    expect(pagina.kpis().map((k) => k.title)).toEqual([
      'Entidades que programan',
      'Anexo N.º 02 aprobado',
      'Anexo N.º 02 en evaluación',
      'Sin iniciar o en elaboración',
      'Días para la fecha fin rectora',
    ]);
    expect(pagina.kpis()[0].amount).toBe('2,486');
    expect(pagina.kpis()[4].amount).toBe('30');
    expect(el.querySelectorAll('siaf-kpi-card').length).toBe(5);
    expect(el.querySelectorAll('[data-detalle] tbody tr').length).toBe(10);
    expect(pagina.subtitulo()).toContain('Fecha de corte de datos: 31/05/2026');
  }));

  it('el clic en un tramo filtra por nivel y estado, y el chip lo quita; «Total» filtra solo por estado', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.elegirTramoNivel({ category: 2, series: 3 });
    fixture.detectChanges();
    expect(pagina.seleccion()).toEqual({ estado: 3, nivel: 'Gobierno Local' });
    expect(pagina.entidades().every((e) => e.nivel === 'Gobierno Local' && e.estado === 3)).toBeTrue();
    expect(pagina.chips().map((c) => c.texto)).toEqual(['Nivel: Gobierno Local', 'Estado: Aprobado']);
    // El gráfico de niveles ignora su propia selección: sigue mostrando los tres niveles.
    expect(pagina.porNivel()[0].conteo.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);

    // Otra vez el mismo tramo: quita la selección.
    pagina.elegirTramoNivel({ category: 2, series: 3 });
    expect(pagina.seleccion()).toEqual({});

    pagina.elegirTramoNivel({ category: 3, series: 0 });
    expect(pagina.seleccion()).toEqual({ estado: 0 });

    pagina.cambiarSeleccion('estado', undefined);
    expect(pagina.chips()).toEqual([]);
  }));

  it('departamento, ampliación y combos se combinan; «Borrar filtros» vuelve a todo', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.elegirDepartamento(0);
    const departamento = pagina.seleccion().departamento!;
    expect(pagina.departamentoSeleccionado()).toBe(0);
    pagina.elegirAmpliacion('Aprobada');
    pagina.cambiarCombo('nivel', 'Gobierno Local');
    expect(pagina.entidades().every((e) => e.departamento === departamento && e.ampliacion === 'Aprobada' && e.nivel === 'Gobierno Local')).toBeTrue();
    expect(pagina.filasDetalle().every((f) => f.ampliada)).toBeTrue();

    pagina.borrarFiltros();
    expect(pagina.entidades().length).toBe(2486);
    expect(pagina.valorCombo('nivel')).toBe('todos');
  }));

  it('los botones de año del orden de prelación cambian el año del monto', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const botones = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[data-anio-prelacion] [data-tag-boton]'));

    expect(botones().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    const anio1 = pagina.prelacionSeries()[0].values;
    botones()[1].click();
    fixture.detectChanges();
    expect(pagina.anioPrelacion()).toBe(1);
    expect(pagina.prelacionSeries()[0].values).not.toEqual(anio1);
    expect(botones()[1].getAttribute('aria-pressed')).toBe('true');
  }));

  it('la dona de ampliaciones tiene cuatro partes y el tramo «En evaluación» filtra las tres instancias', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    expect(pagina.ampliacionCategorias()).toEqual(['En evaluación', 'Observada', 'Aprobada', 'Rechazada']);
    expect(pagina.ampliacionEtiquetas()[2]).toBe(`Aprobada: ${pagina.ampliacionValores()[2]}`);
    expect(fixture.nativeElement.querySelector('siaf-donut-chart[data-ampliaciones]')).not.toBeNull();
    pagina.elegirTramoAmpliacion(0);
    expect(pagina.ampliacionSeleccionada()).toBe(0);
    expect(pagina.entidades().length).toBe(pagina.ampliacionValores()[0]);
    expect(pagina.entidades().every((e) => e.ampliacion?.startsWith('En evaluación'))).toBeTrue();
    pagina.elegirTramoAmpliacion(null);
    expect(pagina.seleccion().ampliacion).toBeUndefined();
  }));

  it('cambiar de periodo trae su fase vigente; ordenar y buscar actúan sobre el detalle', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.cambiarPeriodo('2025');
    tick(300);
    expect(pagina.fase()).toBe(3);
    expect(pagina.datos()?.periodo).toBe('2025');

    pagina.ordenarPor('codigo');
    const codigos = pagina.filasDetalle().map((f) => f.codigo);
    expect(codigos).toEqual([...codigos].sort());
    expect(pagina.ariaOrden('codigo')).toBe('ascending');
    pagina.ordenarPor('codigo');
    expect(pagina.ariaOrden('codigo')).toBe('descending');

    pagina.buscar('Municipalidad');
    expect(pagina.filasDetalle().every((f) => f.nombre.includes('Municipalidad'))).toBeTrue();
  }));
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { SeguimientoEntidadComponent } from './seguimiento-entidad.component';
import { SeguimientoNacionalComponent } from './seguimiento-nacional.component';

describe('SeguimientoEntidadComponent', () => {
  const providers = [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))];

  const crear = () => {
    TestBed.configureTestingModule({ imports: [SeguimientoEntidadComponent], providers });
    const fixture = TestBed.createComponent(SeguimientoEntidadComponent);
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    return fixture;
  };

  it('abre en la fase 2 con la vista de la OA: 24 áreas usuarias, cinco KPI, la línea de tiempo y los pendientes', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const el: HTMLElement = fixture.nativeElement;

    expect(pagina.areas().length).toBe(24);
    expect(pagina.kpis().map((k) => k.title)).toEqual([
      'Anexos N.º 01 aprobados',
      'Anexos N.º 01 con ajustes notificados',
      'Necesidades remitidas a las ATE',
      'Ampliaciones de plazo de etapa',
      'Anexo N.º 02',
    ]);
    expect(pagina.kpis()[4].amount).toBe('Elaborado');
    expect(pagina.lineaDeTiempo()?.hitos.map((h) => h.label)).toEqual(['Inicio de las Etapas 1 y 3', 'Fin de la Etapa 1', 'Inicio de la Etapa 2', 'Fin de la Etapa 2', 'Fin de la Etapa 3']);
    expect(pagina.lineaDeTiempo()?.activo).toBe(3);
    expect(el.querySelector('[data-linea-tiempo] siaf-steps')).not.toBeNull();
    expect(el.querySelectorAll('[data-avance-area] tbody tr').length).toBe(24);
    expect(el.querySelector('[data-pendientes] siaf-bar-chart')).not.toBeNull();
    expect(pagina.pendientesSeries()[0].values).toEqual(pagina.pendientes().map((p) => p.cantidad));
    expect(pagina.pendientesPlazos()).toContain('Etapa 2 vence');
    expect(pagina.pendientesUrgentes()).toEqual([2]);
    expect(pagina.subtitulo()).toContain('011 - Ministerio de Educación · vista de la Oficina de Abastecimiento');
  }));

  it('la vista de un área usuaria muestra solo lo suyo, «Mi Anexo N.º 01» y sin pendientes de la OA', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.cambiarVista('AU');
    pagina.cambiarAreaVista('0021');
    fixture.detectChanges();
    expect(pagina.areas().map((a) => a.codigo)).toEqual(['0021']);
    expect(pagina.kpis()[4].title).toBe('Mi Anexo N.º 01');
    expect(pagina.kpis()[4].amount).toBe('Aprobado');
    expect(fixture.nativeElement.querySelector('[data-pendientes]')).toBeNull();
  }));

  it('los clics filtran el resumen y dejan chips: estado, área, genérica, ATE y orden', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    pagina.elegirEstado(4);
    expect(pagina.areas().every((a) => pagina.datos()!.situacion[2][a.codigo].estado === 4)).toBeTrue();
    // El gráfico de estados ignora su propia selección.
    expect(pagina.estadoAnexos().conteo.reduce((a, b) => a + b, 0) + pagina.estadoAnexos().sinAnexo).toBe(24);
    // Volver a elegir la barra emite `null` desde el gráfico.
    pagina.elegirEstado(null);
    expect(pagina.seleccion().estado).toBeUndefined();

    pagina.elegirArea('0012');
    expect(pagina.areas().map((a) => a.codigo)).toEqual(['0012']);
    expect(pagina.filasArea().length).withContext('la tabla sigue mostrando todas para elegir otra').toBe(24);
    pagina.elegirGenerica(0);
    pagina.elegirOrden(1);
    pagina.elegirAte(0);
    expect(pagina.chips().map((c) => c.clave)).toEqual(['area', 'generica', 'ate', 'orden']);

    pagina.borrarFiltros();
    expect(pagina.chips()).toEqual([]);
    expect(pagina.areas().length).toBe(24);
  }));

  it('elegir el pendiente urgente deja solo las áreas sin Anexo N.º 01 aprobado y el gráfico conserva sus cifras', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;
    const antes = pagina.pendientesSeries()[0].values;

    pagina.elegirPendiente(2);
    fixture.detectChanges();
    expect(pagina.areas().length).toBe(antes[2]);
    expect(pagina.areas().every((a) => pagina.datos()!.situacion[2][a.codigo].estado < 4)).toBeTrue();
    expect(pagina.filasArea().length).toBe(antes[2]);
    expect(pagina.pendientesSeries()[0].values).toEqual(antes);
    expect(pagina.chips().map((c) => c.texto)).toContain('Pendiente: Áreas sin Anexo N.º 01 aprobado');

    pagina.elegirPendiente(null);
    expect(pagina.areas().length).toBe(24);
    // Las necesidades estratégicas no dependen de un área: no filtran.
    pagina.elegirPendiente(3);
    expect(pagina.seleccion().pendiente).toBeUndefined();
  }));

  it('el año programado cambia los montos y la fase 3 no tiene Anexos N.º 01', fakeAsync(() => {
    const fixture = crear();
    const pagina = fixture.componentInstance;

    const anio1 = pagina.montoOrden().reduce((a, b) => a + b, 0);
    pagina.cambiarAnio('2');
    expect(pagina.montoOrden().reduce((a, b) => a + b, 0)).not.toBe(anio1);

    pagina.cambiarFase('3');
    expect(pagina.estadoAnexos().sinAnexo).toBe(24);
    expect(pagina.kpis()[4].amount).toBe('No creado');
  }));

  it('en el seguimiento, la pestaña «Resumen de la Entidad» cambia el tablero', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [SeguimientoNacionalComponent], providers });
    const fixture = TestBed.createComponent(SeguimientoNacionalComponent);
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('siaf-seguimiento-entidad')).toBeNull();
    expect(el.querySelector('[data-detalle]')).not.toBeNull();

    fixture.componentInstance.pestana.set('entidad');
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    expect(el.querySelector('siaf-seguimiento-entidad')).not.toBeNull();
    expect(el.querySelector('[data-detalle]')).toBeNull();
    expect(el.querySelector('[data-kpis-entidad]')).not.toBeNull();
  }));
});

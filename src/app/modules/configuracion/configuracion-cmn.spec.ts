import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PermissionService } from '../../core/auth/permission.service';
import { mockBackendInterceptor } from '../../mock/mock-backend.interceptor';
import { AlertaFormComponent } from './alertas/pages/alerta-form.component';
import { AlertasComponent } from './alertas/pages/alertas.component';
import { errorFechaAmpliacion } from './ampliacion-plazo/models/ampliacion-plazo.model';
import { AmpliacionPlazoComponent } from './ampliacion-plazo/pages/ampliacion-plazo.component';
import { ParametrosDplaipComponent } from './parametros-cmn/pages/parametros-dplaip.component';
import { ParametrosEntidadComponent } from './parametros-cmn/pages/parametros-entidad.component';

describe('configuraciones de alertas, ampliación de plazo y parámetros', () => {
  const pasar = (fixture: ComponentFixture<unknown>): void => {
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  };
  const crear = <T>(tipo: Type<T>): ComponentFixture<T> => {
    const fixture = TestBed.createComponent(tipo);
    pasar(fixture);
    return fixture;
  };
  const el = (f: ComponentFixture<unknown>): HTMLElement => f.nativeElement;

  let datosPrevios: string | null;
  beforeEach(() => {
    datosPrevios = localStorage.getItem('taller-siaf-rp:datos');
    localStorage.removeItem('taller-siaf-rp:datos');
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))] });
  });
  afterEach(() => {
    if (datosPrevios === null) localStorage.removeItem('taller-siaf-rp:datos');
    else localStorage.setItem('taller-siaf-rp:datos', datosPrevios);
  });

  it('alertas: con una marcada se inactiva', fakeAsync(() => {
    const f = crear(AlertasComponent);
    expect(el(f).querySelectorAll('[data-alerta]').length).toBe(1);
    f.componentInstance.marcar('alerta-1', true);
    f.componentInstance.inactivar();
    pasar(f);
    expect(f.componentInstance.alertas()[0].estado).toBe('Inactivo');
    expect(f.componentInstance.aviso()).toBe('El registro se inactivó correctamente.');
  }));

  it('crear alerta: «Grabar» señala los campos vacíos y solo con todos pide confirmar', fakeAsync(() => {
    const f = crear(AlertaFormComponent);
    f.componentInstance.grabar();
    f.detectChanges();
    expect(el(f).textContent?.split('Campo obligatorio').length).toBe(8);
    expect(f.componentInstance.modal()).toBeFalse();

    f.componentInstance.cambiar('nombre', 'Prueba');
    f.componentInstance.elegirEtapa('f1-a1-no-ate');
    f.componentInstance.cambiar('momento', 'dia-fin');
    f.componentInstance.grabar();
    f.detectChanges();
    expect(el(f).querySelector('[data-inicio]')?.textContent).toBe('01/02/2026');
    expect(f.componentInstance.modal()).toBeTrue();
  }));

  it('ampliación: Abastecimiento acepta con una fecha posterior al registro y rechaza con motivo', fakeAsync(() => {
    spyOn(TestBed.inject(PermissionService), 'currentRole').and.returnValue('reviewer');
    const f = crear(AmpliacionPlazoComponent);
    const pagina = f.componentInstance;
    const pendiente = pagina.ampliaciones().find((a) => a.situacion === 'Pendiente')!;
    expect(errorFechaAmpliacion('2026-09-20', pendiente)).toBe('Debe ser mayor a la fecha de registro');

    pagina.pedirAceptar(pendiente);
    expect(pagina.modal()).toBeNull();
    expect(pagina.errorFecha(pendiente)).toBe('Campo obligatorio');
    pagina.cambiarFecha(pendiente, '2026-11-15');
    pagina.pedirAceptar(pendiente);
    expect(pagina.modal()).toBe('aceptar');
    pagina.aceptar();
    pasar(f);
    expect(pagina.ampliaciones().find((a) => a.id === pendiente.id)).toEqual(jasmine.objectContaining({ situacion: 'Aceptado', fechaAmpliacion: '2026-11-15' }));
  }));

  it('parámetros: lo que fija la DPLAIP se ve en la Entidad, que suma sus años y elige validaciones', fakeAsync(() => {
    const dplaip = crear(ParametrosDplaipComponent);
    expect(dplaip.componentInstance.valor()).toBe('');
    dplaip.componentInstance.valor.set('4');
    dplaip.componentInstance.confirmar();
    pasar(dplaip);
    expect(dplaip.componentInstance.hayCambios()).toBeFalse();

    const entidad = crear(ParametrosEntidadComponent);
    const p = entidad.componentInstance;
    p.cambiar({ maximoAdicionales: 5 });
    entidad.detectChanges();
    expect(el(entidad).querySelector('[data-vista-previa-anios]')?.textContent).toContain('9');
    p.pestana.set('validaciones');
    p.cambiarValidacion(2, true);
    entidad.detectChanges();
    expect(Array.from(el(entidad).querySelectorAll('[data-flujo]')).map((s) => s.querySelectorAll('siaf-kpi-card').length)).toEqual([3, 4, 3]);
    p.confirmar();
    pasar(entidad);
    expect(p.hayCambios()).toBeFalse();
    expect(p.grabado()).toEqual({ aniosPredefinidos: 4, maximoAdicionales: 5, validacionAdicional: { 1: false, 2: true, 3: false } });
  }));
});

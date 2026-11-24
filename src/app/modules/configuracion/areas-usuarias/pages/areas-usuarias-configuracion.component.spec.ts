import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria } from '../models/area-usuaria.model';
import { AreasUsuariasConfiguracionComponent, MSJ_GRABADO } from './areas-usuarias-configuracion.component';

const area = (id: string, generaCmn: boolean, activo = true): AreaUsuaria =>
  ({ id, codigo: id, denominacion: `Área ${id}`, generaCmn, esAte: false, esOa: false, esMaa: false, activo }) as AreaUsuaria;

describe('AreasUsuariasConfiguracionComponent · selección y edición masiva', () => {
  let component: AreasUsuariasConfiguracionComponent;
  let render: () => HTMLElement;
  let guardar: jasmine.Spy;
  let ir: jasmine.Spy;

  beforeEach(() => {
    guardar = jasmine.createSpy('guardar').and.returnValue(of({}));
    const api = { listar: () => of([area('01', true), area('02', false), area('03', false, false)]), guardar };
    TestBed.configureTestingModule({
      imports: [AreasUsuariasConfiguracionComponent],
      providers: [provideRouter([]), { provide: AreasUsuariasApiService, useValue: api }],
    });
    ir = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(AreasUsuariasConfiguracionComponent);
    component = fixture.componentInstance;
    render = () => {
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };
    render();
  });

  it('en solo lectura muestra ✓ o «-» en cada condición y una casilla por fila', () => {
    const el = render();
    expect(el.querySelectorAll('tbody [data-marcar]').length).toBe(3);
    expect(el.querySelectorAll('[data-bandera]').length).toBe(0);
    expect(el.querySelectorAll('[data-fila="01"] siaf-icon[name="check"]').length).toBe(1);
    expect(el.querySelectorAll('[data-fila="01"] [role="img"][aria-label$=": no"]').length).toBe(3);
  });

  it('la casilla marca la fila sin abrir el detalle; el clic en la fila sí lo abre', () => {
    const el = render();
    (el.querySelector('[data-fila="02"] [data-marcar]') as HTMLElement).click();
    expect([...component.marcadas()]).toEqual(['02']);
    expect(ir).not.toHaveBeenCalled();
    (el.querySelector('[data-fila="02"]') as HTMLElement).click();
    expect(ir).toHaveBeenCalledWith(`${AREAS_USUARIAS_ROUTE}/02`);
  });

  it('el lápiz con un área abre su detalle; con un área inactiva no está disponible', () => {
    component.marcar(component.areas()[1], true);
    component.editarSeleccion();
    expect(ir).toHaveBeenCalledWith(`${AREAS_USUARIAS_ROUTE}/02`);
    expect(component.editando()).toBeFalse();

    component.marcar(component.areas()[2], true);
    expect(component.puedeEditar()).toBeFalse();
  });

  it('con varias áreas abre «Edición masiva»; Aplicar cambia el borrador y Cancelar lo descarta', () => {
    component.marcar(component.areas()[0], true);
    component.marcar(component.areas()[1], true);
    component.editarSeleccion();
    const el = render();
    expect(component.panelMasivo()).toBeTrue();
    expect(el.querySelectorAll('[data-bandera]').length).toBe(8);
    expect(el.querySelector('[data-sincronizar]')).toBeNull();
    expect(component.cambiadas()).toEqual([]);

    component.masivoGeneraCmn.set(true);
    component.aplicarMasiva();
    expect(component.cambiadas().map((a) => a.id)).toEqual(['02']);

    component.limpiarMasiva();
    expect(component.cambiadas()).toEqual([]);

    component.alternar('01', 'esOa', true);
    component.cancelarEdicion();
    expect(component.editando()).toBeFalse();
    expect(component.areas()[0].esOa).toBeFalse();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('Grabar manda solo las áreas cambiadas, vuelve a solo lectura y avisa', () => {
    component.marcar(component.areas()[0], true);
    component.marcar(component.areas()[1], true);
    component.editarSeleccion();
    component.alternar('02', 'esOa', true);
    component.grabar();
    expect(guardar).toHaveBeenCalledWith([{ id: '02', generaCmn: false, esAte: false, esOa: true, esMaa: false }]);
    expect(component.editando()).toBeFalse();
    expect(component.marcadas().size).toBe(0);
    expect(component.aviso()).toBe(MSJ_GRABADO);
  });

  it('«Transferir datos» solo con una única área inactiva marcada', () => {
    expect(component.masOpciones()[0].disabled).toBeTrue();
    component.marcar(component.areas()[2], true);
    expect(component.masOpciones()[0].disabled).toBeFalse();
    component.onMasOpciones('transferir');
    expect(ir).toHaveBeenCalledWith(`${AREAS_USUARIAS_ROUTE}/03/transferir`);
  });
});

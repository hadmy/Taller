import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { FechasFaseCmnDplaipApiService } from '../api/fechas-fase-cmn-dplaip-api.service';
import { FECHAS_FASE_CMN_DPLAIP_ROUTE } from '../config/fechas-fase-cmn-dplaip.rutas';
import { FechaFaseCmnDplaipFormComponent } from './fecha-fase-cmn-dplaip-form.component';

describe('FechaFaseCmnDplaipFormComponent · editar', () => {
  const ANIO = new Date().getFullYear();
  const fase = (mes: string) => ({ inicio: `${ANIO}-${mes}-01`, fin: `${ANIO}-${mes}-20` });

  function crear(anio: string) {
    const guardar = jasmine.createSpy('guardar').and.returnValue(of({}));
    const anios = [{ id: '1', anio: ANIO, estado: 'En Proceso', fase1: fase('01'), fase2: fase('05'), fase3: fase('09') }];
    TestBed.configureTestingModule({
      imports: [FechaFaseCmnDplaipFormComponent],
      providers: [
        provideRouter([]),
        { provide: FechasFaseCmnDplaipApiService, useValue: { listar: () => of(anios), guardar } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ anio }) } } },
      ],
    });
    const ir = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(FechaFaseCmnDplaipFormComponent);
    const aviso = () => {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector('[data-sin-modificaciones]');
    };
    fixture.detectChanges();
    return { c: fixture.componentInstance, aviso, guardar, ir };
  }

  it('sin cambios avisa, no deja grabar y «Cancelar» vuelve a la lista', () => {
    const { c, aviso, guardar, ir } = crear(String(ANIO));
    expect(aviso()?.textContent).toContain('No se realizó ninguna modificación');
    expect(c.puedeGrabar()).toBeFalse();
    c.grabar();
    expect(c.modalGrabarAbierto()).toBeFalse();
    c.confirmarGrabar();
    expect(guardar).not.toHaveBeenCalled();
    c.cancelar();
    expect(ir).toHaveBeenCalledWith(FECHAS_FASE_CMN_DPLAIP_ROUTE);
  });

  it('al cambiar una fecha deja grabar; al devolverla a su valor vuelve a avisar', () => {
    const { c, aviso } = crear(String(ANIO));
    c.actualizarFase('fase3', 'fin', `${ANIO}-09-25`);
    expect(aviso()).toBeNull();
    expect(c.puedeGrabar()).toBeTrue();
    c.actualizarFase('fase3', 'fin', `${ANIO}-09-20`);
    expect(aviso()).not.toBeNull();
    expect(c.puedeGrabar()).toBeFalse();
  });

  it('un año nuevo se graba sin ese aviso', () => {
    const { c, aviso } = crear(String(ANIO + 1));
    expect(aviso()).toBeNull();
    expect(c.puedeGrabar()).toBeTrue();
  });
});

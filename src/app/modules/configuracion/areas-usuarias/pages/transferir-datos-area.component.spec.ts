import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AREAS_USUARIAS_ROUTE } from '../config/areas-usuarias.rutas';
import { AreaUsuaria, AreaUsuariaItem } from '../models/area-usuaria.model';
import { TransferirDatosAreaComponent } from './transferir-datos-area.component';

const area = (id: string, denominacion: string, activo = true): AreaUsuaria =>
  ({ id, codigo: id, denominacion, generaCmn: true, esAte: false, esOa: false, esMaa: false, activo }) as AreaUsuaria;
const item = (id: string): AreaUsuariaItem =>
  ({ id, areaUsuariaId: 'mp', tipo: 'puede-pedir', commodity: id, descripcionCommodity: 'C', item: id, descripcionItem: 'I', vigente: true }) as AreaUsuariaItem;

describe('TransferirDatosAreaComponent', () => {
  let component: TransferirDatosAreaComponent;
  let transferir: jasmine.Spy;

  beforeEach(() => {
    transferir = jasmine.createSpy('transferir').and.returnValue(of({ transferidos: 2 }));
    const mesa = area('mp', 'MESA DE PARTES', false);
    const api = {
      obtenerDetalle: () => of({ area: mesa, items: [item('i1'), item('i2'), item('i3')] }),
      listar: () => of([area('sg', 'SECRETARÍA GENERAL'), mesa, area('in', 'OTRA INACTIVA', false)]),
      transferir,
    };
    TestBed.configureTestingModule({
      imports: [TransferirDatosAreaComponent],
      providers: [
        provideRouter([]),
        { provide: AreasUsuariasApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ areaId: 'mp' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(TransferirDatosAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('ofrece como destino solo las áreas activas distintas del origen', () => {
    expect(component.opcionesDestino().map((o) => o.label)).toEqual(['SECRETARÍA GENERAL']);
  });

  it('«Grabar» exige destino y al menos un registro; al confirmar transfiere y vuelve a la lista con aviso', () => {
    const ir = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    expect(component.puedeGrabar()).toBeFalse();
    component.elegirDestino('sg');
    component.alternar('i2', true);
    component.alternar('i3', true);
    expect(component.puedeGrabar()).toBeTrue();

    component.pedirGrabar();
    expect(component.modalGrabar()).toBeTrue();
    component.confirmarGrabar();

    expect(transferir).toHaveBeenCalledWith('mp', 'sg', ['i2', 'i3']);
    expect(ir).toHaveBeenCalledWith(AREAS_USUARIAS_ROUTE, { state: { aviso: 'Se transfirieron 2 registros a SECRETARÍA GENERAL' } });
  });

  it('«todas» marca y desmarca todos los registros', () => {
    component.alternarTodas(true);
    expect(component.todas()).toBeTrue();
    component.alternarTodas(false);
    expect(component.seleccion().size).toBe(0);
  });
});

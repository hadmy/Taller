import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { FechasFaseCmnEntidadApiService } from '../api/fechas-fase-cmn-entidad-api.service';
import { etapasFaseVacia } from '../models/fecha-fase-cmn.model';
import { FechaFaseCmnEntidadFormComponent } from './fecha-fase-cmn-entidad-form.component';

describe('FechaFaseCmnEntidadFormComponent', () => {
  const ANIO = new Date().getFullYear();

  function crear() {
    const fase1 = { ...etapasFaseVacia(), etapa1: { inicio: `${ANIO}-01-01`, fin: `${ANIO}-03-15` } };
    const anios = [{ id: '1', anio: ANIO, estado: 'En Proceso', fase1, fase2: etapasFaseVacia(), fase3: etapasFaseVacia() }];
    TestBed.configureTestingModule({
      imports: [FechaFaseCmnEntidadFormComponent],
      providers: [
        provideRouter([]),
        { provide: FechasFaseCmnEntidadApiService, useValue: { listar: () => of(anios) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    });
    const fixture = TestBed.createComponent(FechaFaseCmnEntidadFormComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('un año nuevo abre sin fechas en ninguna etapa', () => {
    const c = crear();
    c.seleccionarAnio(String(ANIO + 1));
    for (const fase of [c.fase1(), c.fase2(), c.fase3()]) expect(fase).toEqual(etapasFaseVacia());
    expect(c.rangoResumen('fase1')).toBe('');
  });

  it('un año grabado carga sus fechas y, al pasar a uno nuevo, se limpian', () => {
    const c = crear();
    c.seleccionarAnio(String(ANIO));
    expect(c.valor('fase1', 'etapa1', 'fin')).toBe(`${ANIO}-03-15`);
    c.seleccionarAnio(String(ANIO + 1));
    expect(c.valor('fase1', 'etapa1', 'fin')).toBe('');
  });
});

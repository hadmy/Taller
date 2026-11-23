import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AreasUsuariasApiService } from '../api/areas-usuarias-api.service';
import { AreaUsuaria } from '../models/area-usuaria.model';
import { AreasUsuariasConfiguracionComponent } from './areas-usuarias-configuracion.component';

const area = (id: string, generaCmn: boolean): AreaUsuaria =>
  ({ id, codigo: id, denominacion: `Área ${id}`, generaCmn, esAte: false, esOa: false, esMaa: false }) as AreaUsuaria;

describe('AreasUsuariasConfiguracionComponent · selección masiva de ¿Genera CMN?', () => {
  let component: AreasUsuariasConfiguracionComponent;
  let checkbox: () => HTMLInputElement | null;

  beforeEach(() => {
    const api = { listar: () => of([area('01', true), area('02', false), area('03', false)]) };
    TestBed.configureTestingModule({
      imports: [AreasUsuariasConfiguracionComponent],
      providers: [provideRouter([]), { provide: AreasUsuariasApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(AreasUsuariasConfiguracionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    checkbox = () => {
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('[data-genera-cmn-todas]');
    };
  });

  it('solo aparece en edición y empieza en estado intermedio', () => {
    expect(checkbox()).toBeNull();
    component.editar();
    expect(checkbox()).not.toBeNull();
    expect(checkbox()!.indeterminate).toBeTrue();
    expect(checkbox()!.checked).toBeFalse();
  });

  it('marca y desmarca todas las áreas editables, y deja cambios por grabar', () => {
    component.editar();
    component.alternarGeneraCmnMasivo(true);
    expect(component.borrador().every((a) => a.generaCmn)).toBeTrue();
    expect(checkbox()!.checked).toBeTrue();
    expect(component.huboCambios()).toBeTrue();

    component.alternarGeneraCmnMasivo(false);
    expect(component.borrador().some((a) => a.generaCmn)).toBeFalse();
    expect(checkbox()!.checked).toBeFalse();
  });

  it('respeta la búsqueda y la edición de solo las áreas elegidas con el lápiz', () => {
    component.editar(new Set(['02', '03']));
    component.filtrar('03');
    component.alternarGeneraCmnMasivo(true);
    const porId = new Map(component.borrador().map((a) => [a.id, a.generaCmn]));
    expect(porId.get('01')).toBeTrue();
    expect(porId.get('02')).toBeFalse();
    expect(porId.get('03')).toBeTrue();
  });
});

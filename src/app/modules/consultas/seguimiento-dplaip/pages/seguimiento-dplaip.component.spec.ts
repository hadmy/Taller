import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockBackendInterceptor } from '../../../../mock/mock-backend.interceptor';
import { SeguimientoDplaipComponent } from './seguimiento-dplaip.component';

const PARAMETROS = { periodo: '2026', anexo: '01', fase: '2' };

describe('SeguimientoDplaipComponent', () => {
  let fixture: ComponentFixture<SeguimientoDplaipComponent>;
  const pagina = (): SeguimientoDplaipComponent => fixture.componentInstance;
  const el = (): HTMLElement => fixture.nativeElement;
  const pasar = (): void => {
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SeguimientoDplaipComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    fixture = TestBed.createComponent(SeguimientoDplaipComponent);
  });

  it('abre sin consultar y, con los parámetros aplicados, trae las 2,486 Entidades', fakeAsync(() => {
    pasar();
    expect(el().querySelector('[data-consulta-vacia]')?.textContent).toContain('periodo y fase');

    pagina().consultar(PARAMETROS);
    pasar();
    expect(pagina().resultado()?.rows.length).toBe(2486);
    expect(el().querySelector('[data-nota-resultado]')?.textContent).toContain('30 días para la fecha fin rectora');
    expect(el().querySelector('[data-parametros]')?.textContent).toContain('Todos');
    expect(pagina().config().columns.map((c) => c.label)).toContain('Estado del Anexo N° 01');
    pagina().consultar({ ...PARAMETROS, anexo: '02' });
    expect(pagina().config().columns.map((c) => c.label)).toContain('Estado del Anexo N° 02');
  }));

  it('la selección en los gráficos y los filtros avanzados acotan el detalle', fakeAsync(() => {
    pagina().consultar(PARAMETROS);
    pasar();
    pagina().seleccion.set({ nivel: 'Gobierno Local', estado: 'Elaborado' });
    pasar();
    expect(el().querySelector('[data-filtros-seleccion]')?.textContent).toContain('Gobierno Local');
    expect(pagina().resultado()?.rows.every((f) => f['nivel'] === 'Gobierno Local' && ['Elaborado', 'Observado'].includes(f['estado']))).toBeTrue();

    pagina().seleccion.set({});
    pagina().aplicarCondiciones([{ campo: 'departamento', operador: 'eq', valor: 'Lima' }]);
    expect(pagina().resultado()?.rows.every((f) => f['departamento'] === 'Lima')).toBeTrue();
    pagina().quitarCondicion(0);
    expect(pagina().resultado()?.rows.length).toBe(2486);
  }));

  it('el enlace de la Entidad abre su ficha, con las tres fases', fakeAsync(() => {
    pagina().consultar(PARAMETROS);
    pasar();
    pagina().ficha.set(pagina().resultado()!.rows[0]['codigo']);
    pasar();
    const texto = el().querySelector('[data-ficha-entidad]')?.textContent ?? '';
    expect(texto).toContain('Fase 1 · Identificación');
    expect(texto).toContain('Fase 3 · Consolidación y Aprobación');
    expect(texto).toContain('Días restantes');
  }));

  it('un favorito vuelve a aplicar sus parámetros y condiciones, y lo dice bajo el título', fakeAsync(() => {
    pasar();
    pagina().aplicarFavorito({
      id: 'f1', nombre: 'Seguimiento local', predeterminado: false,
      parametros: { ...PARAMETROS, nivel: 'Gobierno Local' }, condiciones: [{ campo: 'estado', operador: 'eq', valor: 'Pendiente' }],
    });
    pasar();
    expect(pagina().config().subtitle).toBe('Favorito: Seguimiento local');
    expect(pagina().resultado()?.rows.every((f) => f['nivel'] === 'Gobierno Local' && f['estado'] === 'Pendiente')).toBeTrue();
    pagina().consultar(PARAMETROS);
    expect(pagina().config().subtitle).toBeUndefined();
    tick(300);
  }));
});

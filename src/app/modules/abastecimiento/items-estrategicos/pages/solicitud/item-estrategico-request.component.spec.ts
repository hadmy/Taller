import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ItemEstrategicoRequestComponent } from './item-estrategico-request.component';

describe('ItemEstrategicoRequestComponent · registro', () => {
  const ITEMS = [
    { codigo: '4215271000022011', descripcion: 'Desfibrilador Portátil' },
    { codigo: '4215281500033022', descripcion: 'Analgésico Intravenoso' },
  ];

  function crear() {
    TestBed.configureTestingModule({
      imports: [ItemEstrategicoRequestComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ItemEstrategicoRequestComponent);
    const el = () => {
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };
    return { c: fixture.componentInstance, el };
  }

  it('la tarjeta abre con la lupa y, sin necesidades, no se puede grabar', () => {
    const { c, el } = crear();
    expect(el().querySelector('[data-abrir-panel]')).not.toBeNull();
    expect(el().querySelectorAll('[data-necesidad]').length).toBe(0);
    expect(c.formValido()).toBeFalse();
    expect(c.tipoAccion).toBe('Creación');
    expect(c.camposEntidad().map((f) => f.label)).toEqual(['Fecha', 'Ente rector', 'Entidad']);
  });

  it('lista las necesidades por código y descripción, y se quitan de a una o en bloque', () => {
    const { c, el } = crear();
    el();
    c.items.set(ITEMS);
    expect(el().querySelectorAll('[data-necesidad]').length).toBe(2);
    expect(el().textContent).not.toContain('Cantidad de necesidades');
    expect(c.formValido()).toBeTrue();
    c.quitarItem(ITEMS[0].codigo);
    expect(c.items()).toEqual([ITEMS[1]]);
    c.marcarPaginaItems(true);
    c.quitarMarcados();
    expect(c.items()).toEqual([]);
  });
});

import { TestBed } from '@angular/core/testing';

import { EditarServicioBasicoPanelComponent } from './editar-servicio-basico-panel.component';

describe('EditarServicioBasicoPanelComponent · Agregar entidades', () => {
  const ENTIDADES = [
    { id: 'e1', codigo: '240101', nombre: 'Municipalidad Provincial de Tumbes' },
    { id: 'e2', codigo: '240102', nombre: 'Municipalidad Distrital de Corrales' },
    { id: 'e3', codigo: '240301', nombre: 'Municipalidad Provincial de Zarumilla' },
  ];

  it('la casilla bajo el buscador queda indeterminada con algunas entidades y marca o desmarca las visibles', () => {
    TestBed.configureTestingModule({ imports: [EditarServicioBasicoPanelComponent] });
    const fixture = TestBed.createComponent(EditarServicioBasicoPanelComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('entidades', ENTIDADES);
    fixture.componentRef.setInput('servicio', { id: 's1', codigo: '1', descripcion: 'Agua', entidades: [] });
    c.abrirAgregar();
    fixture.detectChanges();
    const casilla = () => {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('[aria-label="Seleccionar todas las entidades"]')!;
    };

    expect(casilla().checked || casilla().indeterminate).toBeFalse();
    c.elegidas.set(['e1', 'e2']);
    expect(casilla().indeterminate).toBeTrue();

    c.elegirVisibles(true);
    expect(casilla().checked).toBeTrue();
    expect(casilla().indeterminate).toBeFalse();

    // Con búsqueda, solo afecta a las visibles.
    c.busqueda.set('zarumilla');
    c.elegirVisibles(false);
    expect(c.elegidas()).toEqual(['e1', 'e2']);
    expect(casilla().indeterminate).toBeTrue();
  });
});

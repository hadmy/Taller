import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HistorialRegistroItemPanelComponent } from './historial-registro-item-panel.component';

describe('HistorialRegistroItemPanelComponent', () => {
  it('muestra la solicitud que creó el registro, el ítem y quién la aprobó', () => {
    TestBed.configureTestingModule({
      imports: [HistorialRegistroItemPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(HistorialRegistroItemPanelComponent);
    fixture.componentRef.setInput('registro', {
      id: 'rie-1', codigo: '4215271000022011', descripcion: 'Desfibrilador portátil', vigente: true, entidadSiglas: 'MEF',
      documentoId: 'sol-1', numeroDocumento: '00001', fechaRegistro: '2026-10-12T13:00:59.000Z',
    });
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/solicitudes/sol-1')).flush({
      id: 'sol-1',
      historialEstados: [
        { estadoNuevo: 'ELABORADO', createdAt: '2026-10-10T13:00:59.000Z', creador: { nombres: 'Ana', apellidoPaterno: 'Uno', apellidoMaterno: 'Dos' } },
        { estadoNuevo: 'APROBADO', createdAt: '2026-10-12T13:00:59.000Z', creador: { nombres: 'Luis', apellidoPaterno: 'Tres', apellidoMaterno: 'Cuatro' } },
      ],
    });
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const parte of ['00001', 'Creación', 'Activo', '4215271000022011', 'Desfibrilador portátil', 'ANA UNO DOS', 'LUIS TRES CUATRO']) {
      expect(texto).toContain(parte);
    }
  });
});

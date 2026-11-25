import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SERVICIOS_BASICOS_EXCLUIDOS_ROUTE } from '../servicios-basicos-excluidos/config/servicios-basicos-excluidos.rutas';
import { ConfiguracionTabsComponent } from './configuracion-tabs.component';

describe('ConfiguracionTabsComponent', () => {
  it('cada pestaña con pantalla abre su configuración; las demás quedan deshabilitadas', () => {
    TestBed.configureTestingModule({ imports: [ConfiguracionTabsComponent], providers: [provideRouter([])] });
    const ir = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(ConfiguracionTabsComponent);
    fixture.componentRef.setInput('activa', 'areas-usuarias');
    fixture.detectChanges();
    const tabs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'));

    expect(tabs.length).toBe(8);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs.filter((t) => t.getAttribute('aria-disabled')).map((t) => t.innerText.trim())).toEqual(['Alertas', 'Ampliación de fecha']);

    tabs[1].click();
    expect(ir).toHaveBeenCalledOnceWith(SERVICIOS_BASICOS_EXCLUIDOS_ROUTE);
    tabs[6].click();
    expect(ir).toHaveBeenCalledTimes(1);
  });
});

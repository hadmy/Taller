import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ALERTAS_ROUTE } from '../alertas/config/alertas.rutas';
import { SERVICIOS_BASICOS_EXCLUIDOS_ROUTE } from '../servicios-basicos-excluidos/config/servicios-basicos-excluidos.rutas';
import { ConfiguracionTabsComponent } from './configuracion-tabs.component';

describe('ConfiguracionTabsComponent', () => {
  it('las diez pestañas abren su configuración', () => {
    TestBed.configureTestingModule({ imports: [ConfiguracionTabsComponent], providers: [provideRouter([])] });
    const ir = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(ConfiguracionTabsComponent);
    fixture.componentRef.setInput('activa', 'areas-usuarias');
    fixture.detectChanges();
    const tabs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'));

    expect(tabs.length).toBe(10);
    expect(tabs.slice(6).map((t) => t.innerText.trim())).toEqual(['Alertas', 'Ampliación de fecha', 'Parámetros DPLAIP', 'Parámetros Entidad']);
    expect(tabs.some((t) => t.getAttribute('aria-disabled'))).toBeFalse();
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    tabs[1].click();
    expect(ir).toHaveBeenCalledOnceWith(SERVICIOS_BASICOS_EXCLUIDOS_ROUTE);
    tabs[6].click();
    expect(ir).toHaveBeenCalledWith(ALERTAS_ROUTE);
  });
});

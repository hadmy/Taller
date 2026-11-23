import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import type { ChartDataset } from 'chart.js';

import { DonutChartComponent } from './donut-chart.component';

@Component({
  standalone: true,
  imports: [DonutChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <siaf-donut-chart [categories]="categorias()" [values]="valores()" ariaLabel="Composición del balance" categoryLabel="Rubro" />
  `,
})
class AnfitrionComponent {
  readonly categorias = signal<string[]>(['Activos', 'Patrimonio', 'Pasivos']);
  readonly valores = signal<number[]>([450, 300, 250]);
}

describe('DonutChartComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;
  let temaPrevio: string | null;
  const q = <T extends HTMLElement>(selector: string): T | null => fixture.nativeElement.querySelector(selector);
  const lienzo = (): HTMLCanvasElement => q<HTMLCanvasElement>('canvas')!;
  const grafico = (): Chart<'doughnut'> => Chart.getChart(lienzo()) as Chart<'doughnut'>;
  const conjunto = (): ChartDataset<'doughnut'> => grafico().data.datasets[0];
  const tecla = (key: string): KeyboardEvent => {
    const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    lienzo().dispatchEvent(evento);
    fixture.detectChanges();
    return evento;
  };
  const centro = (): string | null => {
    const caja = q('[data-centro]');
    return caja ? Array.from(caja.querySelectorAll('p')).map((parrafo) => parrafo.textContent?.trim()).join(' ') : null;
  };
  const anuncio = (): string => q('[aria-live="polite"]')?.textContent?.trim() ?? '';
  const colorDe = (token: string): string => {
    const sonda = document.createElement('span');
    sonda.style.color = `var(${token})`;
    document.body.appendChild(sonda);
    const color = getComputedStyle(sonda).color;
    sonda.remove();
    return color;
  };

  beforeEach(async () => {
    temaPrevio = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    await TestBed.configureTestingModule({ imports: [AnfitrionComponent] }).compileComponents();
    fixture = TestBed.createComponent(AnfitrionComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
    if (temaPrevio === null) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', temaPrevio);
  });

  it('dibuja una dona de Chart.js de 150 px con los tramos en el orden de colores del Figma', () => {
    const g = grafico();
    expect((g.config as { type: string }).type).toBe('doughnut');
    expect(g.data.labels).toEqual(['Activos', 'Patrimonio', 'Pasivos']);
    expect(conjunto().data).toEqual([450, 300, 250]);
    expect(conjunto().backgroundColor).toEqual([
      colorDe('--sys-color-bg-brand-primary'),
      colorDe('--sys-color-bg-feedback-dark-success'),
      colorDe('--sys-color-bg-feedback-dark-warning'),
    ]);
    expect(g.options.radius).toBe(75);
    expect(g.options.cutout).toBe('70%');
    expect(conjunto().borderWidth).toBe(0);
  });

  it('la leyenda nombra cada parte con su color y la tabla oculta muestra el valor y el porcentaje', () => {
    const leyenda = Array.from(fixture.nativeElement.querySelectorAll('siaf-chart-legend li')).map((li) => (li as HTMLElement).textContent?.trim());
    expect(leyenda).toEqual(['Activos', 'Patrimonio', 'Pasivos']);

    const tabla = q<HTMLTableElement>('table')!;
    const celdas = (fila: Element): string[] => Array.from(fila.children).map((celda) => celda.textContent?.trim() ?? '');
    expect(tabla.caption?.textContent?.trim()).toBe('Composición del balance');
    expect(celdas(tabla.tHead!.rows[0])).toEqual(['Rubro', 'Valor', 'Porcentaje']);
    expect(celdas(tabla.tBodies[0].rows[0])).toEqual(['Activos', '450', '45.0%']);
    expect(celdas(tabla.tBodies[0].rows[2])).toEqual(['Pasivos', '250', '25.0%']);
  });

  it('teclado: las flechas activan un tramo, que se engrosa, y el centro muestra su nombre y su porcentaje; Escape lo oculta', () => {
    expect(centro()).withContext('sin tramo activo el centro está vacío, como el Figma').toBeNull();
    lienzo().focus();
    expect(tecla('ArrowRight').defaultPrevented).toBeTrue();
    expect(centro()).toBe('Activos 45.0%');
    expect(anuncio()).toBe('Activos: 45.0% (450)');
    expect(grafico().getActiveElements().map((activo) => activo.index)).toEqual([0]);
    expect(conjunto().hoverBorderWidth).withContext('el tramo activo se engrosa con un borde de su color').toBe(10);

    tecla('ArrowLeft');
    expect(centro()).withContext('da la vuelta al último').toBe('Pasivos 25.0%');
    tecla('Home');
    expect(centro()).toContain('Activos');

    expect(tecla('Escape').defaultPrevented).toBeFalse();
    expect(centro()).toBeNull();
  });

  it('con el puntero, el centro no parpadea: sobre el borde interior del tramo activo sigue mostrando el porcentaje', async () => {
    const moverPuntero = async (x: number, y: number): Promise<void> => {
      const caja = lienzo().getBoundingClientRect();
      lienzo().dispatchEvent(new MouseEvent('mousemove', { clientX: caja.left + x, clientY: caja.top + y, bubbles: true }));
      // Chart.js atiende el puntero en el cuadro siguiente.
      await new Promise((resolver) => requestAnimationFrame(() => setTimeout(resolver)));
      fixture.detectChanges();
    };
    const arco = grafico().getDatasetMeta(0).data[0];
    const { x, y, startAngle, endAngle, innerRadius, outerRadius } = arco.getProps(['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'], true);
    const medio = (startAngle + endAngle) / 2;
    const punto = (distancia: number): [number, number] => [x + Math.cos(medio) * distancia, y + Math.sin(medio) * distancia];

    // A 2 px del borde interior: justo lo que Chart.js dejaba afuera al engrosarse el tramo activo.
    for (let vez = 1; vez <= 3; vez++) {
      await moverPuntero(...punto(innerRadius + 2));
      expect(centro()).withContext(`movimiento ${vez}`).toBe('Activos 45.0%');
    }
    await moverPuntero(...punto(outerRadius + 3));
    expect(centro()).withContext('el margen alcanza al tramo engrosado').toBe('Activos 45.0%');
    await moverPuntero(x, y);
    expect(centro()).withContext('en el hueco del anillo no hay tramo').toBeNull();
  });

  it('una parte sin valor positivo no dibuja tramo ni muestra centro, y se anuncia sin datos', () => {
    fixture.componentInstance.valores.set([450, 0, 250]);
    fixture.detectChanges();
    expect(conjunto().data).toEqual([450, 0, 250]);

    lienzo().focus();
    tecla('ArrowRight');
    tecla('ArrowRight');
    expect(anuncio()).toBe('Patrimonio: sin datos');
    expect(centro()).toBeNull();
    tecla('End');
    expect(centro()).toBe('Pasivos 35.7%');
  });

  it('al cambiar de tema vuelve a leer los colores de los tramos', async () => {
    const claros = conjunto().backgroundColor as string[];
    document.documentElement.setAttribute('data-theme', 'dark');
    await new Promise((resolver) => setTimeout(resolver));
    expect(conjunto().backgroundColor).not.toEqual(claros);
    expect((conjunto().backgroundColor as string[])[0]).toBe(colorDe('--sys-color-bg-brand-primary'));
  });
});

@Component({
  standalone: true,
  imports: [DonutChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <siaf-donut-chart
      [categories]="categorias"
      [values]="valores"
      [selectable]="true"
      [selectedIndex]="elegido()"
      (categorySelected)="elegido.set($event)"
    />
  `,
})
class AnfitrionSeleccionComponent {
  readonly categorias = ['Aprobada', 'Observada', 'Rechazada'];
  readonly valores = [5, 3, 2];
  readonly elegido = signal<number | null>(null);
}

describe('DonutChartComponent con selección', () => {
  it('Enter elige el tramo activo, atenúa los demás y volver a elegirlo quita la selección', () => {
    const fixture = TestBed.createComponent(AnfitrionSeleccionComponent);
    fixture.detectChanges();
    const lienzo: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    const tecla = (key: string): void => {
      lienzo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };

    tecla('ArrowRight');
    tecla('Enter');
    expect(fixture.componentInstance.elegido()).toBe(0);
    const colores = (Chart.getChart(lienzo) as Chart<'doughnut'>).data.datasets[0].backgroundColor as string[];
    expect(colores[0]).not.toContain('0.3)');
    expect(colores[1]).toContain('0.3)');

    // Al repintar, el teclado vuelve al inicio: la flecha lleva otra vez al primer tramo.
    tecla('ArrowRight');
    tecla('Enter');
    expect(fixture.componentInstance.elegido()).toBeNull();
  });
});

@Component({
  standalone: true,
  imports: [DonutChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<siaf-donut-chart variant="pie" [categories]="categorias" [values]="valores" />`,
})
class AnfitrionTortaComponent {
  readonly categorias = ['Aprobada: 5', 'Observada: 3'];
  readonly valores = [5, 3];
}

describe('DonutChartComponent en torta', () => {
  it('es una torta llena, con la leyenda en columna y sin el centro del anillo', () => {
    const fixture = TestBed.createComponent(AnfitrionTortaComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const grafico = Chart.getChart(el.querySelector('canvas')!) as Chart<'doughnut'>;
    expect(grafico.options.cutout).toBe(0);
    expect(el.querySelector('figure')!.classList).toContain('flex-row-reverse');
    expect(el.querySelector('siaf-chart-legend ul')!.classList).toContain('flex-col');
    expect(el.querySelector('[data-centro]')).toBeNull();
  });
});

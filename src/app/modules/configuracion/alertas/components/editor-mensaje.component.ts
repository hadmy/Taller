import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';

import { IconComponent } from '../../../../shared/ui/icon/icon.component';

interface AccionEditor {
  comando: string;
  icono: string;
  etiqueta: string;
  valor?: string;
}

const GRUPOS: AccionEditor[][] = [
  [
    { comando: 'foreColor', icono: 'format_color_text', etiqueta: 'Color institucional' },
    { comando: 'removeFormat', icono: 'format_clear', etiqueta: 'Quitar formato' },
  ],
  [
    { comando: 'bold', icono: 'format_bold', etiqueta: 'Negrita' },
    { comando: 'italic', icono: 'format_italic', etiqueta: 'Cursiva' },
    { comando: 'underline', icono: 'format_underlined', etiqueta: 'Subrayado' },
    { comando: 'strikeThrough', icono: 'strikethrough_s', etiqueta: 'Tachado' },
  ],
  [
    { comando: 'justifyLeft', icono: 'format_align_left', etiqueta: 'Alinear a la izquierda' },
    { comando: 'justifyCenter', icono: 'format_align_center', etiqueta: 'Centrar' },
    { comando: 'justifyRight', icono: 'format_align_right', etiqueta: 'Alinear a la derecha' },
  ],
  [
    { comando: 'insertOrderedList', icono: 'format_list_numbered', etiqueta: 'Lista numerada' },
    { comando: 'insertUnorderedList', icono: 'format_list_bulleted', etiqueta: 'Lista con viñetas' },
  ],
];

/** Tamaños del texto y su valor en `execCommand('fontSize')`. */
const TAMANOS = [
  { texto: '12', valor: '2' },
  { texto: '14', valor: '3' },
  { texto: '18', valor: '4' },
  { texto: '24', valor: '5' },
];
/** Están en el diseño; el taller no guarda archivos ni enlaces. */
const NO_DISPONIBLES = [
  { icono: 'image', etiqueta: 'Insertar imagen' },
  { icono: 'link', etiqueta: 'Insertar enlace' },
];

/**
 * Editor del mensaje de una alerta (Figma A.7-RC-009): formato básico y contador de caracteres. Lo escrito se pega sin
 * formato y entrega HTML; al mostrarlo, Angular lo limpia.
 */
@Component({
  selector: 'siaf-editor-mensaje',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="rounded-siaf-md border border-[var(--sys-color-divider-strong)]">
      <div class="flex flex-wrap items-center rounded-t-siaf-md bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-xs" role="toolbar" aria-label="Formato del mensaje">
        <div class="flex border-r border-[var(--sys-color-divider-default)] pr-siaf-xxs">
          <select
            class="h-10 rounded-siaf-sm bg-transparent px-siaf-xs text-sm text-[var(--sys-color-text-neutral-medium)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
            aria-label="Tamaño del texto"
            (mousedown)="recordarSeleccion()"
            (change)="aplicarTamano($any($event.target).value)"
          >
            @for (t of tamanos; track t.valor) {
              <option [value]="t.valor" [selected]="t.texto === '14'">{{ t.texto }}</option>
            }
          </select>
        </div>
        @for (grupo of grupos; track $index) {
          <div class="flex border-r border-[var(--sys-color-divider-default)] px-siaf-xxs last:border-r-0">
            @for (a of grupo; track a.comando) {
              <button
                class="inline-flex size-10 items-center justify-center rounded-siaf-sm text-[var(--sys-color-text-neutral-medium)] hover:bg-surface-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
                type="button"
                [attr.aria-label]="a.etiqueta"
                [title]="a.etiqueta"
                (mousedown)="$event.preventDefault()"
                (click)="aplicar(a)"
              >
                <siaf-icon [name]="a.icono" [size]="20" />
              </button>
            }
          </div>
        }
        <div class="flex px-siaf-xxs">
          @for (a of noDisponibles; track a.icono) {
            <button class="inline-flex size-10 items-center justify-center text-[var(--sys-color-text-neutral-disabled)]" type="button" disabled [attr.aria-label]="a.etiqueta" [title]="a.etiqueta + ' (no disponible en la demo)'">
              <siaf-icon [name]="a.icono" [size]="20" />
            </button>
          }
        </div>
      </div>
      <div
        #area
        class="min-h-24 px-siaf-md py-siaf-sm text-sm leading-normal text-[var(--sys-color-text-neutral-high)] outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--sys-color-border-states-focus)] [&_font[size='2']]:text-xs [&_font[size='3']]:text-sm [&_ol]:list-decimal [&_ol]:pl-siaf-lg [&_p]:my-siaf-xs [&_ul]:list-disc [&_ul]:pl-siaf-lg"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        aria-label="Mensaje de la notificación"
        (input)="emitir()"
        (beforeinput)="limitar($event)"
        (paste)="pegar($event)"
        data-editor-mensaje
      ></div>
    </div>
    <p class="m-0 mt-siaf-xxs text-right text-xs text-[var(--sys-color-text-neutral-low)]">Número de caracteres {{ cuenta() }} / {{ maximo }}</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorMensajeComponent {
  @ViewChild('area', { static: true }) private area!: ElementRef<HTMLElement>;

  readonly grupos = GRUPOS;
  readonly tamanos = TAMANOS;
  readonly noDisponibles = NO_DISPONIBLES;
  /** Texto marcado antes de abrir el selector de tamaño, que se lleva el foco. */
  private seleccion: Range | null = null;
  readonly maximo = 1000;
  readonly cuenta = signal(0);

  /** Solo reescribe el área si llega otro valor: si no, el cursor saltaría al escribir. */
  @Input() set valor(html: string) {
    const el = this.area?.nativeElement;
    if (!el || el.innerHTML === html) return;
    el.replaceChildren(...this.soloFormato(html));
    this.contar();
  }
  @Output() valorCambio = new EventEmitter<string>();

  aplicar(a: AccionEditor): void {
    const el = this.area.nativeElement;
    el.focus();
    const color = getComputedStyle(el).getPropertyValue('--sys-color-text-brand-primary').trim();
    document.execCommand(a.comando, false, a.comando === 'foreColor' ? color : undefined);
    this.emitir();
  }

  recordarSeleccion(): void {
    const s = document.getSelection();
    this.seleccion = s?.rangeCount && this.area.nativeElement.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
  }

  aplicarTamano(valor: string): void {
    this.area.nativeElement.focus();
    const s = document.getSelection();
    if (this.seleccion && s) {
      s.removeAllRanges();
      s.addRange(this.seleccion);
    }
    document.execCommand('fontSize', false, valor);
    this.emitir();
  }

  limitar(evento: InputEvent): void {
    const seleccion = document.getSelection()?.toString().length ?? 0;
    const nuevo = evento.data?.length ?? (evento.inputType.startsWith('insert') ? 1 : 0);
    if (nuevo && this.largo() - seleccion + nuevo > this.maximo) evento.preventDefault();
  }

  pegar(evento: ClipboardEvent): void {
    evento.preventDefault();
    const seleccion = document.getSelection()?.toString().length ?? 0;
    const texto = (evento.clipboardData?.getData('text/plain') ?? '').slice(0, Math.max(0, this.maximo - this.largo() + seleccion));
    document.execCommand('insertText', false, texto);
  }

  emitir(): void {
    this.contar();
    this.valorCambio.emit(this.area.nativeElement.innerHTML);
  }

  private contar(): void {
    this.cuenta.set(this.largo());
  }

  private largo(): number {
    return (this.area.nativeElement.textContent ?? '').length;
  }

  /** Los nodos del HTML con solo las etiquetas del editor y sin atributos peligrosos. */
  private soloFormato(html: string): Node[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const permitidas = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'FONT', 'SPAN', 'OL', 'UL', 'LI']);
    for (const el of Array.from(doc.body.querySelectorAll('*'))) {
      if (!permitidas.has(el.tagName)) {
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const atributo of Array.from(el.attributes)) if (!['style', 'color', 'align', 'size'].includes(atributo.name)) el.removeAttribute(atributo.name);
    }
    return Array.from(doc.body.childNodes);
  }
}

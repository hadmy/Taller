/** Una etapa del CMN con sus fechas (aaaa-mm-dd), como se elige en alertas y ampliaciones de plazo. */
export interface EtapaCmn {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
}

/** Etapas del CMN (Figma A.7-RC-013), en orden. */
export const ETAPAS_CMN: readonly EtapaCmn[] = [
  { id: 'f1-a1', nombre: 'Fase 1 Anexo 01: Registro de necesidades (ATEs y no ATEs)', inicio: '2026-01-02', fin: '2026-01-31' },
  { id: 'f1-a1-no-ate', nombre: 'Fase 1 Anexo 01: Registro de necesidades (No ATEs)', inicio: '2026-02-01', fin: '2026-03-01' },
  { id: 'f1-a2', nombre: 'Fase 1 Anexo 02: Consolidación de necesidades de AU', inicio: '2026-03-02', fin: '2026-04-09' },
  { id: 'f2-a1', nombre: 'Fase 2 Anexo 01: Actualización de necesidades (ATEs y no ATEs)', inicio: '2026-09-01', fin: '2026-09-15' },
  { id: 'f2-a1-no-ate', nombre: 'Fase 2 Anexo 01: Actualización de necesidades (No ATEs)', inicio: '2026-09-16', fin: '2026-09-25' },
  { id: 'f2-a2', nombre: 'Fase 2 Anexo 02: Consolidación de necesidades de AU', inicio: '2026-09-26', fin: '2026-09-30' },
  { id: 'f3-a1', nombre: 'Fase 3 Anexo 01: Actualización de necesidades (ATEs y no ATEs)', inicio: '2026-12-16', fin: '2026-12-31' },
  { id: 'f3-a1-no-ate', nombre: 'Fase 3 Anexo 01: Actualización de necesidades (No ATEs)', inicio: '2027-01-04', fin: '2027-01-20' },
  { id: 'f3-a2', nombre: 'Fase 3 Anexo 02: Consolidación de necesidades de AU', inicio: '2027-01-21', fin: '2027-01-30' },
];

export const etapaCmn = (id: string): EtapaCmn | undefined => ETAPAS_CMN.find((e) => e.id === id);

/** aaaa-mm-dd → dd/mm/aaaa; vacía queda vacía. */
export const fechaCorta = (iso: string): string => iso.split('-').reverse().join('/');

/** Hoy en hora local, aaaa-mm-dd. */
export function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

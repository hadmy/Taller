export { fechaHora } from '../../../../shared/utils/fecha-hora.util';

/** Monto en soles con el formato del Figma: «S/ 524,600.00». */
export function formatearSoles(monto: number): string {
  return `S/ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, como el plazo del Figma («Hasta 23/08/2026»). */
export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso;
}

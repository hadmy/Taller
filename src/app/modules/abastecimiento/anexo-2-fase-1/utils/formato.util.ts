/** Fecha y hora como la cabecera de la solicitud: «19/08/2026    09:15:00»; vacía sin fecha. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const f = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}    ${dos(f.getHours())}:${dos(f.getMinutes())}:${dos(f.getSeconds())}`;
}

/** Monto en soles con el formato del Figma: «S/ 524,600.00». */
export function formatearSoles(monto: number): string {
  return `S/ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, como el plazo del Figma («Hasta 23/08/2026»). */
export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso;
}

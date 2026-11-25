/** Fecha y hora como la cabecera de una solicitud: «19/08/2026    09:15:00»; vacía sin fecha. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const f = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}    ${dos(f.getHours())}:${dos(f.getMinutes())}:${dos(f.getSeconds())}`;
}

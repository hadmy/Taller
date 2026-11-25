/** Condición de «Filtros avanzados» de un reporte. */
export interface CondicionReporte {
  campo: string;
  operador: OperadorCondicion;
  valor: string;
}

export type OperadorCondicion = 'eq' | 'neq' | 'contains' | 'not_contains' | 'starts_with';

export const OPERADORES: { value: OperadorCondicion; label: string; signo: string }[] = [
  { value: 'eq', label: '= Es igual a', signo: '=' },
  { value: 'neq', label: '≠ No es igual a', signo: '≠' },
  { value: 'contains', label: 'Contiene', signo: 'contiene' },
  { value: 'not_contains', label: 'No contiene', signo: 'no contiene' },
  { value: 'starts_with', label: 'Empieza con', signo: 'empieza con' },
];

/** Campo por el que se puede poner una condición; con opciones, el valor se elige de la lista. */
export interface CampoCondicion {
  key: string;
  label: string;
  options?: readonly string[];
}

/** Parámetros y filtros de un reporte guardados por el usuario para reutilizarlos. */
export interface FavoritoReporte {
  id: string;
  nombre: string;
  /** Se aplica solo al entrar al reporte; uno por reporte. */
  predeterminado: boolean;
  parametros: Record<string, string | string[]>;
  condiciones: CondicionReporte[];
}

const normalizar = (texto: string): string => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** La fila cumple todas las condiciones. */
export function cumpleCondiciones(fila: Record<string, string>, condiciones: readonly CondicionReporte[]): boolean {
  return condiciones.every(({ campo, operador, valor }) => {
    const celda = normalizar(fila[campo] ?? '');
    const buscado = normalizar(valor.trim());
    switch (operador) {
      case 'eq':
        return celda === buscado;
      case 'neq':
        return celda !== buscado;
      case 'contains':
        return celda.includes(buscado);
      case 'not_contains':
        return !celda.includes(buscado);
      case 'starts_with':
        return celda.startsWith(buscado);
    }
  });
}

/** «Estado del Anexo N° 01: = Pendiente». */
export function textoCondicion(c: CondicionReporte, campos: readonly CampoCondicion[]): string {
  const campo = campos.find((x) => x.key === c.campo)?.label ?? c.campo;
  return `${campo}: ${OPERADORES.find((o) => o.value === c.operador)?.signo ?? '='} ${c.valor}`;
}

/** «1 condición», «2 condiciones»; vacío sin condiciones. */
export const cuantasCondiciones = (n: number): string => (n === 0 ? '' : n === 1 ? '1 condición' : `${n} condiciones`);

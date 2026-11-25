/** Presupuestos de fase que se pueden distribuir (Figma A.6-RC-010). */
export const PRESUPUESTOS_FASE: { key: string; label: string }[] = [
  { key: 'fase1', label: 'Fase 1: APM año anterior' },
  { key: 'fase2', label: 'Fase 2: APM actual' },
  { key: 'fase3', label: 'Fase 3: PIA' },
];

/** Presupuesto recibido de una genérica de gasto, sobre el que se reparte el monto asignado por área usuaria. */
export interface DistribucionGenerica {
  codigo: string;
  presupuestoRecibido: number;
}

/** Una fila de la grilla de distribución: un área usuaria y el monto que le asigna el titular por cada genérica. */
export interface DistribucionFilaOu {
  id: string;
  codigoOu: string;
  denominacion: string;
  rol: 'AU titular' | 'AU' | 'ATE';
  esTitular: boolean;
  /** Monto asignado por genérica, con el código de la genérica (`DistribucionGenerica.codigo`) como llave. */
  montos: Record<string, number>;
}

/** Un año con la distribución interna del techo presupuestal configurada para una fase. */
export interface DistribucionInternaPresupuesto {
  id: string;
  anio: number;
  estado: 'Validado' | 'En Proceso';
  presupuestoFase: string;
  areaUsuariaTitular: { codigo: string; denominacion: string };
  entidadUe: string;
  periodo: number;
  genericas: DistribucionGenerica[];
  filas: DistribucionFilaOu[];
}

/** Código de la OU en dos partes: la última va en negrita en la grilla («A.03.01.01.» + «05-01»). */
export function partesCodigoOu(codigo: string): [string, string] {
  const corte = codigo.lastIndexOf('.') + 1;
  return [codigo.slice(0, corte), codigo.slice(corte)];
}

/** Suma de los montos asignados de una fila en sus genéricas: el «Total asignado» de la grilla. */
export function totalAsignadoFila(fila: DistribucionFilaOu): number {
  return Object.values(fila.montos).reduce((suma, monto) => suma + (monto || 0), 0);
}

import { StatusTagTone } from '../../../../shared/ui/status-tag/status-tag.component';
import { AreaModificacion, GuardarModificacionRequest, ItemModificacion } from '../models/anexo-2-fase-1.model';

const redondear = (n: number): number => Math.round(n * 100) / 100;

export type EstadoAreaModificacion = 'Sin cambios' | 'Modificada' | 'Quitada' | 'Fuera de plazo';

/** Etiqueta del estado de un área en la modificación, para `siaf-status-tag` con `appearance="soft"`. */
export const ESTILO_AREA_MODIFICACION: Record<EstadoAreaModificacion, StatusTagTone> = {
  'Sin cambios': 'default',
  Modificada: 'info',
  Quitada: 'danger',
  'Fuera de plazo': 'warning',
};

export function itemCambiado(item: ItemModificacion): boolean {
  return item.monto !== item.montoVigente;
}

export function areaModificada(area: AreaModificacion): boolean {
  return area.items.some(itemCambiado);
}

export function estadoArea(area: AreaModificacion): EstadoAreaModificacion {
  if (area.quitada) return 'Quitada';
  if (areaModificada(area)) return 'Modificada';
  return area.soloLectura ? 'Fuera de plazo' : 'Sin cambios';
}

export function montoVigente(area: AreaModificacion): number {
  return redondear(area.items.reduce((suma, i) => suma + i.montoVigente, 0));
}

/** Monto con que el área queda en el Anexo 02 (cero si se quita). */
export function montoNuevo(area: AreaModificacion): number {
  return area.quitada ? 0 : redondear(area.items.reduce((suma, i) => suma + i.monto, 0));
}

/** Cantidad de un bien según su monto. */
export function cantidadDe(item: ItemModificacion): number | null {
  return item.tipo === 'Bien' && item.precioUnitario ? Math.round(item.monto / item.precioUnitario) : null;
}

/** Monto de una necesidad a partir de lo que se digita: cantidad entera en un bien, soles en un servicio. */
export function montoDeEntrada(item: ItemModificacion, valor: unknown): number {
  const numero = Number(String(valor ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numero) || numero <= 0) return 0;
  return item.tipo === 'Bien' && item.precioUnitario ? redondear(Math.round(numero) * item.precioUnitario) : redondear(numero);
}

/** Cambios que se mandan a grabar: solo las áreas quitadas y las necesidades con otro monto. */
export function cambiosDe(areas: AreaModificacion[]): GuardarModificacionRequest['areas'] {
  return areas
    .filter((a) => a.quitada || areaModificada(a))
    .map((a) => ({
      id: a.id,
      quitada: a.quitada,
      ajustes: a.quitada ? {} : Object.fromEntries(a.items.filter(itemCambiado).map((i) => [i.id, i.monto])),
    }));
}

/** Resumen de la modificación frente al Anexo 02 vigente. */
export function resumenModificacion(areas: AreaModificacion[]): {
  modificadas: number;
  quitadas: number;
  necesidades: number;
  vigente: number;
  nuevo: number;
  variacion: number;
} {
  const vigente = redondear(areas.reduce((suma, a) => suma + montoVigente(a), 0));
  const nuevo = redondear(areas.reduce((suma, a) => suma + montoNuevo(a), 0));
  return {
    modificadas: areas.filter((a) => !a.quitada && areaModificada(a)).length,
    quitadas: areas.filter((a) => a.quitada).length,
    necesidades: areas.filter((a) => !a.quitada).reduce((suma, a) => suma + a.items.filter(itemCambiado).length, 0),
    vigente,
    nuevo,
    variacion: redondear(nuevo - vigente),
  };
}

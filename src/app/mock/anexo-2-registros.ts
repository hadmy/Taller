import type { SolicitudResponse } from '../core/api/solicitudes-api.service';
import {
  ANIOS_CMN,
  TIPO_ACCION_MODIFICACION,
  faseCmn,
  type AreaUsuariaAnexo1,
  type BaseModificacionAnexo2,
  type FaseCmn,
  type GuardarModificacionRequest,
  type ModificacionAnexo2,
  type RegistroAnexo2,
} from '../modules/abastecimiento/anexo-2-fase-1/models/anexo-2-fase-1.model';
import { CONTEXTO_ANEXO_2_FASE_1, TIPO_DOCUMENTO_SA2F1, itemsAnexo1, type DatosTaller } from './mock-db';

/**
 * Reglas de los registros de CMN Programación y de la Modificación del Anexo 02:
 * - Cada fase de una entidad tiene un solo registro; la solicitud aprobada más reciente es la vigente.
 * - Solo se modifica un Anexo 02 vigente, con una modificación en curso a la vez por fase.
 * - Una modificación cambia montos de necesidades o quita áreas usuarias; fuera del plazo, el área es de solo lectura.
 */

const redondear = (n: number): number => Math.round(n * 100) / 100;

/** Estados en que una modificación todavía está en curso. */
const EN_CURSO = ['ELABORADO', 'VERIFICADO', 'VALIDADO', 'OBSERVADO'];

export function esModificacion(s: SolicitudResponse): boolean {
  return s.tipoAccion === TIPO_ACCION_MODIFICACION;
}

export function faseDe(s: SolicitudResponse): FaseCmn {
  return faseCmn(s.detalleAnexo2Fase1?.fase);
}

function delaFase(datos: DatosTaller, entidadId: string | null | undefined, fase: FaseCmn): SolicitudResponse[] {
  return datos.solicitudes.filter(
    (s) => s.catDocumento?.codigo === TIPO_DOCUMENTO_SA2F1.codigo && !!s.detalleAnexo2Fase1 && s.entidadCreadora?.id === entidadId && faseDe(s) === fase,
  );
}

const fechaAprobacion = (s: SolicitudResponse): string => s.fechaAprobacion ?? s.updatedAt ?? s.createdAt;

/** Anexos 02 aprobados de la fase (creación y modificaciones), del más antiguo al vigente. */
export function aprobadasDeFase(datos: DatosTaller, entidadId: string | null | undefined, fase: FaseCmn): SolicitudResponse[] {
  return delaFase(datos, entidadId, fase)
    .filter((s) => s.estado === 'APROBADO')
    .sort((a, b) => fechaAprobacion(a).localeCompare(fechaAprobacion(b)));
}

export function vigenteDeFase(datos: DatosTaller, entidadId: string | null | undefined, fase: FaseCmn): SolicitudResponse | undefined {
  return aprobadasDeFase(datos, entidadId, fase).at(-1);
}

/** La modificación en curso de la fase, si hay una (sin contar `exceptoId`). */
export function modificacionEnCurso(datos: DatosTaller, entidadId: string | null | undefined, fase: FaseCmn, exceptoId?: string): SolicitudResponse | undefined {
  return delaFase(datos, entidadId, fase).find((s) => esModificacion(s) && EN_CURSO.includes(s.estado) && s.id !== exceptoId);
}

/** Foto del Anexo 02 vigente que una modificación toma como base. */
export function baseDe(vigente: SolicitudResponse): BaseModificacionAnexo2 {
  return {
    documentoId: vigente.id,
    numero: vigente.numero ?? '',
    fechaAprobacion: fechaAprobacion(vigente),
    areas: (vigente.detalleAnexo2Fase1?.areas ?? []).map((a) => ({ ...a })),
  };
}

/** Plazo para modificar de un área: el de su Anexo 01 recibido (relativo a hoy en la demo). */
function plazoDe(area: AreaUsuariaAnexo1): string {
  return CONTEXTO_ANEXO_2_FASE_1.areas.find((a) => a.id === area.id)?.plazoModificacion ?? area.plazoModificacion;
}

function fueraDePlazo(area: AreaUsuariaAnexo1): boolean {
  const hoy = new Date();
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return plazoDe(area) < iso;
}

/** Lo que ve la pantalla: cada área vigente con sus necesidades, y lo que cambia si ya hay `resultado`. */
export function armarModificacion(fase: FaseCmn, base: BaseModificacionAnexo2, resultado?: AreaUsuariaAnexo1[]): ModificacionAnexo2 {
  return {
    fase,
    base: { documentoId: base.documentoId, numero: base.numero, fechaAprobacion: base.fechaAprobacion },
    areas: base.areas.map((area) => {
      const nueva = resultado?.find((a) => a.id === area.id);
      const montos = new Map((nueva ? itemsAnexo1(nueva) : []).map((i) => [i.id, i.montoProgramado]));
      return {
        id: area.id,
        nombre: area.nombre,
        plazoModificacion: plazoDe(area),
        soloLectura: fueraDePlazo(area),
        quitada: !!resultado && !nueva,
        items: itemsAnexo1(area).map(({ id, item, descripcion, tipo, unidadMedida, precioUnitario, montoProgramado }) => ({
          id,
          item,
          descripcion,
          tipo,
          unidadMedida,
          precioUnitario,
          montoVigente: montoProgramado,
          monto: montos.get(id) ?? montoProgramado,
        })),
      };
    }),
  };
}

/** Áreas que quedan en el Anexo 02 al aplicar los cambios, o el motivo por el que no se pueden aplicar. */
export function aplicarCambios(base: BaseModificacionAnexo2, cambios: GuardarModificacionRequest['areas']): { areas: AreaUsuariaAnexo1[] } | { error: string } {
  let huboCambios = false;
  const areas: AreaUsuariaAnexo1[] = [];
  for (const area of base.areas) {
    const cambio = cambios.find((c) => c.id === area.id);
    const items = itemsAnexo1(area);
    const ajustes = Object.entries(cambio?.ajustes ?? {}).filter(([id, monto]) => items.find((i) => i.id === id)?.montoProgramado !== monto);
    if (!cambio?.quitada && !ajustes.length) {
      areas.push({ ...area });
      continue;
    }
    if (fueraDePlazo(area)) return { error: `${area.nombre} está fuera del plazo de modificación.` };
    huboCambios = true;
    if (cambio?.quitada) continue;
    for (const [id, monto] of ajustes) {
      const item = items.find((i) => i.id === id);
      if (!item) return { error: `Hay una necesidad que no es de ${area.nombre}.` };
      if (!(monto > 0)) return { error: `El monto de «${item.descripcion}» debe ser mayor que cero.` };
      if (item.tipo === 'Bien' && item.precioUnitario && Math.abs(monto / item.precioUnitario - Math.round(monto / item.precioUnitario)) > 1e-6) {
        return { error: `El monto de «${item.descripcion}» debe ser una cantidad entera por su precio unitario.` };
      }
    }
    const nueva: AreaUsuariaAnexo1 = { ...area, montoBase: area.montoBase ?? area.montoProgramado, ajustes: { ...area.ajustes, ...Object.fromEntries(ajustes) } };
    nueva.montoProgramado = redondear(itemsAnexo1(nueva).reduce((suma, i) => suma + i.montoProgramado, 0));
    areas.push(nueva);
  }
  if (!huboCambios) return { error: 'La modificación no tiene cambios respecto del Anexo 02 vigente.' };
  if (!areas.length) return { error: 'El Anexo 02 debe conservar al menos un área usuaria.' };
  return { areas };
}

/** Registros de la entidad: uno por fase con Anexo 02 aprobado, con lo programado por año y sus versiones. */
export function registrosDeEntidad(datos: DatosTaller, entidadId: string | null | undefined): RegistroAnexo2[] {
  return ([1, 2, 3] as const)
    .map((fase) => ({ fase, versiones: aprobadasDeFase(datos, entidadId, fase) }))
    .filter(({ versiones }) => versiones.length > 0)
    .map(({ fase, versiones }, i) => {
      const vigente = versiones[versiones.length - 1];
      const areas = vigente.detalleAnexo2Fase1?.areas ?? [];
      const items = areas.flatMap((a) => itemsAnexo1(a));
      return {
        id: `reg-${entidadId}-${fase}`,
        numero: String(i + 1).padStart(4, '0'),
        fase,
        areas: areas.length,
        necesidades: items.length,
        programado: ANIOS_CMN.map((anio) => ({
          anio,
          monto: redondear(items.reduce((suma, item) => suma + (item.montosPorAnio[anio] ?? 0), 0)),
          techo: CONTEXTO_ANEXO_2_FASE_1.marcoPresupuestario.find((m) => m.anio === anio)?.techoPresupuestal ?? 0,
        })),
        documentoId: vigente.id,
        numeroDocumento: vigente.numero ?? '',
        fechaAprobacion: fechaAprobacion(vigente),
        versiones: versiones.map((s) => ({ documentoId: s.id, numero: s.numero ?? '', tipoAccion: s.tipoAccion, fechaAprobacion: fechaAprobacion(s) })),
      };
    });
}

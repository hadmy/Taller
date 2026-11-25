import { alertaVacia, camposFaltantes, comportamiento, propuestaAlElegirEtapa } from './alerta-cmn.model';

describe('alerta-cmn.model', () => {
  const base = { ...alertaVacia(), momento: 'antes-fin' as const, tiempo: '5', unidad: 'dias' as const, frecuencia: 'diario' as const };

  it('dice en palabras cuándo se enviará', () => {
    expect(comportamiento(alertaVacia())).toBe('Seleccionar Condición y Frecuencia de Ejecución');
    expect(comportamiento(base)).toBe('Se enviará diariamente durante los 5 días previos a la fecha de fin de la etapa.');
    expect(comportamiento({ ...base, frecuencia: 'una-vez', tiempo: '1' })).toBe('Se enviará una sola vez, 1 día antes de la fecha de fin de la etapa.');
    expect(comportamiento({ ...base, momento: 'despues-inicio', unidad: 'semanas', tiempo: '2', frecuencia: 'cada-3' })).toBe('Se enviará cada 3 días durante las 2 semanas posteriores a la fecha de inicio de la etapa.');
    expect(comportamiento({ ...alertaVacia(), momento: 'dia-fin' })).toBe('Se enviará una sola vez, el día exacto de la fecha de fin (vencimiento) de la etapa.');
  });

  it('tiempo, unidad y frecuencia no son obligatorios si se envía un solo día', () => {
    expect(camposFaltantes(alertaVacia())).toEqual(['nombre', 'etapaId', 'momento', 'tiempo', 'unidad', 'frecuencia', 'asunto']);
    expect(camposFaltantes({ ...alertaVacia(), momento: 'dia-inicio' })).toEqual(['nombre', 'etapaId', 'asunto']);
  });

  it('al elegir la etapa por primera vez propone destinatario, canales y mensaje', () => {
    const a = propuestaAlElegirEtapa(alertaVacia(), 'f1-a1');
    expect([a.alResponsable, a.alJefe, a.porBandeja, a.porCorreo, a.asunto]).toEqual([true, false, true, true, 'Alerta del Sistema']);
    expect(propuestaAlElegirEtapa({ ...a, alResponsable: false }, 'f1-a2').alResponsable).toBeFalse();
  });
});

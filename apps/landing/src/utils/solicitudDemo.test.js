import { describe, expect, it } from 'vitest';

import { camposInvalidos, enlaceSolicitudPorCorreo } from '@/utils/solicitudDemo';

const COMPLETA = {
  nombre: 'Carolina Prueba',
  lavadero: 'Lavadero Prueba',
  ciudad: 'Medellín',
  whatsapp: '300 000 0000',
  sedes: '2-3',
};

describe('camposInvalidos', () => {
  it('acepta una solicitud completa', () => {
    expect(camposInvalidos(COMPLETA)).toEqual([]);
  });

  it('marca los campos vacíos o con solo espacios', () => {
    expect(camposInvalidos({ ...COMPLETA, nombre: '  ', ciudad: '' })).toEqual(['nombre', 'ciudad']);
  });

  it('exige al menos diez dígitos en el WhatsApp', () => {
    expect(camposInvalidos({ ...COMPLETA, whatsapp: '300 000 00' })).toEqual(['whatsapp']);
    expect(camposInvalidos({ ...COMPLETA, whatsapp: '300-000-0000' })).toEqual([]);
  });
});

describe('enlaceSolicitudPorCorreo', () => {
  it('arma el asunto y el cuerpo con los datos de la solicitud', () => {
    const enlace = new URL(enlaceSolicitudPorCorreo('ventas@ejemplo.test', COMPLETA));
    expect(enlace.protocol).toBe('mailto:');
    expect(enlace.pathname).toBe('ventas@ejemplo.test');
    expect(enlace.searchParams.get('subject')).toBe('Solicitud de demo · Lavadero Prueba');
    expect(enlace.searchParams.get('body')).toBe(
      [
        'Hola, quiero agendar una demo de Corefaze.',
        '',
        'Nombre: Carolina Prueba',
        'Lavadero: Lavadero Prueba',
        'Ciudad: Medellín',
        'WhatsApp: 300 000 0000',
        'Sedes: 2 a 3 sedes',
      ].join('\n'),
    );
  });

  it('codifica los caracteres especiales', () => {
    const enlace = enlaceSolicitudPorCorreo('ventas@ejemplo.test', { ...COMPLETA, lavadero: 'Lava & Brilla' });
    expect(enlace).toContain('Lava%20%26%20Brilla');
  });
});

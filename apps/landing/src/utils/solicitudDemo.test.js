import { describe, expect, it } from 'vitest';

import { camposInvalidos, primerNombre } from '@/utils/solicitudDemo';

const COMPLETA = { nombre: 'Carolina Restrepo', lavadero: 'Lavadero Prueba', ciudad: 'Medellín', whatsapp: '300 000 0000', sedes: '1' };

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

describe('primerNombre', () => {
  it('toma la primera palabra', () => {
    expect(primerNombre('  Carolina   Restrepo ')).toBe('Carolina');
    expect(primerNombre('')).toBe('');
  });
});

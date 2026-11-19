import { describe, expect, it } from 'vitest';

import { formatoPlaca } from '@/utils/formatoPlaca';

describe('formatoPlaca', () => {
  it('separa las letras de los números en una placa de carro', () => {
    expect(formatoPlaca('AAA111')).toBe('AAA 111');
  });

  it('separa las letras del resto en una placa de moto', () => {
    expect(formatoPlaca('BBB22B')).toBe('BBB 22B');
  });

  it('normaliza antes de formatear: mayúsculas, sin espacios ni guiones', () => {
    expect(formatoPlaca(' aaa-111 ')).toBe('AAA 111');
    expect(formatoPlaca('bbb 22b')).toBe('BBB 22B');
  });

  it('devuelve normalizada y sin separar una placa que no cumple ningún patrón', () => {
    expect(formatoPlaca('aa-1')).toBe('AA1');
    expect(formatoPlaca('AAAA111')).toBe('AAAA111');
  });

  it('devuelve cadena vacía cuando no hay placa', () => {
    expect(formatoPlaca(null)).toBe('');
    expect(formatoPlaca(undefined)).toBe('');
    expect(formatoPlaca('')).toBe('');
  });
});

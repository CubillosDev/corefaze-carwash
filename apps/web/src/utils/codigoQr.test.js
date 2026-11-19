import { describe, expect, it } from 'vitest';

import { trazoQr } from '@/utils/codigoQr';

describe('trazoQr', () => {
  it('dibuja un QR válido: tamaño de su versión y patrón de posición en la esquina', () => {
    const { tamano, trazo } = trazoQr('corefaze-jornada:token-de-prueba-0123456789abcdef');

    expect((tamano - 17) % 4).toBe(0);
    expect(trazo.startsWith('M0 0h1v1h-1z')).toBe(true);
    expect(trazo).toContain(`M${tamano - 1} 0h1v1h-1z`);
  });

  it('da el mismo dibujo para el mismo texto y otro para un texto distinto', () => {
    expect(trazoQr('uno').trazo).toBe(trazoQr('uno').trazo);
    expect(trazoQr('uno').trazo).not.toBe(trazoQr('dos').trazo);
  });
});

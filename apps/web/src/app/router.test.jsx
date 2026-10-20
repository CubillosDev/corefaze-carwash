import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { rutas } from '@/app/router';
import { MENU_PRINCIPAL } from '@/constants/rutas';

/** La ruta hija que atiende una dirección, sin contar el layout. */
function rutaQueAtiende(direccion) {
  const coincidencias = matchRoutes(rutas, direccion) ?? [];
  return coincidencias.at(-1)?.route;
}

describe('router', () => {
  it('registra una página para cada opción del menú lateral', () => {
    for (const { ruta } of MENU_PRINCIPAL) {
      expect(rutaQueAtiende(ruta), `la opción ${ruta} no tiene página`).toBeDefined();
      expect(rutaQueAtiende(ruta).path, `la opción ${ruta} cae en la 404`).not.toBe('*');
    }
  });

  it('manda las direcciones desconocidas a la página 404', () => {
    expect(rutaQueAtiende('/direccion-que-no-existe').path).toBe('*');
  });
});

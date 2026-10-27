import { describe, expect, it } from 'vitest';

import { esRolPendiente, etiquetaDeRol, rolPuedeAcceder } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { ROLES } from '@/constants/dominio';

describe('permisos', () => {
  it('tiene una etiqueta para cada rol del dominio', () => {
    for (const rol of ROLES) {
      expect(etiquetaDeRol(rol), `falta la etiqueta de ${rol}`).not.toBe('Sin rol');
    }
    expect(etiquetaDeRol('inventado')).toBe('Sin rol');
  });

  it('reconoce el rol pendiente', () => {
    expect(esRolPendiente('pendiente')).toBe(true);
    expect(esRolPendiente('administrador')).toBe(false);
  });

  it('el rol pendiente y la ausencia de rol no entran a ninguna dirección', () => {
    for (const ruta of Object.values(RUTAS)) {
      expect(rolPuedeAcceder('pendiente', ruta)).toBe(false);
      expect(rolPuedeAcceder(undefined, ruta)).toBe(false);
      expect(rolPuedeAcceder('rol-desconocido', ruta)).toBe(false);
    }
  });

  it('administrador y superadmin usan todos los módulos', () => {
    for (const rol of ['administrador', 'superadmin']) {
      for (const ruta of [RUTAS.INICIO, RUTAS.VEHICULOS, RUTAS.REPORTES, RUTAS.COLABORADORES]) {
        expect(rolPuedeAcceder(rol, ruta)).toBe(true);
      }
    }
  });

  it('soporte no entra a módulos de administración', () => {
    expect(rolPuedeAcceder('soporte', RUTAS.VEHICULOS)).toBe(true);
    expect(rolPuedeAcceder('soporte', RUTAS.REPORTES)).toBe(false);
    expect(rolPuedeAcceder('soporte', RUTAS.COLABORADORES)).toBe(false);
  });

  it('las subrutas pertenecen al módulo (/vehiculos/5 es de /vehiculos)', () => {
    expect(rolPuedeAcceder('soporte', '/vehiculos/5')).toBe(true);
    expect(rolPuedeAcceder('soporte', '/reportes/mensual')).toBe(false);
  });

  it('una ruta que no es de ningún módulo (la 404) se permite a un rol con acceso', () => {
    expect(rolPuedeAcceder('soporte', '/direccion-que-no-existe')).toBe(true);
    expect(rolPuedeAcceder('pendiente', '/direccion-que-no-existe')).toBe(false);
  });

  it('el inicio solo coincide con "/" y no abre todo lo demás', () => {
    expect(rolPuedeAcceder('soporte', RUTAS.INICIO)).toBe(true);
    expect(rolPuedeAcceder('soporte', '/reportes')).toBe(false);
  });
});

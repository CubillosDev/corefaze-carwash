import { describe, expect, it } from 'vitest';

import {
  esRolPendiente,
  etiquetaDeRol,
  rolPuedeAcceder,
  rolPuedeAnularOrden,
  rolPuedeGestionar,
  rolPuedeMoverInventario,
  rolPuedeReabrirCaja,
  rolPuedeReabrirJornada,
  rolPuedeVerificarVales,
} from '@/constants/permisos';
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

  it('solo superadmin y administrador gestionan clientes y vehículos', () => {
    for (const modulo of [RUTAS.CLIENTES, RUTAS.VEHICULOS]) {
      expect(rolPuedeGestionar('superadmin', modulo)).toBe(true);
      expect(rolPuedeGestionar('administrador', modulo)).toBe(true);
      expect(rolPuedeGestionar('soporte', modulo)).toBe(false);
      expect(rolPuedeGestionar('pendiente', modulo)).toBe(false);
      expect(rolPuedeGestionar(undefined, modulo)).toBe(false);
    }
  });

  it('soporte gestiona las órdenes de lavado y las jornadas', () => {
    expect(rolPuedeGestionar('soporte', RUTAS.ORDENES_LAVADO)).toBe(true);
    expect(rolPuedeGestionar('soporte', RUTAS.JORNADAS)).toBe(true);
    expect(rolPuedeGestionar('soporte', RUTAS.SERVICIOS)).toBe(false);
  });

  it('administrador consulta usuarios, pero solo superadmin los gestiona (GET /api/usuarios)', () => {
    expect(rolPuedeAcceder('superadmin', RUTAS.USUARIOS)).toBe(true);
    expect(rolPuedeAcceder('administrador', RUTAS.USUARIOS)).toBe(true);
    expect(rolPuedeAcceder('soporte', RUTAS.USUARIOS)).toBe(false);
    expect(rolPuedeGestionar('superadmin', RUTAS.USUARIOS)).toBe(true);
    expect(rolPuedeGestionar('administrador', RUTAS.USUARIOS)).toBe(false);
  });

  it('soporte opera la caja; reabrirla es solo de superadmin', () => {
    expect(rolPuedeAcceder('soporte', RUTAS.CAJA)).toBe(true);
    expect(rolPuedeGestionar('soporte', RUTAS.CAJA)).toBe(true);
    expect(rolPuedeReabrirCaja('superadmin')).toBe(true);
    expect(rolPuedeReabrirCaja('administrador')).toBe(false);
  });

  it('soporte verifica vales y mueve inventario, pero no paga ni administra insumos', () => {
    expect(rolPuedeVerificarVales('soporte')).toBe(true);
    expect(rolPuedeGestionar('soporte', RUTAS.CREDITO)).toBe(false);
    expect(rolPuedeMoverInventario('soporte')).toBe(true);
    expect(rolPuedeGestionar('soporte', RUTAS.INVENTARIO)).toBe(false);
    expect(rolPuedeAcceder('soporte', RUTAS.NOMINA)).toBe(false);
    expect(rolPuedeVerificarVales('pendiente')).toBe(false);
  });
});

describe('acciones restringidas', () => {
  it('solo superadmin y administrador anulan órdenes', () => {
    expect(rolPuedeAnularOrden('superadmin')).toBe(true);
    expect(rolPuedeAnularOrden('administrador')).toBe(true);
    expect(rolPuedeAnularOrden('soporte')).toBe(false);
    expect(rolPuedeAnularOrden(undefined)).toBe(false);
  });

  it('solo superadmin reabre jornadas', () => {
    expect(rolPuedeReabrirJornada('superadmin')).toBe(true);
    expect(rolPuedeReabrirJornada('administrador')).toBe(false);
  });
});

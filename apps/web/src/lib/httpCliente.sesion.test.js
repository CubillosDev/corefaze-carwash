import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  borrarSesionGuardada,
  crearHttpCliente,
  guardarSesion,
  leerSesionGuardada,
  tokenVencido,
} from '@/lib/httpCliente';

/** JWT de prueba sin firma real: solo importa el campo exp del payload. */
const jwtCon = (exp) => `cabecera.${btoa(JSON.stringify({ sub: 1, exp })).replace(/=+$/, '')}.firma`;
const EN_UNA_HORA = Math.floor(Date.now() / 1000) + 3600;
const HACE_UNA_HORA = Math.floor(Date.now() / 1000) - 3600;
const USUARIO = { id: 1, nombre: 'Ana Prueba', rol: 'soporte' };

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('respaldo de la sesión', () => {
  it('guarda en sessionStorage y nunca en localStorage', () => {
    guardarSesion({ usuario: USUARIO, token: jwtCon(EN_UNA_HORA) });

    expect(leerSesionGuardada()).toEqual({ usuario: USUARIO, token: jwtCon(EN_UNA_HORA) });
    expect(localStorage.length).toBe(0);
  });

  it('descarta y borra una sesión con el token vencido', () => {
    guardarSesion({ usuario: USUARIO, token: jwtCon(HACE_UNA_HORA) });

    expect(leerSesionGuardada()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('descarta un contenido dañado y lo borra al cerrar sesión', () => {
    sessionStorage.setItem('corefaze.sesion', '{no es json');
    expect(leerSesionGuardada()).toBeNull();

    guardarSesion({ usuario: USUARIO, token: jwtCon(EN_UNA_HORA) });
    borrarSesionGuardada();
    expect(leerSesionGuardada()).toBeNull();
  });
});

describe('tokenVencido', () => {
  it('lee el campo exp del JWT', () => {
    expect(tokenVencido(jwtCon(HACE_UNA_HORA))).toBe(true);
    expect(tokenVencido(jwtCon(EN_UNA_HORA))).toBe(false);
  });

  it('si no puede leerlo, deja decidir a la API', () => {
    expect(tokenVencido('no-es-un-jwt')).toBe(false);
  });
});

describe('httpCliente y la sesión vencida', () => {
  it('no envía un token vencido: cierra la sesión y borra el respaldo', async () => {
    guardarSesion({ usuario: USUARIO, token: jwtCon(HACE_UNA_HORA) });
    const hacerPeticion = vi.fn();
    const alSesionExpirada = vi.fn();
    const cliente = crearHttpCliente({
      urlBase: 'http://api.prueba/api',
      hacerPeticion,
      obtenerToken: () => jwtCon(HACE_UNA_HORA),
      alSesionExpirada,
    });

    await expect(cliente.obtener('clientes')).rejects.toMatchObject({ estado: 401 });
    expect(hacerPeticion).not.toHaveBeenCalled();
    expect(alSesionExpirada).toHaveBeenCalledOnce();
    expect(sessionStorage.length).toBe(0);
  });

  it('ante un 401 de la API borra el respaldo y avisa a la sesión', async () => {
    guardarSesion({ usuario: USUARIO, token: jwtCon(EN_UNA_HORA) });
    const alSesionExpirada = vi.fn();
    const cliente = crearHttpCliente({
      urlBase: 'http://api.prueba/api',
      hacerPeticion: vi.fn(async () => new Response(JSON.stringify({ mensaje: 'Token inválido' }), { status: 401 })),
      obtenerToken: () => jwtCon(EN_UNA_HORA),
      alSesionExpirada,
    });

    await expect(cliente.obtener('clientes')).rejects.toMatchObject({ estado: 401 });
    expect(alSesionExpirada).toHaveBeenCalledOnce();
    expect(sessionStorage.length).toBe(0);
  });
});

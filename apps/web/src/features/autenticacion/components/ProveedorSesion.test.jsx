import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { iniciarSesion } from '@/features/autenticacion/api/autenticacion.api';
import { ProveedorSesion } from '@/features/autenticacion/components/ProveedorSesion';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { guardarSesion, httpCliente } from '@/lib/httpCliente';

vi.mock('@/features/autenticacion/api/autenticacion.api', () => ({ iniciarSesion: vi.fn() }));

const jwtCon = (exp) => `cabecera.${btoa(JSON.stringify({ sub: 1, exp })).replace(/=+$/, '')}.firma`;
const TOKEN = jwtCon(Math.floor(Date.now() / 1000) + 3600);
const USUARIO = { id: 1, nombre: 'Ana Prueba', email: 'ana@prueba.co', rol: 'administrador' };

function Sonda() {
  const { usuario, motivoCierre, iniciarSesion: entrar, cerrarSesion } = useSesion();
  return (
    <>
      <p>usuario: {usuario?.nombre ?? 'ninguno'}</p>
      <p>motivo: {motivoCierre ?? 'ninguno'}</p>
      <button type="button" onClick={() => entrar({ email: 'a', password: 'b' })}>
        Entrar
      </button>
      <button type="button" onClick={cerrarSesion}>
        Salir
      </button>
    </>
  );
}

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('ProveedorSesion: respaldo en sessionStorage', () => {
  it('al iniciar sesión guarda el respaldo y al salir lo borra', async () => {
    iniciarSesion.mockResolvedValue({ usuario: USUARIO, token: TOKEN });
    render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('usuario: Ana Prueba')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('corefaze.sesion'))).toEqual({ usuario: USUARIO, token: TOKEN });

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(sessionStorage.getItem('corefaze.sesion')).toBeNull();
  });

  it('al recargar la pestaña recupera la sesión guardada', () => {
    guardarSesion({ usuario: USUARIO, token: TOKEN });

    render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );

    expect(screen.getByText('usuario: Ana Prueba')).toBeInTheDocument();
  });

  it('ante un 401 cierra la sesión, borra el respaldo y marca la sesión como expirada', async () => {
    guardarSesion({ usuario: USUARIO, token: TOKEN });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ mensaje: 'Token expirado' }), { status: 401 })));
    render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );

    await act(async () => {
      await httpCliente.obtener('clientes').catch(() => {});
    });

    expect(screen.getByText('usuario: ninguno')).toBeInTheDocument();
    expect(screen.getByText('motivo: expirada')).toBeInTheDocument();
    expect(sessionStorage.getItem('corefaze.sesion')).toBeNull();
  });
});

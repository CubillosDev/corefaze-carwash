import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { iniciarSesion as iniciarSesionEnApi } from '@/features/autenticacion/api/autenticacion.api';
import { SesionContexto } from '@/features/autenticacion/hooks/sesionContexto';
import {
  borrarSesionGuardada,
  guardarSesion,
  leerSesionGuardada,
  vincularSesion,
} from '@/lib/httpCliente';

/**
 * Dueño de la sesión del panel.
 *
 * SEGURIDAD: el token vive en memoria (una referencia de React) con respaldo
 * en sessionStorage, nunca en localStorage ni en cookies accesibles desde
 * JavaScript, y nunca se registra en consola. El respaldo permite recargar la
 * pestaña sin volver a ingresar; se borra al cerrar sesión, ante un 401 o si
 * el token vence (lo maneja lib/httpCliente.js). Esto cambia lo decidido en
 * docs/arquitectura/decisiones/0004-sesion-del-panel-web.md (solo memoria),
 * siguiendo el patrón del curso: hay que actualizar ese ADR.
 *
 * Mientras exista el proveedor, el cliente HTTP pide el token aquí en cada
 * solicitud y le avisa si la sesión expiró.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {{ usuario: object, token: string } | null} [props.sesionInicial] Para
 *   pruebas y para la vista previa del sistema de diseño. Si no se entrega, se
 *   recupera la sesión guardada en la pestaña.
 */
export function ProveedorSesion({ children, sesionInicial }) {
  const [inicial] = useState(() =>
    sesionInicial === undefined ? leerSesionGuardada() : sesionInicial,
  );
  const [usuario, setUsuario] = useState(inicial?.usuario ?? null);
  const [motivoCierre, setMotivoCierre] = useState(null);
  const token = useRef(inicial?.token ?? null);

  const cerrarSesion = useCallback(() => {
    token.current = null;
    borrarSesionGuardada();
    setUsuario(null);
    setMotivoCierre(null);
  }, []);

  const iniciarSesion = useCallback(async (credenciales) => {
    const resultado = await iniciarSesionEnApi(credenciales);
    token.current = resultado.token;
    guardarSesion({ usuario: resultado.usuario, token: resultado.token });
    setUsuario(resultado.usuario);
    setMotivoCierre(null);
  }, []);

  useEffect(
    () =>
      vincularSesion({
        obtenerToken: () => token.current,
        alSesionExpirada: () => {
          token.current = null;
          borrarSesionGuardada();
          setUsuario(null);
          setMotivoCierre('expirada');
        },
      }),
    [],
  );

  const valor = useMemo(
    () => ({ usuario, motivoCierre, iniciarSesion, cerrarSesion }),
    [usuario, motivoCierre, iniciarSesion, cerrarSesion],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

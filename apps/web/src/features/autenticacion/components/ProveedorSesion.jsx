import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { iniciarSesion as iniciarSesionEnApi } from '@/features/autenticacion/api/autenticacion.api';
import { SesionContexto } from '@/features/autenticacion/hooks/sesionContexto';
import { vincularSesion } from '@/lib/httpCliente';

/**
 * Dueño de la sesión del panel.
 *
 * SEGURIDAD: el token vive solo en memoria (una referencia de React). Nunca se
 * escribe en localStorage, sessionStorage ni en cookies accesibles desde
 * JavaScript, y nunca se registra en consola. Consecuencia consciente: al
 * recargar la página la sesión se pierde y hay que volver a ingresar. Ver
 * docs/arquitectura/decisiones/0004-sesion-del-panel-web.md.
 *
 * Mientras exista el proveedor, el cliente HTTP pide el token aquí en cada
 * solicitud y le avisa si la API responde 401.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {{ usuario: object, token: string }} [props.sesionInicial] Para
 *   pruebas y para la vista previa del sistema de diseño.
 */
export function ProveedorSesion({ children, sesionInicial }) {
  const [usuario, setUsuario] = useState(sesionInicial?.usuario ?? null);
  const [motivoCierre, setMotivoCierre] = useState(null);
  const token = useRef(sesionInicial?.token ?? null);

  const cerrarSesion = useCallback(() => {
    token.current = null;
    setUsuario(null);
    setMotivoCierre(null);
  }, []);

  const iniciarSesion = useCallback(async (credenciales) => {
    const resultado = await iniciarSesionEnApi(credenciales);
    token.current = resultado.token;
    setUsuario(resultado.usuario);
    setMotivoCierre(null);
  }, []);

  useEffect(
    () =>
      vincularSesion({
        obtenerToken: () => token.current,
        alSesionExpirada: () => {
          token.current = null;
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

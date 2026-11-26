import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { RUTAS } from '@/constants/rutas';
import { BotonVerClave } from '@/features/autenticacion/components/BotonVerClave';
import { MarcoAcceso } from '@/features/autenticacion/components/MarcoAcceso';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { validarInicioSesion } from '@/features/autenticacion/validators/inicioSesion.schema';

/** Solo se vuelve a direcciones internas del panel; cualquier otra cosa cae en el inicio. */
function destinoSeguro(desde) {
  const esInterna = typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//');
  return esInterna && !desde.startsWith(RUTAS.INGRESO) ? desde : RUTAS.INICIO;
}

/** Pantalla de ingreso con correo y contraseña. */
export function IngresoPage() {
  const { usuario, motivoCierre, iniciarSesion } = useSesion();
  const ubicacion = useLocation();
  const [valores, setValores] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [errorDeApi, setErrorDeApi] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verClave, setVerClave] = useState(false);

  if (usuario) {
    return <Navigate to={destinoSeguro(ubicacion.state?.desde)} replace />;
  }

  const cambiar = (campo) => (evento) => {
    setValores((anteriores) => ({ ...anteriores, [campo]: evento.target.value }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  async function enviar(evento) {
    evento.preventDefault();

    const resultado = validarInicioSesion(valores);
    setErrores(resultado.errores);
    setErrorDeApi('');
    if (!resultado.valido) {
      return;
    }

    setEnviando(true);
    try {
      // Al iniciar sesión, `usuario` cambia y esta página redirige sola.
      await iniciarSesion(resultado.datos);
    } catch (error) {
      setErrorDeApi(error.message);
      setValores((anteriores) => ({ ...anteriores, password: '' }));
      setEnviando(false);
    }
  }

  return (
    <MarcoAcceso titulo="Hola de nuevo" descripcion="Ingresa con el correo y la contraseña de tu cuenta.">
      {motivoCierre === 'expirada' && !errorDeApi ? (
        <Alerta tipo="info" titulo="Tu sesión expiró">
          Vuelve a ingresar para continuar.
        </Alerta>
      ) : null}

      {errorDeApi ? (
        <Alerta tipo="error" titulo="No pudimos ingresar">
          {errorDeApi}
        </Alerta>
      ) : null}

      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          placeholder="nombre@empresa.com"
          tamano="grande"
          value={valores.email}
          onChange={cambiar('email')}
          error={errores.email}
          requerido
        />
        <CampoTexto
          etiqueta="Contraseña"
          type={verClave ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          tamano="grande"
          value={valores.password}
          onChange={cambiar('password')}
          error={errores.password}
          requerido
          accion={<BotonVerClave visible={verClave} alCambiar={setVerClave} />}
        />
        <Boton type="submit" tamano="alto" cargando={enviando} className="mt-1 w-full shadow-boton-primario">
          Ingresar
          {enviando ? null : <IconoFlechaDerecha className="size-4" />}
        </Boton>
      </form>

      <p className="border-t border-neutro-200 pt-4 text-detalle leading-apoyo text-neutro-600">
        ¿Aún no tienes cuenta?{' '}
        <Link to={RUTAS.REGISTRO} className="font-semibold text-primario hover:text-primario-600">
          Solicitar acceso
        </Link>
      </p>
    </MarcoAcceso>
  );
}

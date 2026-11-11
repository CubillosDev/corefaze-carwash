import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import logoCorefaze from '@/assets/images/logo-corefaze.webp';
import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { validarInicioSesion } from '@/features/autenticacion/validators/inicioSesion.schema';

/** Solo se vuelve a direcciones internas del panel; cualquier otra cosa cae en el inicio. */
function destinoSeguro(desde) {
  const esInterna = typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//');
  return esInterna && !desde.startsWith(RUTAS.INGRESO) ? desde : RUTAS.INICIO;
}

/** Pantalla de ingreso: correo, contraseña y botón "Ingresar". */
export function IngresoPage() {
  const { usuario, motivoCierre, iniciarSesion } = useSesion();
  const ubicacion = useLocation();
  const [valores, setValores] = useState({ email: '', password: '' });
  const [errores, setErrores] = useState({});
  const [errorDeApi, setErrorDeApi] = useState('');
  const [enviando, setEnviando] = useState(false);

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-marco px-4 py-8">
      {/* El logo es blanco: va sobre el marco oscuro, no sobre la tarjeta. */}
      <img src={logoCorefaze} alt="Corefaze" className="h-7 w-auto" />

      <div className="flex w-full max-w-sm flex-col gap-6 rounded-modal bg-white p-6 shadow-modal escritorio:p-8">
        <header className="flex flex-col gap-1 text-center">
          <h1 className="text-titulo text-neutro-900">Ingresar a CarWash</h1>
          <p className="text-detalle text-neutro-600">Usa el correo y la contraseña de tu cuenta.</p>
        </header>

        {motivoCierre === 'expirada' && !errorDeApi ? (
          <Alerta tipo="info" titulo="Tu sesión terminó">
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
            value={valores.email}
            onChange={cambiar('email')}
            error={errores.email}
            requerido
          />
          <CampoTexto
            etiqueta="Contraseña"
            type="password"
            name="password"
            autoComplete="current-password"
            value={valores.password}
            onChange={cambiar('password')}
            error={errores.password}
            requerido
          />
          <Boton type="submit" tamano="grande" cargando={enviando} className="w-full">
            Ingresar
          </Boton>
        </form>
      </div>
    </main>
  );
}

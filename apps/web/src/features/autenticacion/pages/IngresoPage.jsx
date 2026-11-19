import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import logoCorefaze from '@/assets/images/logo-corefaze.webp';
import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { IconoOjo } from '@/components/ui/iconos/IconoOjo';
import { IconoOjoTachado } from '@/components/ui/iconos/IconoOjoTachado';
import { MarcaCorefaze } from '@/components/ui/MarcaCorefaze';
import { Punto } from '@/components/ui/Punto';
import { etiquetaEstadoOrden, tonoEstadoOrden } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';
import { EscenaIngreso } from '@/features/autenticacion/components/EscenaIngreso';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { validarInicioSesion } from '@/features/autenticacion/validators/inicioSesion.schema';
import { FASES_DEL_TABLERO } from '@/utils/estadosOrden';

/** Solo se vuelve a direcciones internas del panel; cualquier otra cosa cae en el inicio. */
function destinoSeguro(desde) {
  const esInterna = typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//');
  return esInterna && !desde.startsWith(RUTAS.INGRESO) ? desde : RUTAS.INICIO;
}

/**
 * Pantalla de ingreso. Repite el marco del panel: la cabecera sobre el fondo
 * oscuro y el panel claro redondeado, que aquí lleva el formulario. A la
 * izquierda, sobre el marco, la escena isométrica de la marca y los estados
 * por los que pasa una orden. En móvil el formulario sube como hoja inferior.
 */
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
    <main className="flex min-h-dvh flex-col bg-marco">
      <header className="flex h-encabezado shrink-0 items-center gap-3.5 px-3 escritorio:px-4.5">
        {/* El logo es blanco: va sobre el marco oscuro. */}
        <img src={logoCorefaze} alt="Corefaze" className="h-6 w-auto" />
        <span aria-hidden="true" className="h-5 w-px bg-white/25" />
        <span className="text-marca text-white">CarWash</span>
      </header>

      <div className="flex flex-1 flex-col escritorio:mx-2 escritorio:mb-2 escritorio:grid escritorio:grid-cols-2 escritorio:gap-2 amplio:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex flex-col justify-end px-5 pt-4 pb-7 escritorio:px-12 escritorio:pt-6 escritorio:pb-12">
          <div className="relative hidden min-h-0 flex-1 escritorio:block">
            <EscenaIngreso className="pointer-events-none absolute inset-0 size-full" />
          </div>

          <div className="flex max-w-md flex-col">
            <p className="text-etiqueta text-primario-200 uppercase">Panel del lavadero</p>
            <p className="mt-2.5 text-portada-movil text-balance text-white escritorio:text-portada">
              Cada vehículo, de la recepción a la entrega.
            </p>
            <p className="mt-3 text-cuerpo leading-apoyo text-white/65">
              Órdenes, caja, crédito y nómina del lavadero en un solo panel.
            </p>
            <ul aria-label="Estados de una orden" className="mt-5 flex flex-wrap gap-2">
              {FASES_DEL_TABLERO.map((estado) => (
                <li
                  key={estado}
                  className="inline-flex h-7 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 text-detalle text-white/85"
                >
                  <Punto tono={tonoEstadoOrden(estado)} />
                  {etiquetaEstadoOrden(estado)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-1 flex-col rounded-t-panel bg-neutro-50 px-5 pt-8 pb-5 escritorio:rounded-panel escritorio:px-10 escritorio:pt-10">
          <div className="m-auto flex w-full max-w-sm animate-entrar-modal flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-bloque bg-linear-to-br from-primario-500 to-primario-800 shadow-boton-primario">
                <MarcaCorefaze className="size-5.5 text-white" />
              </span>
              <header className="flex flex-col gap-1.5">
                <h1 className="text-portada-movil text-neutro-900">Ingresar a CarWash</h1>
                <p className="text-cuerpo text-neutro-600">Usa el correo y la contraseña de tu cuenta.</p>
              </header>
            </div>

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
                tamano="grande"
                value={valores.password}
                onChange={cambiar('password')}
                error={errores.password}
                requerido
                accion={
                  <button
                    type="button"
                    aria-label="Mostrar contraseña"
                    aria-pressed={verClave}
                    onClick={() => setVerClave((visible) => !visible)}
                    className="inline-flex size-9 items-center justify-center rounded-opcion text-neutro-500 transition-colors duration-150 hover:bg-neutro-100 hover:text-neutro-900"
                  >
                    {verClave ? <IconoOjoTachado className="size-4.5" /> : <IconoOjo className="size-4.5" />}
                  </button>
                }
              />
              <Boton type="submit" tamano="alto" cargando={enviando} className="mt-1 w-full shadow-boton-primario">
                Ingresar
                {enviando ? null : <IconoFlechaDerecha className="size-4" />}
              </Boton>
            </form>

            <p className="border-t border-neutro-200 pt-4 text-detalle leading-apoyo text-neutro-600">
              ¿Aún no tienes acceso? Pídeselo a quien administra el lavadero.
            </p>
          </div>

          <p className="mt-8 text-center text-nota text-neutro-450">Corefaze · CarWash</p>
        </section>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Link, Navigate } from 'react-router';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { RUTAS } from '@/constants/rutas';
import { registrarCuenta } from '@/features/autenticacion/api/autenticacion.api';
import { BotonVerClave } from '@/features/autenticacion/components/BotonVerClave';
import { MarcoAcceso } from '@/features/autenticacion/components/MarcoAcceso';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { LIMITES_REGISTRO, validarRegistro } from '@/features/autenticacion/validators/registro.schema';
import { useFormulario } from '@/hooks/useFormulario';

const INICIAL = { nombre: '', email: '', password: '', confirmacion: '' };

/**
 * Solicitud de acceso (POST /api/auth/registro). La cuenta nace `pendiente`:
 * no entra al panel hasta que un superadministrador le asigna un rol en
 * Usuarios.
 */
export function RegistroPage() {
  const { usuario } = useSesion();
  const [solicitada, setSolicitada] = useState(null);
  const [verClave, setVerClave] = useState(false);
  const formulario = useFormulario({
    inicial: INICIAL,
    validar: validarRegistro,
    enviar: registrarCuenta,
    alGuardar: setSolicitada,
  });

  if (usuario) {
    return <Navigate to={RUTAS.INICIO} replace />;
  }

  if (solicitada) {
    return (
      <MarcoAcceso titulo="Solicitud enviada" descripcion={`Creamos la cuenta de ${solicitada.email}.`}>
        <Alerta tipo="exito" titulo="Tu cuenta espera aprobación">
          Un superadministrador del lavadero debe asignarte un rol. Cuando lo haga, ingresa con tu correo y tu contraseña.
        </Alerta>
        <EnlaceBoton hacia={RUTAS.INGRESO} tamano="alto" className="w-full shadow-boton-primario">
          Ir a ingresar
          <IconoFlechaDerecha className="size-4" />
        </EnlaceBoton>
      </MarcoAcceso>
    );
  }

  const { valores, errores, errorDeApi, enviando, cambiar, enviarFormulario } = formulario;
  const alEscribir = (campo) => (evento) => cambiar(campo, evento.target.value);

  return (
    <MarcoAcceso titulo="Solicitar acceso" descripcion="Crea tu cuenta. Un superadministrador te dará acceso al panel.">
      {errorDeApi ? (
        <Alerta tipo="error" titulo="No pudimos crear la cuenta">
          {errorDeApi}
        </Alerta>
      ) : null}

      <form noValidate onSubmit={enviarFormulario} className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="Nombre completo"
          name="nombre"
          autoComplete="name"
          tamano="grande"
          maxLength={LIMITES_REGISTRO.NOMBRE_MAXIMO}
          value={valores.nombre}
          onChange={alEscribir('nombre')}
          error={errores.nombre}
          requerido
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@empresa.com"
          tamano="grande"
          value={valores.email}
          onChange={alEscribir('email')}
          error={errores.email}
          requerido
        />
        <CampoTexto
          etiqueta="Contraseña"
          type={verClave ? 'text' : 'password'}
          name="password"
          autoComplete="new-password"
          tamano="grande"
          ayuda={`Entre ${LIMITES_REGISTRO.CLAVE_MINIMA} y ${LIMITES_REGISTRO.CLAVE_MAXIMA} caracteres.`}
          maxLength={LIMITES_REGISTRO.CLAVE_MAXIMA}
          value={valores.password}
          onChange={alEscribir('password')}
          error={errores.password}
          requerido
          accion={<BotonVerClave visible={verClave} alCambiar={setVerClave} />}
        />
        <CampoTexto
          etiqueta="Confirmar contraseña"
          type={verClave ? 'text' : 'password'}
          name="confirmacion"
          autoComplete="new-password"
          tamano="grande"
          maxLength={LIMITES_REGISTRO.CLAVE_MAXIMA}
          value={valores.confirmacion}
          onChange={alEscribir('confirmacion')}
          error={errores.confirmacion}
          requerido
        />
        <Boton type="submit" tamano="alto" cargando={enviando} className="mt-1 w-full shadow-boton-primario">
          Solicitar acceso
          {enviando ? null : <IconoFlechaDerecha className="size-4" />}
        </Boton>
      </form>

      <p className="border-t border-neutro-200 pt-4 text-detalle leading-apoyo text-neutro-600">
        ¿Ya tienes cuenta?{' '}
        <Link to={RUTAS.INGRESO} className="font-semibold text-primario hover:text-primario-600">
          Ingresar
        </Link>
      </p>
    </MarcoAcceso>
  );
}

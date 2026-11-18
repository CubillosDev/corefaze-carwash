import { ESTADOS_ACTIVIDAD, LIMITES, TIPOS_CLIENTE } from '@/constants/dominio';
import { errorDeCorreo, errorDeLongitud, errorDeTelefono, soloErrores } from '@/utils/validaciones';

/** Valores del formulario de cliente al registrar uno nuevo. */
export const VALORES_INICIALES_CLIENTE = Object.freeze({
  nombre: '',
  documento: '',
  tipo: TIPOS_CLIENTE.PARTICULAR,
  telefono: '',
  email: '',
  creditoHabilitado: false,
  estado: ESTADOS_ACTIVIDAD.ACTIVO,
});

/** Lleva un cliente de la API a los valores del formulario. */
export const valoresDeCliente = (cliente) => ({
  ...VALORES_INICIALES_CLIENTE,
  ...cliente,
  email: cliente.email ?? '',
});

/**
 * Valida el formato con los límites de dominio.json y arma el cuerpo para
 * POST o PUT /api/clientes. Documento repetido, crédito y demás reglas las
 * valida la API.
 *
 * @param {typeof VALORES_INICIALES_CLIENTE} valores
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: object }}
 */
export function validarCliente(valores) {
  const nombre = String(valores.nombre ?? '').trim();
  const documento = String(valores.documento ?? '').trim();
  const telefono = String(valores.telefono ?? '').trim();
  const email = String(valores.email ?? '').trim();

  const errores = soloErrores({
    nombre: errorDeLongitud(nombre, LIMITES.nombre, 'El nombre'),
    documento: errorDeLongitud(documento, LIMITES.documento, 'El documento'),
    tipo: Object.values(TIPOS_CLIENTE).includes(valores.tipo) ? undefined : 'Elige el tipo de cliente.',
    telefono: errorDeTelefono(telefono, LIMITES.telefono.longitud),
    email: errorDeCorreo(email),
    estado: Object.values(ESTADOS_ACTIVIDAD).includes(valores.estado) ? undefined : 'Elige el estado.',
  });

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      nombre,
      documento,
      tipo: valores.tipo,
      telefono,
      ...(email ? { email } : {}),
      creditoHabilitado: Boolean(valores.creditoHabilitado),
      estado: valores.estado,
    },
  };
}

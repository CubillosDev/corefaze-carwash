import { LIMITES, TIPOS_VEHICULO } from '@/constants/dominio';
import { errorDeLongitud, soloErrores } from '@/utils/validaciones';

/** Valores del formulario al registrar un servicio: una tarifa vacía por tipo de vehículo. */
export const VALORES_INICIALES_SERVICIO = Object.freeze({
  numero: '',
  nombre: '',
  descripcion: '',
  categoria: '',
  activo: true,
  tarifas: Object.freeze(Object.fromEntries(Object.values(TIPOS_VEHICULO).map((tipo) => [tipo, '']))),
});

/** Lleva un servicio de la API a los valores del formulario. */
export const valoresDeServicio = (servicio) => ({
  numero: String(servicio.numero),
  nombre: servicio.nombre,
  descripcion: servicio.descripcion ?? '',
  categoria: servicio.categoria ?? '',
  activo: servicio.activo,
  tarifas: {
    ...VALORES_INICIALES_SERVICIO.tarifas,
    ...Object.fromEntries(
      servicio.tarifas.map(({ tipoVehiculo, valor }) => [tipoVehiculo, String(valor)]),
    ),
  },
});

/**
 * Valida el formato con los límites de dominio.json y arma el cuerpo para
 * POST o PUT /api/servicios. Las tarifas las escribe quien administra: solo se
 * envían las de los tipos con valor, sin calcular nada.
 *
 * @param {typeof VALORES_INICIALES_SERVICIO} valores
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: object }}
 */
export function validarServicio(valores) {
  const numero = Number(valores.numero);
  const nombre = String(valores.nombre ?? '').trim();
  const descripcion = String(valores.descripcion ?? '').trim();
  const categoria = String(valores.categoria ?? '').trim();
  const { min, max } = LIMITES.tarifa;

  const erroresTarifas = {};
  const tarifas = [];
  for (const [tipoVehiculo, texto] of Object.entries(valores.tarifas)) {
    const limpio = String(texto ?? '').trim();
    if (limpio !== '') {
      const valor = Number(limpio);
      if (!Number.isInteger(valor) || valor < min || valor > max) {
        erroresTarifas[`tarifa-${tipoVehiculo}`] = `Entre ${min} y ${max}, sin puntos.`;
      } else {
        tarifas.push({ tipoVehiculo, valor });
      }
    }
  }

  const sinTarifas = tarifas.length === 0 && Object.keys(erroresTarifas).length === 0;
  const errores = soloErrores({
    numero: Number.isInteger(numero) && numero >= 1 ? undefined : 'El número debe ser un entero desde 1.',
    nombre: errorDeLongitud(nombre, LIMITES.nombre, 'El nombre'),
    descripcion: errorDeLongitud(descripcion, LIMITES.observaciones, 'La descripción', {
      obligatorio: false,
    }),
    categoria: errorDeLongitud(categoria, LIMITES.nombre, 'La categoría', { obligatorio: false }),
    tarifas: sinTarifas ? 'Escribe al menos una tarifa.' : undefined,
    ...erroresTarifas,
  });

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      numero,
      nombre,
      ...(descripcion ? { descripcion } : {}),
      ...(categoria ? { categoria } : {}),
      activo: Boolean(valores.activo),
      tarifas,
    },
  };
}

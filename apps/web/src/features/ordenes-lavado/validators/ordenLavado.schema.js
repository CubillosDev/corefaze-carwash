import {
  LIMITES,
  MEDIOS_PAGO,
  PATRONES_PLACA,
  SERVICIOS_CON_LAVADO_MOTOR,
} from '@/constants/dominio';
import { normalizarPlaca } from '@/features/vehiculos';

/** Valores del formulario "Nueva orden" al abrirlo. */
export const VALORES_INICIALES_ORDEN = Object.freeze({
  placa: '',
  turno: '',
  servicioId: null,
  colaboradorId: null,
  medioPago: MEDIOS_PAGO.EFECTIVO,
  clienteId: '',
  autorizaMotor: false,
  observaciones: '',
});

/**
 * ¿El servicio es de los que exigen autorización de lavado de motor (R7)?
 * Solo decide si se muestra la casilla: la regla la valida la API.
 *
 * @param {{ numero: number } | null | undefined} servicio
 */
export function exigeAutorizacionMotor(servicio) {
  return servicio ? SERVICIOS_CON_LAVADO_MOTOR.includes(servicio.numero) : false;
}

/**
 * Valida el FORMATO del formulario "Nueva orden" con los límites de
 * dominio.json y arma el cuerpo para POST /api/ordenes-lavado. Las reglas del
 * negocio (jornada abierta, turno libre, tarifa, crédito, colaborador
 * activo...) las valida la API.
 *
 * El cuerpo nunca lleva valor ni estado: el valor lo calcula el servidor (R4)
 * y toda orden nace registrada.
 *
 * @param {typeof VALORES_INICIALES_ORDEN} valores
 * @param {{ vehiculos: { id: number, placa: string }[], servicio?: { numero: number } | null }} contexto
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: object | null }}
 */
export function validarNuevaOrden(valores, { vehiculos, servicio = null }) {
  const errores = {};
  const placa = normalizarPlaca(valores.placa);
  const vehiculo = vehiculos.find((candidato) => candidato.placa === placa);

  if (placa === '') {
    errores.placa = 'Escribe la placa del vehículo.';
  } else if (!PATRONES_PLACA.CARRO.test(placa) && !PATRONES_PLACA.MOTO.test(placa)) {
    errores.placa = 'La placa debe ser como ABC123 (carro) o ABC12D (moto).';
  } else if (!vehiculo) {
    errores.placa = 'No hay un vehículo registrado con esa placa.';
  }

  const textoTurno = String(valores.turno ?? '').trim();
  const turno = Number(textoTurno);
  if (textoTurno === '') {
    errores.turno = 'Escribe el turno.';
  } else if (!Number.isInteger(turno) || turno < LIMITES.turno.min) {
    errores.turno = `El turno debe ser un número entero desde ${LIMITES.turno.min}.`;
  }

  if (!valores.servicioId) {
    errores.servicioId = 'Elige el servicio.';
  }
  if (!valores.colaboradorId) {
    errores.colaboradorId = 'Elige el colaborador.';
  }
  if (!Object.values(MEDIOS_PAGO).includes(valores.medioPago)) {
    errores.medioPago = 'Elige el medio de pago.';
  }

  const esCredito = valores.medioPago === MEDIOS_PAGO.CREDITO;
  if (esCredito && !valores.clienteId) {
    errores.clienteId = 'Elige el cliente al que se le carga el crédito.';
  }

  const observaciones = String(valores.observaciones ?? '').trim();
  if (observaciones.length > LIMITES.observaciones.max) {
    errores.observaciones = `Máximo ${LIMITES.observaciones.max} caracteres.`;
  }

  const valido = Object.keys(errores).length === 0;
  if (!valido) {
    return { valido, errores, datos: null };
  }

  return {
    valido,
    errores,
    datos: {
      turno,
      vehiculoId: vehiculo.id,
      servicioId: Number(valores.servicioId),
      colaboradorId: Number(valores.colaboradorId),
      medioPago: valores.medioPago,
      ...(esCredito ? { clienteId: Number(valores.clienteId) } : {}),
      ...(exigeAutorizacionMotor(servicio) ? { autorizaMotor: Boolean(valores.autorizaMotor) } : {}),
      ...(observaciones ? { observaciones } : {}),
    },
  };
}

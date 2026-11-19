import { describe, expect, it } from 'vitest';

import { LIMITES, SERVICIOS_CON_LAVADO_MOTOR } from '@/constants/dominio';
import {
  exigeAutorizacionMotor,
  validarNuevaOrden,
  VALORES_INICIALES_ORDEN,
} from '@/features/ordenes-lavado/validators/ordenLavado.schema';

const VEHICULOS = [
  { id: 7, placa: 'AAA111' },
  { id: 8, placa: 'BBB22B' },
];

const COMPLETO = {
  ...VALORES_INICIALES_ORDEN,
  placa: 'aaa-111',
  turno: '3',
  servicioId: 2,
  colaboradorId: 4,
};

describe('validarNuevaOrden', () => {
  it('arma el cuerpo sin valor ni estado y con el id del vehículo de la placa', () => {
    const { valido, datos } = validarNuevaOrden(COMPLETO, { vehiculos: VEHICULOS });

    expect(valido).toBe(true);
    expect(datos).toEqual({ turno: 3, vehiculoId: 7, servicioId: 2, colaboradorId: 4, medioPago: 'efectivo' });
    expect(datos).not.toHaveProperty('valor');
    expect(datos).not.toHaveProperty('estado');
  });

  it('pide los campos obligatorios', () => {
    const { valido, errores } = validarNuevaOrden(VALORES_INICIALES_ORDEN, { vehiculos: VEHICULOS });

    expect(valido).toBe(false);
    expect(Object.keys(errores).sort()).toEqual(['colaboradorId', 'placa', 'servicioId', 'turno']);
  });

  it('valida el formato de la placa con los patrones del contrato', () => {
    expect(validarNuevaOrden({ ...COMPLETO, placa: 'AB1234' }, { vehiculos: VEHICULOS }).errores.placa).toMatch(
      /ABC123/,
    );
    expect(validarNuevaOrden({ ...COMPLETO, placa: 'CCC333' }, { vehiculos: VEHICULOS }).errores.placa).toMatch(
      /No hay un vehículo/,
    );
    expect(validarNuevaOrden({ ...COMPLETO, placa: 'bbb 22b' }, { vehiculos: VEHICULOS }).datos.vehiculoId).toBe(8);
  });

  it('exige un turno entero desde el mínimo del contrato', () => {
    const conTurno = (turno) => validarNuevaOrden({ ...COMPLETO, turno }, { vehiculos: VEHICULOS }).errores.turno;

    expect(conTurno(String(LIMITES.turno.min - 1))).toBeTruthy();
    expect(conTurno('2.5')).toBeTruthy();
    expect(conTurno(String(LIMITES.turno.min))).toBeUndefined();
  });

  it('con crédito exige el cliente y lo envía', () => {
    const sinCliente = validarNuevaOrden({ ...COMPLETO, medioPago: 'credito' }, { vehiculos: VEHICULOS });
    const conCliente = validarNuevaOrden({ ...COMPLETO, medioPago: 'credito', clienteId: '5' }, { vehiculos: VEHICULOS });

    expect(sinCliente.errores.clienteId).toBeTruthy();
    expect(conCliente.datos.clienteId).toBe(5);
  });

  it('solo envía autorizaMotor en los servicios que lo exigen', () => {
    const conMotor = { numero: SERVICIOS_CON_LAVADO_MOTOR[0] };
    const sinMotor = { numero: 1 };

    expect(validarNuevaOrden({ ...COMPLETO, autorizaMotor: true }, { vehiculos: VEHICULOS, servicio: conMotor }).datos.autorizaMotor).toBe(true);
    expect(validarNuevaOrden(COMPLETO, { vehiculos: VEHICULOS, servicio: sinMotor }).datos).not.toHaveProperty('autorizaMotor');
  });

  it('limita las observaciones con el máximo del contrato y no envía las vacías', () => {
    const larga = 'a'.repeat(LIMITES.observaciones.max + 1);

    expect(validarNuevaOrden({ ...COMPLETO, observaciones: larga }, { vehiculos: VEHICULOS }).errores.observaciones).toBeTruthy();
    expect(validarNuevaOrden({ ...COMPLETO, observaciones: '  ' }, { vehiculos: VEHICULOS }).datos).not.toHaveProperty('observaciones');
  });
});

describe('ayudas del formulario', () => {
  it('reconoce los servicios con lavado de motor del contrato', () => {
    expect(exigeAutorizacionMotor({ numero: SERVICIOS_CON_LAVADO_MOTOR[0] })).toBe(true);
    expect(exigeAutorizacionMotor({ numero: 1 })).toBe(false);
    expect(exigeAutorizacionMotor(null)).toBe(false);
  });
});

const { validationResult } = require('express-validator');
const {
  validarCobro,
  validarEgreso,
  validarCierre,
} = require('../../../src/middlewares/caja.validator');
const { validarResumen } = require('../../../src/middlewares/reportes.validator');
const {
  validarDescuento,
  validarLiquidacion,
} = require('../../../src/middlewares/nomina.validator');
const {
  validarMovimiento,
  validarCrear,
} = require('../../../src/middlewares/inventario.validator');
const {
  validarRegistrarPago,
  validarCondiciones,
  validarVerificarVale,
  validarMarcarVale,
} = require('../../../src/middlewares/credito.validator');

const ejecutar = async (validaciones, req) => {
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const camposConError = (resultado) => resultado.array().map((error) => error.path);

describe('caja.validator', () => {
  it('acepta un cobro en efectivo con lo recibido', async () => {
    const req = { body: { ordenId: 1, medioPago: 'efectivo', recibido: 50000 } };
    expect((await ejecutar(validarCobro, req)).isEmpty()).toBe(true);
  });

  it('exige empresa y vale a crédito, y pasa el vale a mayúsculas', async () => {
    const sinVale = await ejecutar(validarCobro, {
      body: { ordenId: 1, medioPago: 'credito', clienteId: 3 },
    });
    expect(camposConError(sinVale)).toContain('numeroVale');

    const req = { body: { ordenId: 1, medioPago: 'credito', clienteId: 3, numeroVale: ' ta-12 ' } };
    expect((await ejecutar(validarCobro, req)).isEmpty()).toBe(true);
    expect(req.body.numeroVale).toBe('TA-12');
  });

  it('rechaza un medio que no es del dominio, vale fuera de crédito y recibido fuera de efectivo', async () => {
    expect(
      camposConError(await ejecutar(validarCobro, { body: { ordenId: 1, medioPago: 'tarjeta' } })),
    ).toContain('medioPago');
    expect(
      camposConError(
        await ejecutar(validarCobro, {
          body: { ordenId: 1, medioPago: 'nequi', numeroVale: 'AB-1' },
        }),
      ),
    ).toContain('numeroVale');
    expect(
      camposConError(
        await ejecutar(validarCobro, { body: { ordenId: 1, medioPago: 'datafono', recibido: 1 } }),
      ),
    ).toContain('recibido');
  });

  it('valida egresos y cierre', async () => {
    expect(
      camposConError(await ejecutar(validarEgreso, { body: { categoria: 'viajes', valor: 0 } })),
    ).toEqual(['categoria', 'valor']);
    expect((await ejecutar(validarCierre, { body: { efectivoContado: 0 } })).isEmpty()).toBe(true);
  });
});

describe('reportes.validator', () => {
  it('acepta un periodo válido y rechaza uno invertido o de más de un año', async () => {
    expect(
      (
        await ejecutar(validarResumen, { query: { desde: '2026-11-01', hasta: '2026-11-30' } })
      ).isEmpty(),
    ).toBe(true);
    expect(
      camposConError(
        await ejecutar(validarResumen, { query: { desde: '2026-11-30', hasta: '2026-11-01' } }),
      ),
    ).toContain('hasta');
    expect(
      camposConError(
        await ejecutar(validarResumen, { query: { desde: '2024-01-01', hasta: '2026-01-01' } }),
      ),
    ).toContain('hasta');
  });
});

describe('nomina.validator', () => {
  it('solo registra a mano préstamo, jabón o multa', async () => {
    expect(
      (
        await ejecutar(validarDescuento, {
          body: { colaboradorId: 1, tipo: 'prestamo', valor: 1000 },
        })
      ).isEmpty(),
    ).toBe(true);
    expect(
      camposConError(
        await ejecutar(validarDescuento, { body: { colaboradorId: 1, tipo: 'cxc', valor: 1000 } }),
      ),
    ).toContain('tipo');
  });

  it('exige un periodo con fin después del inicio', async () => {
    expect(
      camposConError(
        await ejecutar(validarLiquidacion, { body: { inicio: '2026-11-16', fin: '2026-11-01' } }),
      ),
    ).toContain('fin');
  });
});

describe('inventario.validator', () => {
  it('no acepta un movimiento de cero y sí uno negativo', async () => {
    expect(camposConError(await ejecutar(validarMovimiento, { body: { cantidad: 0 } }))).toContain(
      'cantidad',
    );
    expect((await ejecutar(validarMovimiento, { body: { cantidad: -3 } })).isEmpty()).toBe(true);
  });

  it('exige nombre, categoría, unidad y mínimo al crear', async () => {
    expect(camposConError(await ejecutar(validarCrear, { body: {} }))).toEqual([
      'nombre',
      'categoria',
      'unidad',
      'stockMinimo',
    ]);
  });
});

describe('credito.validator (ADR 0007)', () => {
  it('acepta el medio del pago de la lista cerrada', async () => {
    const valido = { body: { clienteId: 1, ordenIds: [2], medio: 'cheque' } };
    expect((await ejecutar(validarRegistrarPago, valido)).isEmpty()).toBe(true);
    const invalido = { body: { clienteId: 1, ordenIds: [2], medio: 'tarjeta' } };
    expect(camposConError(await ejecutar(validarRegistrarPago, invalido))).toContain('medio');
  });

  it('valida cupo, corte y contacto, que pueden quedar vacíos', async () => {
    expect(
      (
        await ejecutar(validarCondiciones, { body: { cupoCredito: null, diaCorte: null } })
      ).isEmpty(),
    ).toBe(true);
    expect(
      camposConError(await ejecutar(validarCondiciones, { body: { diaCorte: 32 } })),
    ).toContain('diaCorte');
  });

  it('valida el número de vale y la casilla de verificado', async () => {
    expect(
      camposConError(await ejecutar(validarVerificarVale, { body: { clienteId: 1, numero: 'a' } })),
    ).toContain('numero');
    expect(
      camposConError(
        await ejecutar(validarMarcarVale, { params: { ordenId: '5' }, body: { verificado: 'si' } }),
      ),
    ).toContain('verificado');
  });
});

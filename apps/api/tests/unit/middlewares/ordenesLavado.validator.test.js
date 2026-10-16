const { validationResult } = require('express-validator');
const {
  validarCrear,
  validarCambioDeEstado,
} = require('../../../src/middlewares/ordenesLavado.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

/** YYYY-MM-DD en hora local, misma lógica que usa el validador para "hoy". */
const obtenerFechaLocal = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const fechaDeManana = () => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return obtenerFechaLocal(manana);
};

const ordenValida = {
  fecha: '2026-01-10',
  turno: 1,
  vehiculoId: 1,
  servicioId: 1,
  colaboradorId: 1,
  medioPago: 'efectivo',
};

describe('ordenesLavado.validator', () => {
  describe('validarCrear', () => {
    it('pasa con datos válidos, medioPago distinto de credito y sin clienteId', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, ordenValida);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con medioPago credito y clienteId presente', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        medioPago: 'credito',
        clienteId: 1,
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza medioPago credito sin clienteId, con el mensaje de la regla cruzada', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        medioPago: 'credito',
      });

      expect(resultado.isEmpty()).toBe(false);
      expect(
        resultado
          .array()
          .some((error) => error.msg === 'clienteId es obligatorio cuando medioPago es credito'),
      ).toBe(true);
    });

    it('rechaza campos obligatorios ausentes', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {});
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().length).toBeGreaterThan(0);
    });

    it('rechaza una fecha con formato inválido', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        fecha: '10-01-2026',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una fecha futura (calculada dinámicamente como "mañana")', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        fecha: fechaDeManana(),
      });

      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].msg).toBe('La fecha no puede ser futura');
    });

    it('rechaza un turno menor al mínimo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        turno: 0,
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un vehiculoId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        vehiculoId: -1,
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un servicioId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        servicioId: 0,
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un colaboradorId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        colaboradorId: -5,
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un medioPago que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        medioPago: 'bitcoin',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un autorizaMotor que no es booleano', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        autorizaMotor: 'si',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza unas observaciones que exceden el máximo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        observaciones: 'a'.repeat(256),
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('ignora "valor" y "estado" si se envían en la creación (no están en el contrato)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        valor: 999999,
        estado: 'entregada',
      });
      expect(resultado.isEmpty()).toBe(true);
    });
  });

  describe('validarCambioDeEstado', () => {
    it('pasa con un estado real del dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, {
        estado: 'en_proceso',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un estado que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { estado: 'pausada' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza cuando falta el campo estado', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, {});
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});

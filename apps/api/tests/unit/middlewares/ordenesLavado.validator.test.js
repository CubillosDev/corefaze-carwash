const { validationResult } = require('express-validator');
const {
  validarCrear,
  validarEditar,
  validarCambioDeEstado,
  validarFiltroListar,
} = require('../../../src/middlewares/ordenesLavado.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const ejecutarValidacionesDeQuery = async (validaciones, query) => {
  const req = { query };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const ordenValida = {
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

    it('ignora "fecha", "valor" y "estado" si se envían en la creación (no están en el contrato)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...ordenValida,
        fecha: '2026-01-10',
        valor: 999999,
        estado: 'entregada',
      });
      expect(resultado.isEmpty()).toBe(true);
    });
  });

  describe('validarEditar', () => {
    it('pasa sin enviar ningún campo (actualización vacía es válida en el validador)', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo vehiculoId', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, { vehiculoId: 2 });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo colaboradorId', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, { colaboradorId: 2 });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo observaciones', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, { observaciones: 'actualizado' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando medioPago credito junto con clienteId', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, {
        medioPago: 'credito',
        clienteId: 1,
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza medioPago credito sin clienteId en el mismo body', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, { medioPago: 'credito' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un vehiculoId inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, { vehiculoId: -1 });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('ignora "servicioId", "turno", "valor", "estado" y "fecha" (no son editables)', async () => {
      const resultado = await ejecutarValidaciones(validarEditar, {
        servicioId: 999,
        turno: 999,
        valor: 1,
        estado: 'entregada',
        fecha: '2026-01-10',
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

    it('pasa con un motivo de texto válido', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, {
        estado: 'cancelada',
        motivo: 'El cliente no llegó',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa sin motivo (la obligatoriedad al cancelar la decide el service, no el validador)', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { estado: 'cancelada' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un motivo que excede el máximo de caracteres', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, {
        estado: 'cancelada',
        motivo: 'a'.repeat(256),
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarFiltroListar', () => {
    it('pasa sin ningún filtro', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con los cuatro filtros nuevos válidos', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        colaboradorId: '1',
        servicioId: '1',
        medioPago: 'nequi',
        jornadaId: '1',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un colaboradorId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        colaboradorId: '-1',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un servicioId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        servicioId: '0',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un medioPago que no existe en el dominio', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        medioPago: 'bitcoin',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un jornadaId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        jornadaId: 'abc',
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});

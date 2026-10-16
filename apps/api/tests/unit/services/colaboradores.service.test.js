const colaboradores = require('../../../src/data/colaboradores');
const {
  listarColaboradores,
  obtenerColaboradorPorId,
  obtenerColaboradorOFallar,
  crearColaborador,
  actualizarColaborador,
  cambiarEstadoColaborador,
  eliminarColaborador,
} = require('../../../src/services/colaboradores.service');
const { NoEncontrado, Conflicto } = require('../../../src/utils/errores');

beforeEach(() => {
  colaboradores.length = 0;
});

const colaboradorValido = {
  codigo: 401,
  nombre: 'Juan Pérez',
  documento: '1020304050',
  telefono: '3001234567',
  porcentajeComision: 0.15,
  tipoVinculacion: 'fijo',
};

// Simula que un colaborador quedó inactivo hace `dias` días, manipulando
// directamente el dato guardado — más simple y determinista que usar
// temporizadores falsos de Jest para probar el período de gracia.
const marcarInactivoHaceNDias = (colaborador, dias) => {
  const fecha = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  Object.assign(colaborador, { estado: 'inactivo', inactivoDesde: fecha.toISOString() });
};

describe('colaboradores.service', () => {
  describe('crearColaborador', () => {
    it('crea un colaborador con id 1', () => {
      const colaborador = crearColaborador(colaboradorValido);
      expect(colaborador).toMatchObject({ id: 1, codigo: 401, estado: 'activo' });
    });

    it('todo colaborador nuevo nace activo, con inactivoDesde en null', () => {
      const colaborador = crearColaborador(colaboradorValido);
      expect(colaborador.estado).toBe('activo');
      expect(colaborador.inactivoDesde).toBeNull();
    });

    it('rechaza un código que pertenece a un colaborador activo (409)', () => {
      crearColaborador(colaboradorValido);
      expect(() => crearColaborador({ ...colaboradorValido, documento: '9999999999' })).toThrow(
        Conflicto,
      );
    });

    it('rechaza un documento duplicado, sin importar el estado (409)', () => {
      const creado = crearColaborador(colaboradorValido);
      marcarInactivoHaceNDias(creado, 100); // mucho más allá del período de gracia
      expect(() => crearColaborador({ ...colaboradorValido, codigo: 402 })).toThrow(Conflicto);
    });

    describe('reasignación de código tras el período de gracia (15 días)', () => {
      it('rechaza el código de un colaborador inactivo hace menos de 15 días', () => {
        const creado = crearColaborador(colaboradorValido);
        marcarInactivoHaceNDias(creado, 10);

        expect(() => crearColaborador({ ...colaboradorValido, documento: '9999999999' })).toThrow(
          Conflicto,
        );
      });

      it('permite reasignar el código de un colaborador inactivo hace más de 15 días', () => {
        const creado = crearColaborador(colaboradorValido);
        marcarInactivoHaceNDias(creado, 20);

        const nuevo = crearColaborador({ ...colaboradorValido, documento: '9999999999' });
        expect(nuevo.codigo).toBe(401);
      });

      it('exactamente en el límite (15 días) todavía protege el código', () => {
        const creado = crearColaborador(colaboradorValido);
        marcarInactivoHaceNDias(creado, 15);

        expect(() => crearColaborador({ ...colaboradorValido, documento: '9999999999' })).toThrow(
          Conflicto,
        );
      });
    });
  });

  describe('listarColaboradores / obtenerColaboradorPorId', () => {
    it('lista todos los colaboradores creados', () => {
      crearColaborador(colaboradorValido);
      crearColaborador({ ...colaboradorValido, codigo: 402, documento: '9999999999' });
      expect(listarColaboradores()).toHaveLength(2);
    });

    it('devuelve null si el id no existe', () => {
      expect(obtenerColaboradorPorId(999)).toBeNull();
    });
  });

  describe('obtenerColaboradorOFallar', () => {
    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => obtenerColaboradorOFallar(999)).toThrow(NoEncontrado);
    });
  });

  describe('actualizarColaborador', () => {
    it('actualiza el porcentaje de comisión', () => {
      const creado = crearColaborador(colaboradorValido);
      const actualizado = actualizarColaborador(creado.id, { porcentajeComision: 0.2 });
      expect(actualizado.porcentajeComision).toBe(0.2);
    });

    it('al pasar a inactivo, registra inactivoDesde', () => {
      const creado = crearColaborador(colaboradorValido);
      const actualizado = actualizarColaborador(creado.id, { estado: 'inactivo' });
      expect(actualizado.inactivoDesde).not.toBeNull();
    });

    it('al reactivar (mismo colaborador vuelve), limpia inactivoDesde', () => {
      const creado = crearColaborador(colaboradorValido);
      actualizarColaborador(creado.id, { estado: 'inactivo' });
      const reactivado = actualizarColaborador(creado.id, { estado: 'activo' });
      expect(reactivado.inactivoDesde).toBeNull();
    });

    it('rechaza cambiar a un código ocupado por otro colaborador activo', () => {
      crearColaborador(colaboradorValido);
      const otro = crearColaborador({ ...colaboradorValido, codigo: 402, documento: '9999999999' });
      expect(() => actualizarColaborador(otro.id, { codigo: 401 })).toThrow(Conflicto);
    });

    it('permite conservar el propio código sin conflicto al actualizar otros campos', () => {
      const creado = crearColaborador(colaboradorValido);
      expect(() =>
        actualizarColaborador(creado.id, { codigo: 401, nombre: 'Juan P.' }),
      ).not.toThrow();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => actualizarColaborador(999, { nombre: 'x' })).toThrow(NoEncontrado);
    });
  });

  describe('cambiarEstadoColaborador', () => {
    it('cambia el estado a inactivo y registra inactivoDesde', () => {
      const creado = crearColaborador(colaboradorValido);
      const actualizado = cambiarEstadoColaborador(creado.id, 'inactivo');
      expect(actualizado.estado).toBe('inactivo');
      expect(actualizado.inactivoDesde).not.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => cambiarEstadoColaborador(999, 'inactivo')).toThrow(NoEncontrado);
    });
  });

  describe('eliminarColaborador', () => {
    it('elimina un colaborador existente', () => {
      const creado = crearColaborador(colaboradorValido);
      eliminarColaborador(creado.id);
      expect(obtenerColaboradorPorId(creado.id)).toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => eliminarColaborador(999)).toThrow(NoEncontrado);
    });
  });
});

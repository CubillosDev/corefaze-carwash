const clientes = require('../../../src/data/clientes');
const {
  listarClientes,
  obtenerClientePorId,
  obtenerClienteOFallar,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} = require('../../../src/services/clientes.service');
const { NoEncontrado, Conflicto } = require('../../../src/utils/errores');

beforeEach(() => {
  clientes.length = 0;
});

const clienteParticular = {
  nombre: 'Ana María Torres',
  documento: '1010101010',
  tipo: 'particular',
  telefono: '3001234567',
};

const clienteEmpresa = {
  nombre: 'EBSA S.A.',
  documento: '900123456',
  tipo: 'empresa',
  telefono: '3007654321',
  creditoHabilitado: true,
};

describe('clientes.service', () => {
  describe('crearCliente', () => {
    it('crea un cliente particular con id 1', () => {
      const cliente = crearCliente(clienteParticular);
      expect(cliente).toMatchObject({ id: 1, nombre: clienteParticular.nombre, estado: 'activo' });
    });

    it('asigna ids consecutivos', () => {
      crearCliente(clienteParticular);
      const segundo = crearCliente({ ...clienteEmpresa });
      expect(segundo.id).toBe(2);
    });

    it('permite creditoHabilitado: true cuando tipo es empresa', () => {
      const cliente = crearCliente(clienteEmpresa);
      expect(cliente.creditoHabilitado).toBe(true);
    });

    it('fuerza creditoHabilitado a false para un particular, aunque se envíe true', () => {
      const cliente = crearCliente({ ...clienteParticular, creditoHabilitado: true });
      expect(cliente.creditoHabilitado).toBe(false);
    });

    it('un cliente sin email guarda null', () => {
      const cliente = crearCliente(clienteParticular);
      expect(cliente.email).toBeNull();
    });

    it('todo cliente nuevo nace activo', () => {
      const cliente = crearCliente(clienteParticular);
      expect(cliente.estado).toBe('activo');
    });

    it('rechaza un documento duplicado (409)', () => {
      crearCliente(clienteParticular);
      expect(() =>
        crearCliente({ ...clienteEmpresa, documento: clienteParticular.documento }),
      ).toThrow(Conflicto);
    });
  });

  describe('listarClientes / obtenerClientePorId', () => {
    it('lista todos los clientes creados', () => {
      crearCliente(clienteParticular);
      crearCliente(clienteEmpresa);
      expect(listarClientes()).toHaveLength(2);
    });

    it('obtiene un cliente por id', () => {
      const creado = crearCliente(clienteParticular);
      expect(obtenerClientePorId(creado.id)).toMatchObject({
        documento: clienteParticular.documento,
      });
    });

    it('devuelve null si el id no existe', () => {
      expect(obtenerClientePorId(999)).toBeNull();
    });
  });

  describe('obtenerClienteOFallar', () => {
    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => obtenerClienteOFallar(999)).toThrow(NoEncontrado);
    });
  });

  describe('actualizarCliente', () => {
    it('actualiza los campos enviados', () => {
      const creado = crearCliente(clienteParticular);
      const actualizado = actualizarCliente(creado.id, { telefono: '3009999999' });
      expect(actualizado.telefono).toBe('3009999999');
    });

    it('conserva los campos no enviados', () => {
      const creado = crearCliente(clienteParticular);
      const actualizado = actualizarCliente(creado.id, { telefono: '3009999999' });
      expect(actualizado.nombre).toBe(clienteParticular.nombre);
    });

    it('permite cambiar de particular a empresa y habilitar crédito en el mismo cambio', () => {
      const creado = crearCliente(clienteParticular);
      const actualizado = actualizarCliente(creado.id, {
        tipo: 'empresa',
        creditoHabilitado: true,
      });
      expect(actualizado.creditoHabilitado).toBe(true);
    });

    it('si pasa de empresa a particular, apaga creditoHabilitado aunque no se pida', () => {
      const creado = crearCliente(clienteEmpresa);
      const actualizado = actualizarCliente(creado.id, { tipo: 'particular' });
      expect(actualizado.creditoHabilitado).toBe(false);
    });

    it('rechaza cambiar a un documento que ya usa otro cliente', () => {
      crearCliente(clienteParticular);
      const otro = crearCliente(clienteEmpresa);
      expect(() => actualizarCliente(otro.id, { documento: clienteParticular.documento })).toThrow(
        Conflicto,
      );
    });

    it('permite reenviar el mismo documento propio sin conflicto', () => {
      const creado = crearCliente(clienteParticular);
      expect(() =>
        actualizarCliente(creado.id, { documento: clienteParticular.documento }),
      ).not.toThrow();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => actualizarCliente(999, { nombre: 'x' })).toThrow(NoEncontrado);
    });
  });

  describe('eliminarCliente', () => {
    it('elimina un cliente existente', () => {
      const creado = crearCliente(clienteParticular);
      eliminarCliente(creado.id);
      expect(obtenerClientePorId(creado.id)).toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => eliminarCliente(999)).toThrow(NoEncontrado);
    });
  });
});

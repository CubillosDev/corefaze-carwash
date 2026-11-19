const {
  listarClientes,
  obtenerClientePorId,
  obtenerClienteOFallar,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} = require('../../../src/services/clientes.service');
const { NoEncontrado, Conflicto } = require('../../../src/utils/errores');
const { generarSello, crearGeneradorDeValorUnico } = require('../../utils/valorUnico');

// clientes.service.js ya consulta el Supabase local (SCRUM-152, Etapa A),
// no un array en memoria: estas pruebas corren contra ese stack
// (`npx supabase start`), nunca contra el remoto (ver tests/setupEnv.js).
// El documento es único por llamada (salto aleatorio + contador) porque la
// tabla ya no se puede "vaciar" entre pruebas como el array anterior.
const USUARIO_ID_PRUEBA = 1;
const documentoUnico = crearGeneradorDeValorUnico(
  generarSello(),
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);

const clienteParticular = () => ({
  nombre: 'Ana María Torres',
  documento: documentoUnico(),
  tipo: 'particular',
  telefono: '3001234567',
});

const clienteEmpresa = () => ({
  nombre: 'EBSA S.A.',
  documento: documentoUnico(),
  tipo: 'empresa',
  telefono: '3007654321',
  creditoHabilitado: true,
});

describe('clientes.service', () => {
  describe('crearCliente', () => {
    it('crea un cliente particular con un id numérico', async () => {
      const cliente = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      expect(cliente).toMatchObject({ estado: 'activo' });
      expect(typeof cliente.id).toBe('number');
    });

    it('asigna ids distintos a cada cliente nuevo', async () => {
      const primero = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      const segundo = await crearCliente(clienteEmpresa(), USUARIO_ID_PRUEBA);
      expect(segundo.id).not.toBe(primero.id);
    });

    it('permite creditoHabilitado: true cuando tipo es empresa', async () => {
      const cliente = await crearCliente(clienteEmpresa(), USUARIO_ID_PRUEBA);
      expect(cliente.creditoHabilitado).toBe(true);
    });

    it('fuerza creditoHabilitado a false para un particular, aunque se envíe true', async () => {
      const cliente = await crearCliente(
        { ...clienteParticular(), creditoHabilitado: true },
        USUARIO_ID_PRUEBA,
      );
      expect(cliente.creditoHabilitado).toBe(false);
    });

    it('un cliente sin email guarda null', async () => {
      const cliente = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      expect(cliente.email).toBeNull();
    });

    it('todo cliente nuevo nace activo', async () => {
      const cliente = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      expect(cliente.estado).toBe('activo');
    });

    it('rechaza un documento duplicado (409)', async () => {
      const datos = clienteParticular();
      await crearCliente(datos, USUARIO_ID_PRUEBA);
      await expect(
        crearCliente({ ...clienteEmpresa(), documento: datos.documento }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });
  });

  describe('listarClientes / obtenerClientePorId', () => {
    it('la lista incluye los clientes recién creados', async () => {
      const primero = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      const segundo = await crearCliente(clienteEmpresa(), USUARIO_ID_PRUEBA);

      const ids = (await listarClientes()).map((cliente) => cliente.id);
      expect(ids).toEqual(expect.arrayContaining([primero.id, segundo.id]));
    });

    it('obtiene un cliente por id', async () => {
      const datos = clienteParticular();
      const creado = await crearCliente(datos, USUARIO_ID_PRUEBA);
      await expect(obtenerClientePorId(creado.id)).resolves.toMatchObject({
        documento: datos.documento,
      });
    });

    it('devuelve null si el id no existe', async () => {
      await expect(obtenerClientePorId(999999999)).resolves.toBeNull();
    });
  });

  describe('obtenerClienteOFallar', () => {
    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerClienteOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('actualizarCliente', () => {
    it('actualiza los campos enviados', async () => {
      const creado = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarCliente(
        creado.id,
        { telefono: '3009999999' },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.telefono).toBe('3009999999');
    });

    it('conserva los campos no enviados', async () => {
      const datos = clienteParticular();
      const creado = await crearCliente(datos, USUARIO_ID_PRUEBA);
      const actualizado = await actualizarCliente(
        creado.id,
        { telefono: '3009999999' },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.nombre).toBe(datos.nombre);
    });

    it('permite cambiar de particular a empresa y habilitar crédito en el mismo cambio', async () => {
      const creado = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarCliente(
        creado.id,
        { tipo: 'empresa', creditoHabilitado: true },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.creditoHabilitado).toBe(true);
    });

    it('si pasa de empresa a particular, apaga creditoHabilitado aunque no se pida', async () => {
      const creado = await crearCliente(clienteEmpresa(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarCliente(
        creado.id,
        { tipo: 'particular' },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.creditoHabilitado).toBe(false);
    });

    it('rechaza cambiar a un documento que ya usa otro cliente', async () => {
      const datosParticular = clienteParticular();
      await crearCliente(datosParticular, USUARIO_ID_PRUEBA);
      const otro = await crearCliente(clienteEmpresa(), USUARIO_ID_PRUEBA);

      await expect(
        actualizarCliente(otro.id, { documento: datosParticular.documento }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('permite reenviar el mismo documento propio sin conflicto', async () => {
      const datos = clienteParticular();
      const creado = await crearCliente(datos, USUARIO_ID_PRUEBA);
      await expect(
        actualizarCliente(creado.id, { documento: datos.documento }, USUARIO_ID_PRUEBA),
      ).resolves.toBeDefined();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(
        actualizarCliente(999999999, { nombre: 'x' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });
  });

  describe('eliminarCliente', () => {
    it('elimina un cliente existente', async () => {
      const creado = await crearCliente(clienteParticular(), USUARIO_ID_PRUEBA);
      await eliminarCliente(creado.id, USUARIO_ID_PRUEBA);
      await expect(obtenerClientePorId(creado.id)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(eliminarCliente(999999999, USUARIO_ID_PRUEBA)).rejects.toThrow(NoEncontrado);
    });
  });
});

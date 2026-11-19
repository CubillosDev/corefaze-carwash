const { supabase } = require('../../../src/db/supabaseCliente');
const { aCamelCase } = require('../../../src/utils/mapearCampos');
const clientesService = require('../../../src/services/clientes.service');
const vehiculosService = require('../../../src/services/vehiculos.service');
const colaboradoresService = require('../../../src/services/colaboradores.service');
const serviciosService = require('../../../src/services/servicios.service');
const jornadasService = require('../../../src/services/jornadas.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listarClientesConCredito,
  listarOrdenesPendientesDeCliente,
  obtenerPagoPorId,
  obtenerPagoOFallar,
  listarPagos,
  registrarPagoCredito,
  registrarVale,
  marcarVerificacion,
} = require('../../../src/services/credito.service');
const { NoEncontrado, Conflicto, SolicitudInvalida } = require('../../../src/utils/errores');
const { generarSello, crearGeneradorDeValorUnico } = require('../../utils/valorUnico');

const USUARIO_ID_PRUEBA = 1;

// Mismo patrón de fixtures que ordenesLavado.service.test.js: cada
// recurso ya escribe en el Supabase local (SCRUM-152), así que cada valor
// único (documento, placa, código, número, turno) usa un sello aleatorio
// + contador para no chocar ni dentro de esta corrida ni con otro archivo
// que Jest ejecute en paralelo contra el mismo Supabase.
const selloDocumento = generarSello();

const siguienteDocumentoCliente = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);

const crearClienteConCreditoDePrueba = (datos = {}) =>
  clientesService.crearCliente(
    {
      nombre: 'Constructora Ejemplo S.A.S.',
      documento: siguienteDocumentoCliente(),
      tipo: 'empresa',
      telefono: '3001234567',
      creditoHabilitado: true,
      ...datos,
    },
    USUARIO_ID_PRUEBA,
  );

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoria = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
const prefijoPlaca = `${letraAleatoria()}${letraAleatoria()}${letraAleatoria()}`;
let contadorPlaca = 0;
const siguientePlaca = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const crearVehiculoDePrueba = (clienteId) =>
  vehiculosService.crearVehiculo(
    { placa: siguientePlaca(), tipoVehiculo: 'automovil', clienteId },
    USUARIO_ID_PRUEBA,
  );

const documentoUnicoColaborador = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `${sello}C${String(contador).padStart(3, '0')}`,
);
const codigosOcupadosColaborador = new Set();
let siguienteIntentoCodigoColaborador = Math.floor(Math.random() * 900);

beforeAll(async () => {
  const { data, error } = await supabase.from('colaboradores').select('codigo');
  if (error) {
    throw error;
  }
  data.forEach((fila) => codigosOcupadosColaborador.add(fila.codigo));
});

const codigoUnicoColaborador = () => {
  for (let intento = 0; intento < 900; intento += 1) {
    const candidato = 100 + ((siguienteIntentoCodigoColaborador + intento) % 900);
    if (!codigosOcupadosColaborador.has(candidato)) {
      codigosOcupadosColaborador.add(candidato);
      siguienteIntentoCodigoColaborador += intento + 1;
      return candidato;
    }
  }
  throw new Error('No quedan códigos de colaborador libres (hace falta un db reset)');
};

// Un solo colaborador y un solo servicio, compartidos por todo el
// archivo: estas pruebas solo necesitan "un colaborador activo" y "un
// servicio con tarifa para automóvil" válidos, nunca uno distinto por caso.
let colaboradorCompartido = null;
const obtenerColaboradorCompartido = async () => {
  if (!colaboradorCompartido) {
    colaboradorCompartido = await colaboradoresService.crearColaborador(
      {
        codigo: codigoUnicoColaborador(),
        nombre: 'Juan Pérez',
        documento: documentoUnicoColaborador(),
        telefono: '3001234567',
        porcentajeComision: 0.15,
        tipoVinculacion: 'fijo',
      },
      USUARIO_ID_PRUEBA,
    );
  }
  return colaboradorCompartido;
};

const selloNumeroServicio = 1000 + Math.floor(Math.random() * 20000);
const numeroUnicoServicio = crearGeneradorDeValorUnico(
  selloNumeroServicio,
  (sello, contador) => sello + contador,
);
let servicioCompartido = null;
const obtenerServicioCompartido = async () => {
  if (!servicioCompartido) {
    servicioCompartido = await serviciosService.crearServicio(
      {
        numero: numeroUnicoServicio(),
        nombre: 'Lavado básico',
        descripcion: 'Lavado exterior con shampoo',
        categoria: 'basico',
        tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
      },
      USUARIO_ID_PRUEBA,
    );
  }
  return servicioCompartido;
};

// idx_jornadas_una_abierta es GLOBAL: cierra cualquier otra jornada abierta
// (de este archivo o de cualquier otro) antes de abrir la propia. Fecha
// arbitraria y única (nunca "hoy"): las órdenes quedan amarradas a ella
// para siempre (on delete restrict + impedir_eliminacion).
const anioBaseJornada = 1000 + Math.floor(Math.random() * 9000);
let contadorDiaJornada = Math.floor(Math.random() * 300);

const abrirJornadaDePrueba = async () => {
  contadorDiaJornada += 1;
  const fecha = new Date(anioBaseJornada, 0, contadorDiaJornada).toISOString().slice(0, 10);

  const abierta = await jornadasService.obtenerJornadaAbierta();
  if (abierta) {
    await jornadasService.cerrarJornada(abierta.id, USUARIO_ID_PRUEBA);
  }

  const { data, error } = await supabase
    .from('jornadas')
    .insert({ fecha, abierta_por: USUARIO_ID_PRUEBA })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return aCamelCase(data);
};

let contadorTurno = 0;
const siguienteTurno = () => {
  contadorTurno += 1;
  return contadorTurno;
};

const numeroUnicoVale = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `VALE-${sello}-${contador}`,
);

/** Registra el vale de la orden y lo marca verificado: requisito para poder pagarla (R12). */
const crearValeVerificadoDePrueba = async (ordenId) => {
  await registrarVale({ ordenId, numero: numeroUnicoVale() }, USUARIO_ID_PRUEBA);
  await marcarVerificacion(ordenId, true, USUARIO_ID_PRUEBA);
};

/**
 * Crea una orden a crédito para el cliente dado, en el estado pedido (por
 * defecto, 'entregada'), con su vale ya verificado (por defecto: `conVale`
 * solo se pone en `false` para probar el 409 de "vale no verificado").
 */
const crearOrdenCreditoDePrueba = async (
  cliente,
  { estado = 'entregada', conVale = true } = {},
) => {
  const vehiculo = await crearVehiculoDePrueba(cliente.id);
  const colaborador = await obtenerColaboradorCompartido();
  const servicio = await obtenerServicioCompartido();

  const orden = await ordenesLavadoService.crearOrden(
    {
      turno: siguienteTurno(),
      vehiculoId: vehiculo.id,
      servicioId: servicio.id,
      colaboradorId: colaborador.id,
      medioPago: 'credito',
      clienteId: cliente.id,
    },
    USUARIO_ID_PRUEBA,
  );

  if (conVale) {
    await crearValeVerificadoDePrueba(orden.id);
  }

  if (estado === 'registrada') {
    return orden;
  }

  await ordenesLavadoService.cambiarEstadoOrden(
    orden.id,
    'en_proceso',
    undefined,
    USUARIO_ID_PRUEBA,
  );
  if (estado === 'en_proceso') {
    return ordenesLavadoService.obtenerOrdenOFallar(orden.id);
  }

  await ordenesLavadoService.cambiarEstadoOrden(
    orden.id,
    'terminada',
    undefined,
    USUARIO_ID_PRUEBA,
  );
  if (estado === 'terminada') {
    return ordenesLavadoService.obtenerOrdenOFallar(orden.id);
  }

  return ordenesLavadoService.cambiarEstadoOrden(
    orden.id,
    'entregada',
    undefined,
    USUARIO_ID_PRUEBA,
  );
};

describe('credito.service', () => {
  describe('listarClientesConCredito', () => {
    it('incluye un cliente con crédito aunque no tenga ninguna orden pendiente (saldoPendiente 0)', async () => {
      const cliente = await crearClienteConCreditoDePrueba();

      const clientes = await listarClientesConCredito();

      expect(clientes.find((c) => c.id === cliente.id)).toMatchObject({ saldoPendiente: 0 });
    });

    it('excluye un cliente sin crédito habilitado', async () => {
      const clienteSinCredito = await clientesService.crearCliente(
        {
          nombre: 'Particular de prueba',
          documento: siguienteDocumentoCliente(),
          tipo: 'particular',
          telefono: '3001234567',
        },
        USUARIO_ID_PRUEBA,
      );

      const clientes = await listarClientesConCredito();

      expect(clientes.find((c) => c.id === clienteSinCredito.id)).toBeUndefined();
    });

    it('el saldoPendiente suma el valor de las órdenes a crédito no pagadas, sin importar su estado operativo', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      await crearOrdenCreditoDePrueba(cliente, { estado: 'entregada' }); // 15000
      await crearOrdenCreditoDePrueba(cliente, { estado: 'registrada' }); // 15000, aún no entregada pero ya es deuda

      const clientes = await listarClientesConCredito();

      expect(clientes.find((c) => c.id === cliente.id).saldoPendiente).toBe(30000);
    });

    it('una orden cancelada no suma al saldo pendiente', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente, { estado: 'registrada' });
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'cancelada',
        'Cliente canceló',
        USUARIO_ID_PRUEBA,
      );

      const clientes = await listarClientesConCredito();

      expect(clientes.find((c) => c.id === cliente.id).saldoPendiente).toBe(0);
    });

    it('una orden ya pagada deja de sumar al saldo pendiente', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);

      await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      const clientes = await listarClientesConCredito();
      expect(clientes.find((c) => c.id === cliente.id).saldoPendiente).toBe(0);
    });

    it('incluye un cliente al que ya se le deshabilitó el crédito, mientras tenga deuda sin pagar', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      await crearOrdenCreditoDePrueba(cliente, { estado: 'registrada' }); // 15000, aún deuda

      await clientesService.actualizarCliente(
        cliente.id,
        { creditoHabilitado: false },
        USUARIO_ID_PRUEBA,
      );

      const clientes = await listarClientesConCredito();
      expect(clientes.find((c) => c.id === cliente.id)).toMatchObject({
        creditoHabilitado: false,
        saldoPendiente: 15000,
      });
    });

    it('distingue saldoPendiente (toda la deuda) de saldoPagable/cantidadOrdenesPagables (solo entregadas)', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      await crearOrdenCreditoDePrueba(cliente, { estado: 'entregada' }); // 15000, pagable
      await crearOrdenCreditoDePrueba(cliente, { estado: 'registrada' }); // 15000, deuda pero no pagable aún

      const clientes = await listarClientesConCredito();

      expect(clientes.find((c) => c.id === cliente.id)).toMatchObject({
        saldoPendiente: 30000,
        saldoPagable: 15000,
        cantidadOrdenesPagables: 1,
      });
    });

    it('no trunca el saldo cuando hay más de 1000 órdenes pendientes (mock de Supabase, ver max_rows en supabase/config.toml)', async () => {
      const CLIENTE_ID = 777;
      const TOTAL_ORDENES = 1001;
      const ordenesFalsas = Array.from({ length: TOTAL_ORDENES }, (_, indice) => ({
        cliente_id: CLIENTE_ID,
        valor: 1,
        estado: indice % 2 === 0 ? 'entregada' : 'registrada',
      }));
      const clienteFalso = {
        id: CLIENTE_ID,
        nombre: 'Cliente Mock',
        documento: 'MOCKDOC001',
        telefono: '3000000000',
        email: null,
        estado: 'activo',
        credito_habilitado: false,
      };

      // Constructor falso de un query builder de Postgrest: .select/.eq/.is/
      // .neq/.in/.order no filtran de verdad (devuelven las mismas filas
      // completas vía .then), solo .range() las pagina — suficiente para
      // probar que traerTodasLasFilas no se detiene en la página 1000.
      const construirTablaFalsa = (filas) => {
        const builder = {};
        ['select', 'eq', 'is', 'neq', 'in', 'order'].forEach((metodo) => {
          builder[metodo] = jest.fn(() => builder);
        });
        builder.range = jest.fn((desde, hasta) =>
          Promise.resolve({ data: filas.slice(desde, hasta + 1), error: null }),
        );
        builder.then = (resolver) => resolver({ data: filas, error: null });
        return builder;
      };

      const tablasFalsas = {
        ordenes_lavado: construirTablaFalsa(ordenesFalsas),
        clientes: construirTablaFalsa([clienteFalso]),
      };

      const espiaFrom = jest
        .spyOn(supabase, 'from')
        .mockImplementation((tabla) => tablasFalsas[tabla]);

      try {
        const clientes = await listarClientesConCredito();
        const encontrado = clientes.find((c) => c.id === CLIENTE_ID);
        const entregadas = ordenesFalsas.filter((o) => o.estado === 'entregada').length;

        expect(encontrado.saldoPendiente).toBe(TOTAL_ORDENES);
        expect(encontrado.cantidadOrdenesPagables).toBe(entregadas);
        expect(encontrado.saldoPagable).toBe(entregadas);
        // 1001 filas en 2 páginas de .range(): prueba que sí se pidió la segunda.
        expect(tablasFalsas.ordenes_lavado.range).toHaveBeenCalledTimes(2);
      } finally {
        espiaFrom.mockRestore();
      }
    });
  });

  describe('listarOrdenesPendientesDeCliente', () => {
    it('lanza NoEncontrado si el cliente no existe', async () => {
      await expect(listarOrdenesPendientesDeCliente(999999999)).rejects.toThrow(NoEncontrado);
    });

    it('incluye solo las órdenes a crédito ya entregadas y sin pago', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const entregada = await crearOrdenCreditoDePrueba(cliente, { estado: 'entregada' });
      await crearOrdenCreditoDePrueba(cliente, { estado: 'registrada' });
      await crearOrdenCreditoDePrueba(cliente, { estado: 'en_proceso' });

      const ordenes = await listarOrdenesPendientesDeCliente(cliente.id);

      expect(ordenes.map((orden) => orden.id)).toEqual([entregada.id]);
    });

    it('no incluye una orden ya pagada', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);

      await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      const ordenes = await listarOrdenesPendientesDeCliente(cliente.id);
      expect(ordenes.map((o) => o.id)).not.toContain(orden.id);
    });

    it('no incluye una orden cancelada', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente, { estado: 'registrada' });
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'cancelada',
        'Cliente canceló',
        USUARIO_ID_PRUEBA,
      );

      const ordenes = await listarOrdenesPendientesDeCliente(cliente.id);
      expect(ordenes.map((o) => o.id)).not.toContain(orden.id);
    });

    it('incluye los datos legibles de vehículo, servicio y colaborador (no solo sus ids)', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const vehiculo = await crearVehiculoDePrueba(cliente.id);
      const colaborador = await obtenerColaboradorCompartido();
      const servicio = await obtenerServicioCompartido();

      const orden = await ordenesLavadoService.crearOrden(
        {
          turno: siguienteTurno(),
          vehiculoId: vehiculo.id,
          servicioId: servicio.id,
          colaboradorId: colaborador.id,
          medioPago: 'credito',
          clienteId: cliente.id,
        },
        USUARIO_ID_PRUEBA,
      );
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'en_proceso',
        undefined,
        USUARIO_ID_PRUEBA,
      );
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'terminada',
        undefined,
        USUARIO_ID_PRUEBA,
      );
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'entregada',
        undefined,
        USUARIO_ID_PRUEBA,
      );

      const ordenes = await listarOrdenesPendientesDeCliente(cliente.id);

      expect(ordenes.find((o) => o.id === orden.id)).toMatchObject({
        vehiculo: { placa: vehiculo.placa },
        servicio: { nombre: servicio.nombre },
        colaborador: { codigo: colaborador.codigo, nombre: colaborador.nombre },
      });
    });
  });

  describe('registrarPagoCredito', () => {
    it('caso válido: registra el pago con el valor total correcto y marca las órdenes', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const primera = await crearOrdenCreditoDePrueba(cliente);
      const segunda = await crearOrdenCreditoDePrueba(cliente);

      const pago = await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [primera.id, segunda.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      expect(pago).toMatchObject({
        clienteId: cliente.id,
        valorTotal: primera.valor + segunda.valor,
        registradoPor: USUARIO_ID_PRUEBA,
      });
      expect(pago.pagadoEn).toBeDefined();
      expect(pago.detalle).toMatchObject({ medio: 'transferencia' });
      expect(pago.ordenes.map((orden) => orden.id).sort()).toEqual([primera.id, segunda.id].sort());

      const ordenesPendientes = await listarOrdenesPendientesDeCliente(cliente.id);
      expect(ordenesPendientes).toEqual([]);
    });

    it('lanza NoEncontrado si el cliente no existe', async () => {
      await expect(
        registrarPagoCredito(
          { clienteId: 999999999, ordenIds: [1], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(NoEncontrado);
    });

    it('lanza SolicitudInvalida si el arreglo de órdenes viene vacío', async () => {
      const cliente = await crearClienteConCreditoDePrueba();
      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('lanza SolicitudInvalida si el arreglo de órdenes tiene ids repetidos', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);

      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [orden.id, orden.id], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('lanza NoEncontrado si alguna de las órdenes indicadas no existe', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);

      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [orden.id, 999999999], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(NoEncontrado);
    });

    it('lanza Conflicto si alguna orden es de otro cliente', async () => {
      await abrirJornadaDePrueba();
      const clienteA = await crearClienteConCreditoDePrueba();
      const clienteB = await crearClienteConCreditoDePrueba();
      const ordenDeB = await crearOrdenCreditoDePrueba(clienteB);

      await expect(
        registrarPagoCredito(
          { clienteId: clienteA.id, ordenIds: [ordenDeB.id], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si alguna orden todavía no está entregada', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const ordenEnProceso = await crearOrdenCreditoDePrueba(cliente, { estado: 'en_proceso' });

      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [ordenEnProceso.id], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si alguna orden ya tiene un pago registrado', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);
      await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    // R12 (hallazgo de seguridad, PR fix/CW_API_DUrbano_PagoCreditoExigeVale):
    // antes existía una ruta (sin "medio" en el body) que pagaba sin exigir
    // el vale verificado. Ahora el service siempre llama a
    // registrar_pago_credito_con_medio, que lo exige sin excepción.
    it('lanza Conflicto si alguna orden no tiene el vale verificado', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const sinVale = await crearOrdenCreditoDePrueba(cliente, { conVale: false });

      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [sinVale.id], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);

      const ordenesPendientes = await listarOrdenesPendientesDeCliente(cliente.id);
      expect(ordenesPendientes.map((orden) => orden.id)).toContain(sinVale.id);
    });

    it('todo o nada: si el pago falla, ninguna de las órdenes indicadas queda marcada', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const yaPagada = await crearOrdenCreditoDePrueba(cliente);
      const valida = await crearOrdenCreditoDePrueba(cliente);
      await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [yaPagada.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      await expect(
        registrarPagoCredito(
          { clienteId: cliente.id, ordenIds: [yaPagada.id, valida.id], medio: 'transferencia' },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);

      const ordenesPendientes = await listarOrdenesPendientesDeCliente(cliente.id);
      expect(ordenesPendientes.map((orden) => orden.id)).toContain(valida.id);
    });
  });

  describe('obtenerPagoPorId / obtenerPagoOFallar', () => {
    it('devuelve null si el id no existe', async () => {
      await expect(obtenerPagoPorId(999999999)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerPagoOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });

    it('devuelve el pago con sus órdenes', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);
      const pagoCreado = await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      await expect(obtenerPagoOFallar(pagoCreado.id)).resolves.toMatchObject({
        id: pagoCreado.id,
        clienteId: cliente.id,
      });
    });

    it('las órdenes del pago incluyen los datos legibles de vehículo, servicio y colaborador', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const vehiculo = await crearVehiculoDePrueba(cliente.id);
      const colaborador = await obtenerColaboradorCompartido();
      const servicio = await obtenerServicioCompartido();

      const orden = await ordenesLavadoService.crearOrden(
        {
          turno: siguienteTurno(),
          vehiculoId: vehiculo.id,
          servicioId: servicio.id,
          colaboradorId: colaborador.id,
          medioPago: 'credito',
          clienteId: cliente.id,
        },
        USUARIO_ID_PRUEBA,
      );
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'en_proceso',
        undefined,
        USUARIO_ID_PRUEBA,
      );
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'terminada',
        undefined,
        USUARIO_ID_PRUEBA,
      );
      await ordenesLavadoService.cambiarEstadoOrden(
        orden.id,
        'entregada',
        undefined,
        USUARIO_ID_PRUEBA,
      );
      await crearValeVerificadoDePrueba(orden.id);

      const pagoCreado = await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      const pago = await obtenerPagoOFallar(pagoCreado.id);
      expect(pago.ordenes[0]).toMatchObject({
        vehiculo: { placa: vehiculo.placa },
        servicio: { nombre: servicio.nombre },
        colaborador: { codigo: colaborador.codigo, nombre: colaborador.nombre },
      });
    });
  });

  describe('listarPagos', () => {
    it('incluye los pagos recién creados, con el total y la página por defecto', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const orden = await crearOrdenCreditoDePrueba(cliente);
      const pago = await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [orden.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarPagos();
      expect(resultado.pagos.map((p) => p.id)).toContain(pago.id);
      expect(resultado.pagina).toBe(1);
      expect(resultado.porPagina).toBe(20);
      expect(resultado.total).toBeGreaterThanOrEqual(1);
      expect(resultado.totalPaginas).toBe(
        Math.max(1, Math.ceil(resultado.total / resultado.porPagina)),
      );
    });

    it('filtra por clienteId', async () => {
      await abrirJornadaDePrueba();
      const clienteA = await crearClienteConCreditoDePrueba();
      const clienteB = await crearClienteConCreditoDePrueba();
      const ordenA = await crearOrdenCreditoDePrueba(clienteA);
      const ordenB = await crearOrdenCreditoDePrueba(clienteB);
      const pagoA = await registrarPagoCredito(
        { clienteId: clienteA.id, ordenIds: [ordenA.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );
      const pagoB = await registrarPagoCredito(
        { clienteId: clienteB.id, ordenIds: [ordenB.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarPagos({ clienteId: clienteA.id });
      const idsDeA = resultado.pagos.map((p) => p.id);
      expect(idsDeA).toContain(pagoA.id);
      expect(idsDeA).not.toContain(pagoB.id);
      expect(resultado.total).toBe(1);
    });

    it('pagina: porPagina=1 trae solo un pago por página, y total refleja el conteo completo', async () => {
      await abrirJornadaDePrueba();
      const cliente = await crearClienteConCreditoDePrueba();
      const primera = await crearOrdenCreditoDePrueba(cliente);
      const segunda = await crearOrdenCreditoDePrueba(cliente);
      await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [primera.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );
      await registrarPagoCredito(
        { clienteId: cliente.id, ordenIds: [segunda.id], medio: 'transferencia' },
        USUARIO_ID_PRUEBA,
      );

      const paginaUno = await listarPagos({ clienteId: cliente.id, pagina: 1, porPagina: 1 });
      const paginaDos = await listarPagos({ clienteId: cliente.id, pagina: 2, porPagina: 1 });

      expect(paginaUno.pagos).toHaveLength(1);
      expect(paginaDos.pagos).toHaveLength(1);
      expect(paginaUno.pagos[0].id).not.toBe(paginaDos.pagos[0].id);
      expect(paginaUno.total).toBe(2);
      expect(paginaUno.totalPaginas).toBe(2);
    });

    it('porPagina por encima de 100 se recorta al máximo', async () => {
      const resultado = await listarPagos({ porPagina: 1000 });
      expect(resultado.porPagina).toBe(100);
    });
  });
});

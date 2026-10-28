const { supabase } = require('../../../src/db/supabaseCliente');
const { aCamelCase } = require('../../../src/utils/mapearCampos');
const clientesService = require('../../../src/services/clientes.service');
const vehiculosService = require('../../../src/services/vehiculos.service');
const colaboradoresService = require('../../../src/services/colaboradores.service');
const serviciosService = require('../../../src/services/servicios.service');
const jornadasService = require('../../../src/services/jornadas.service');

const {
  listarOrdenes,
  obtenerOrdenPorId,
  obtenerOrdenOFallar,
  colaboradorTieneOrdenes,
  servicioTieneOrdenes,
  vehiculoTieneOrdenes,
  crearOrden,
  editarOrden,
  cambiarEstadoOrden,
  calcularTotales,
  obtenerTotalesDeJornada,
  obtenerTotalesPorJornada,
} = require('../../../src/services/ordenesLavado.service');
const { NoEncontrado, Conflicto, SolicitudInvalida } = require('../../../src/utils/errores');
const { generarSello, crearGeneradorDeValorUnico } = require('../../utils/valorUnico');

const USUARIO_ID_PRUEBA = 1;

// clientesService.crearCliente ya escribe en el Supabase local (SCRUM-152,
// Etapa A), no en un array que beforeEach pudiera vaciar: el documento de
// cada cliente de prueba es único (salto aleatorio + contador) para no
// chocar ni dentro de esta corrida ni entre corridas sin un `db reset`.
// El colaborador de prueba reusa este mismo sello para su documento (con
// un sufijo "C" distinto, ver documentoUnicoColaborador más abajo).
const selloDocumento = generarSello();

// idx_jornadas_una_abierta es GLOBAL (una sola jornada abierta en todo el
// sistema, sin importar su fecha): este archivo deja la última jornada
// de cada prueba abierta (abrirJornadaDePrueba/abrirJornadaConFecha nunca
// la cierran), así que la siguiente prueba —de este archivo o de
// cualquier otro— la cierra antes de abrir la suya.
const cerrarCualquierJornadaAbierta = async () => {
  const { data: abierta } = await supabase
    .from('jornadas')
    .select('id')
    .eq('estado', 'abierta')
    .maybeSingle();

  if (abierta) {
    await supabase
      .from('jornadas')
      .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
      .eq('id', abierta.id);
  }
};

beforeEach(async () => {
  await cerrarCualquierJornadaAbierta();
});

/** Documento único por llamada, para no chocar con el cliente por defecto de cada vehículo de prueba. */
const siguienteDocumentoCliente = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);

const crearClienteDePrueba = (datos = {}) =>
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

// vehiculosService.crearVehiculo ya escribe en el Supabase local
// (SCRUM-152), no en un array que beforeEach pudiera vaciar: la placa es
// única (letras fijas por archivo + contador, con el formato que exige
// cada tipoVehiculo) para no chocar ni dentro de esta corrida ni con otro
// archivo que Jest ejecute en paralelo.
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoria = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
const prefijoPlaca = `${letraAleatoria()}${letraAleatoria()}${letraAleatoria()}`;
const TIPOS_VEHICULO_MOTO_DE_PRUEBA = ['moto_hasta_150cc', 'moto_desde_150cc'];
let contadorPlaca = 0;
const siguientePlaca = (tipoVehiculo) => {
  contadorPlaca += 1;
  return TIPOS_VEHICULO_MOTO_DE_PRUEBA.includes(tipoVehiculo)
    ? `${prefijoPlaca}${String(contadorPlaca).padStart(2, '0')}X`
    : `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const crearVehiculoDePrueba = async (datos = {}) => {
  const { clienteId, tipoVehiculo = 'automovil', placa, ...resto } = datos;
  const idCliente = clienteId ?? (await crearClienteDePrueba()).id;
  return vehiculosService.crearVehiculo(
    {
      placa: placa ?? siguientePlaca(tipoVehiculo),
      tipoVehiculo,
      clienteId: idCliente,
      ...resto,
    },
    USUARIO_ID_PRUEBA,
  );
};

// colaboradoresService.crearColaborador ya escribe en el Supabase local
// (SCRUM-152), no en un array que beforeEach pudiera vaciar: el documento
// es único (salto aleatorio + contador). El código solo tiene 900 valores
// posibles (100-999, ver la migración de `colaboradores`) y un simple
// sorteo aleatorio choca con los que ya quedaron "activos" de corridas
// anteriores (nada los limpia sin un `db reset`), así que aquí se
// consulta qué códigos ya existen antes de sortear uno libre. Un
// `db reset` periódico sigue siendo necesario para que el rango no se
// agote del todo con el tiempo.
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
  throw new Error(
    'No quedan códigos de colaborador libres entre 100 y 999 (hace falta un db reset)',
  );
};

const crearColaboradorDePrueba = (datos = {}) => {
  const { codigo, documento, ...resto } = datos;
  return colaboradoresService.crearColaborador(
    {
      codigo: codigo ?? codigoUnicoColaborador(),
      nombre: 'Juan Pérez',
      documento: documento ?? documentoUnicoColaborador(),
      telefono: '3001234567',
      porcentajeComision: 0.15,
      tipoVinculacion: 'fijo',
      ...resto,
    },
    USUARIO_ID_PRUEBA,
  );
};

// serviciosService.crearServicio ya escribe en el Supabase local
// (SCRUM-152), no en un array que beforeEach pudiera vaciar: el número es
// único (salto aleatorio + contador) para no chocar ni dentro de esta
// corrida ni con otro archivo que Jest ejecute en paralelo. `numero` no
// tiene un rango acotado (solo exige >= 1), así que un sorteo amplio basta.
const selloNumeroServicio = 1000 + Math.floor(Math.random() * 20000);
const numeroUnicoServicio = crearGeneradorDeValorUnico(
  selloNumeroServicio,
  (sello, contador) => sello + contador,
);

const crearServicioDePrueba = (datos = {}) =>
  serviciosService.crearServicio(
    {
      numero: numeroUnicoServicio(),
      nombre: 'Lavado básico',
      descripcion: 'Lavado exterior con shampoo',
      categoria: 'basico',
      tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
      ...datos,
    },
    USUARIO_ID_PRUEBA,
  );

// R7 exige un numero en SERVICIOS_CON_LAVADO_MOTOR, un conjunto fijo y
// chico ([5, 6, 7, 8] en el dominio compartido): no se puede sortear uno
// grande como con el resto de servicios. Para no agotarlo ni chocar entre
// corridas, se reutiliza siempre el mismo (numero 5), creándolo solo si
// todavía no existe.
let servicioConLavadoMotor = null;
const obtenerServicioConLavadoMotor = async () => {
  if (servicioConLavadoMotor) {
    return servicioConLavadoMotor;
  }
  const existentes = await serviciosService.listarServicios();
  servicioConLavadoMotor = existentes.find((servicio) => servicio.numero === 5);
  if (!servicioConLavadoMotor) {
    servicioConLavadoMotor = await crearServicioDePrueba({ numero: 5 });
  }
  return servicioConLavadoMotor;
};

// Un solo colaborador real, compartido por casi todos los escenarios: la
// mayoría de las pruebas de este archivo solo necesitan "un colaborador
// activo válido", no uno distinto cada vez. Reutilizarlo evita agotar el
// rango de 900 códigos posibles (y las colisiones por carrera entre
// archivos de prueba que corren en paralelo contra el mismo Supabase
// local). Las pruebas que sí necesitan desactivar un colaborador (R2) o
// uno claramente distinto (otroColaborador) crean el suyo aparte.
let colaboradorCompartido = null;
const obtenerColaboradorCompartido = async () => {
  if (!colaboradorCompartido) {
    colaboradorCompartido = await crearColaboradorDePrueba();
  }
  return colaboradorCompartido;
};

/** Crea vehículo, colaborador y servicio compatibles entre sí (mismo tipo de vehículo que cubre la tarifa). */
const construirEscenarioValido = async () => ({
  vehiculo: await crearVehiculoDePrueba(),
  colaborador: await obtenerColaboradorCompartido(),
  servicio: await crearServicioDePrueba(),
});

const datosOrdenValida = ({ vehiculo, colaborador, servicio }, overrides = {}) => ({
  turno: 1,
  vehiculoId: vehiculo.id,
  servicioId: servicio.id,
  colaboradorId: colaborador.id,
  medioPago: 'efectivo',
  ...overrides,
});

// Para abrir una jornada de prueba (tanto para los tests de listarOrdenes,
// que necesitan varias fechas distintas, como para el resto de pruebas de
// este archivo) se escribe directo contra la BD (bypass de
// jornadasService.abrirJornada) con una fecha arbitraria y única, nunca
// la de "hoy": las órdenes que crea este archivo SÍ quedan amarradas a
// esa jornada (ordenes_lavado_jornada_fkey, on delete restrict) y las
// órdenes nunca se borran (impedir_eliminacion), así que una jornada de
// "hoy" con órdenes ya no se podría limpiar nunca en el siguiente test —
// el mismo problema que las reaperturas en jornadas.service.test.js, pero
// sin ninguna manera de evitarlo ahí. Cierra antes cualquier otra jornada
// que estuviera abierta (idx_jornadas_una_abierta es global).
// Año aleatorio en un rango amplio (no solo cerca de "hoy"): con un rango
// angosto, dos corridas distintas de este archivo tienen una probabilidad
// real de sortear el mismo año y luego los mismos días (como pasaba con
// el código de colaboradores, pero aquí el espacio de fechas es enorme,
// así que basta con ampliar el rango en vez de consultar la BD primero.
const anioBaseJornada = 1000 + Math.floor(Math.random() * 9000);
// Arranca en un día aleatorio del año (no siempre en el 1): si otro
// archivo sorteara por pura casualidad el mismo año, es mucho menos
// probable que además arranque exactamente en el mismo día.
let contadorDiaJornada = Math.floor(Math.random() * 300);

/**
 * @returns {Promise<object>} la jornada creada (con su fecha real, para
 *   que quien llame filtre/compare contra ella en vez de un literal).
 */
const abrirJornadaConFecha = async () => {
  contadorDiaJornada += 1;
  const fecha = new Date(anioBaseJornada, 0, contadorDiaJornada).toISOString().slice(0, 10);

  const abierta = await jornadasService.obtenerJornadaAbierta();
  if (abierta) {
    await jornadasService.cerrarJornada(abierta.id, USUARIO_ID_PRUEBA);
  }

  const { data, error } = await supabase
    .from('jornadas')
    .insert({ fecha, abierta_por: USUARIO_ID_PRUEBA })
    .select('id, fecha, estado, abierta_en, abierta_por, cerrada_en, cerrada_por')
    .single();

  if (error) {
    throw error;
  }

  return aCamelCase(data);
};

/** Alias semántico: "dame una jornada abierta de prueba", sin importar cuál fecha. */
const abrirJornadaDePrueba = () => abrirJornadaConFecha();

describe('ordenesLavado.service', () => {
  describe('crearOrden', () => {
    it('crea una orden con el valor calculado desde la tarifa del servicio (ignora datos.valor)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(
        datosOrdenValida(escenario, { valor: 999999999 }),
        USUARIO_ID_PRUEBA,
      );

      expect(orden).toMatchObject({
        vehiculoId: escenario.vehiculo.id,
        servicioId: escenario.servicio.id,
        colaboradorId: escenario.colaborador.id,
        valor: 15000,
        estado: 'registrada',
        motivo: null,
      });
      expect(orden.jornadaId).toBeDefined();
    });

    it('rechaza crear una orden si no hay ninguna jornada abierta (409)', async () => {
      const escenario = await construirEscenarioValido();
      await expect(crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA)).rejects.toThrow(
        Conflicto,
      );
    });

    it('R1: rechaza un vehiculoId que no existe (404)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await expect(
        crearOrden(datosOrdenValida(escenario, { vehiculoId: 9999 }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });

    it('R1: rechaza un servicioId que no existe (404)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await expect(
        crearOrden(datosOrdenValida(escenario, { servicioId: 9999 }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });

    it('R1: rechaza un colaboradorId que no existe (404)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await expect(
        crearOrden(datosOrdenValida(escenario, { colaboradorId: 9999 }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });

    it('R2: rechaza un colaborador inactivo (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      // No se usa el colaborador compartido: aquí sí hace falta uno propio,
      // porque esta prueba lo desactiva (y el compartido lo reutilizan
      // casi todas las demás pruebas del archivo).
      const colaboradorInactivo = await crearColaboradorDePrueba();
      await colaboradoresService.cambiarEstadoColaborador(
        colaboradorInactivo.id,
        'inactivo',
        USUARIO_ID_PRUEBA,
      );

      await expect(
        crearOrden(
          datosOrdenValida({ ...escenario, colaborador: colaboradorInactivo }),
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('R3: rechaza un servicio inactivo (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await serviciosService.actualizarServicio(
        escenario.servicio.id,
        { activo: false },
        USUARIO_ID_PRUEBA,
      );

      await expect(crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA)).rejects.toThrow(
        Conflicto,
      );
    });

    it('R3: rechaza un servicio sin tarifa para el tipo de vehículo (409)', async () => {
      await abrirJornadaDePrueba();
      const vehiculo = await crearVehiculoDePrueba({ tipoVehiculo: 'automovil' });
      const colaborador = await crearColaboradorDePrueba();
      const servicio = await crearServicioDePrueba({
        tarifas: [{ tipoVehiculo: 'camioneta', valor: 20000 }],
      });

      await expect(
        crearOrden(datosOrdenValida({ vehiculo, colaborador, servicio }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('R7: rechaza un servicio con lavado de motor sin autorizaMotor (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const servicioMotor = await obtenerServicioConLavadoMotor();

      await expect(
        crearOrden(datosOrdenValida({ ...escenario, servicio: servicioMotor }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('R7: permite un servicio con lavado de motor cuando autorizaMotor es true', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const servicioMotor = await obtenerServicioConLavadoMotor();

      const orden = await crearOrden(
        datosOrdenValida({ ...escenario, servicio: servicioMotor }, { autorizaMotor: true }),
        USUARIO_ID_PRUEBA,
      );
      expect(orden.autorizaMotor).toBe(true);
    });

    it('R8: rechaza medioPago credito sin clienteId (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await expect(
        crearOrden(datosOrdenValida(escenario, { medioPago: 'credito' }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('R8: rechaza medioPago credito con un clienteId que no existe (404)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await expect(
        crearOrden(
          datosOrdenValida(escenario, { medioPago: 'credito', clienteId: 999999999 }),
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(NoEncontrado);
    });

    it('R8: rechaza medioPago credito si el cliente no tiene crédito habilitado (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const clienteSinCredito = await crearClienteDePrueba({ creditoHabilitado: false });

      await expect(
        crearOrden(
          datosOrdenValida(escenario, {
            medioPago: 'credito',
            clienteId: clienteSinCredito.id,
          }),
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('R8: rechaza medioPago credito si el cliente es particular (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const clienteParticular = await clientesService.crearCliente(
        {
          nombre: 'Ana María Torres',
          documento: siguienteDocumentoCliente(),
          tipo: 'particular',
          telefono: '3009999999',
        },
        USUARIO_ID_PRUEBA,
      );

      await expect(
        crearOrden(
          datosOrdenValida(escenario, {
            medioPago: 'credito',
            clienteId: clienteParticular.id,
          }),
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('R8: acepta medioPago credito con un cliente empresa activo y con crédito habilitado', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const clienteCredito = await crearClienteDePrueba();

      const orden = await crearOrden(
        datosOrdenValida(escenario, { medioPago: 'credito', clienteId: clienteCredito.id }),
        USUARIO_ID_PRUEBA,
      );
      expect(orden.clienteId).toBe(clienteCredito.id);
    });

    it('ignora clienteId si medioPago no es credito (queda en null)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const otroCliente = await crearClienteDePrueba();

      const orden = await crearOrden(
        datosOrdenValida(escenario, { medioPago: 'efectivo', clienteId: otroCliente.id }),
        USUARIO_ID_PRUEBA,
      );
      expect(orden.clienteId).toBeNull();
    });

    it('R5: rechaza un turno ya ocupado en la misma jornada (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroVehiculo = await crearVehiculoDePrueba();
      await expect(
        crearOrden(
          datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }),
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('dos turnos distintos en la misma jornada no chocan entre sí', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroVehiculo = await crearVehiculoDePrueba();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 }),
        USUARIO_ID_PRUEBA,
      );
    });

    it('R6: rechaza una segunda orden abierta para el mismo vehículo (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      await expect(
        crearOrden(datosOrdenValida(escenario, { turno: 2 }), USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('permite una nueva orden para el mismo vehículo tras cerrar la anterior', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const primera = await crearOrden(
        datosOrdenValida(escenario, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );
      await cambiarEstadoOrden(primera.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      await crearOrden(datosOrdenValida(escenario, { turno: 2 }), USUARIO_ID_PRUEBA);
    });
  });

  describe('editarOrden', () => {
    it('"valor" es inmutable: no se recalcula aunque suba la tarifa del servicio', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      // Sube la tarifa del servicio después de crear la orden.
      await serviciosService.actualizarServicio(
        escenario.servicio.id,
        { tarifas: [{ tipoVehiculo: 'automovil', valor: 99999 }] },
        USUARIO_ID_PRUEBA,
      );

      const editada = await editarOrden(
        orden.id,
        { observaciones: 'actualizado' },
        USUARIO_ID_PRUEBA,
      );

      expect(editada.valor).toBe(15000);
    });

    it('R3: permite editar a un vehículo de otro tipo que el servicio sí cubre (200), sin recalcular "valor"', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await serviciosService.actualizarServicio(
        escenario.servicio.id,
        {
          tarifas: [
            { tipoVehiculo: 'automovil', valor: 15000 },
            { tipoVehiculo: 'camioneta', valor: 20000 },
          ],
        },
        USUARIO_ID_PRUEBA,
      );
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      const nuevoVehiculo = await crearVehiculoDePrueba({
        tipoVehiculo: 'camioneta',
      });
      const editada = await editarOrden(
        orden.id,
        { vehiculoId: nuevoVehiculo.id },
        USUARIO_ID_PRUEBA,
      );

      expect(editada.vehiculoId).toBe(nuevoVehiculo.id);
      expect(editada.valor).toBe(15000);
    });

    it('R3: rechaza editar a un vehículo de un tipo que el servicio no cubre (409)', async () => {
      await abrirJornadaDePrueba();
      // escenario.servicio solo tiene tarifa para 'automovil'.
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      const vehiculoMoto = await crearVehiculoDePrueba({
        tipoVehiculo: 'moto_hasta_150cc',
      });

      await expect(
        editarOrden(orden.id, { vehiculoId: vehiculoMoto.id }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('permite editar aunque el servicio original haya quedado inactivo (ya no se revalida al editar)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      await serviciosService.actualizarServicio(
        escenario.servicio.id,
        { activo: false },
        USUARIO_ID_PRUEBA,
      );

      await editarOrden(orden.id, { observaciones: 'actualizado' }, USUARIO_ID_PRUEBA);
    });

    it('rechaza editar a un colaborador inactivo (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      const otroColaborador = await crearColaboradorDePrueba();
      await colaboradoresService.cambiarEstadoColaborador(
        otroColaborador.id,
        'inactivo',
        USUARIO_ID_PRUEBA,
      );

      await expect(
        editarOrden(orden.id, { colaboradorId: otroColaborador.id }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza editar vehiculoId a uno que ya tiene otra orden abierta (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroVehiculo = await crearVehiculoDePrueba();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 }),
        USUARIO_ID_PRUEBA,
      );

      await expect(
        editarOrden(orden.id, { vehiculoId: otroVehiculo.id }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza editar una orden ya entregada (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'en_proceso', undefined, USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'terminada', undefined, USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'entregada', undefined, USUARIO_ID_PRUEBA);

      await expect(
        editarOrden(orden.id, { observaciones: 'tarde' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza editar una orden ya cancelada (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      await expect(
        editarOrden(orden.id, { observaciones: 'tarde' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza editar una orden cuya jornada ya no está abierta (409)', async () => {
      const jornada = await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await jornadasService.cerrarJornada(jornada.id, USUARIO_ID_PRUEBA);

      await expect(
        editarOrden(orden.id, { observaciones: 'tarde' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza editar medioPago a credito sin un cliente con crédito habilitado (409)', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      await expect(
        editarOrden(orden.id, { medioPago: 'credito' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('ignora "valor" y "estado" si se envían: el service no los cambia', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      const editada = await editarOrden(
        orden.id,
        {
          valor: 1,
          estado: 'entregada',
          observaciones: 'actualizado',
        },
        USUARIO_ID_PRUEBA,
      );

      expect(editada.valor).toBe(15000);
      expect(editada.estado).toBe('registrada');
      expect(editada.observaciones).toBe('actualizado');
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(
        editarOrden(999999999, { observaciones: 'x' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });
  });

  describe('listarOrdenes', () => {
    it('devuelve todas las órdenes si no hay filtro', async () => {
      const escenario = await construirEscenarioValido();
      await abrirJornadaConFecha();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroVehiculo = await crearVehiculoDePrueba();
      await abrirJornadaConFecha();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes();
      expect(resultado.length).toBeGreaterThanOrEqual(2);
    });

    it('filtra por fecha exacta cuando se envía filtros.fecha', async () => {
      const escenario = await construirEscenarioValido();
      const jornada1 = await abrirJornadaConFecha();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroVehiculo = await crearVehiculoDePrueba();
      await abrirJornadaConFecha();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes({ fecha: jornada1.fecha });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].fecha).toBe(jornada1.fecha);
    });

    it('filtra por colaboradorId', async () => {
      // No se usa el colaborador compartido como el que se filtra: casi
      // todas las demás pruebas del archivo también lo usan y nunca se
      // borran las órdenes (impedir_eliminacion), así que filtrar solo por
      // su id traería órdenes de otras pruebas. Se crea uno propio solo
      // para esta prueba, exclusivo de ella.
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const colaboradorPropio = await crearColaboradorDePrueba();
      await crearOrden(
        datosOrdenValida({ ...escenario, colaborador: colaboradorPropio }, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );

      const otroVehiculo = await crearVehiculoDePrueba();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 }),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes({ colaboradorId: colaboradorPropio.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].colaboradorId).toBe(colaboradorPropio.id);
    });

    it('filtra por servicioId', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroServicio = await crearServicioDePrueba();
      const otroVehiculo = await crearVehiculoDePrueba();
      await crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo, servicio: otroServicio },
          { turno: 2 },
        ),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes({ servicioId: escenario.servicio.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].servicioId).toBe(escenario.servicio.id);
    });

    it('filtra por medioPago', async () => {
      // Se acota también por jornadaId (jornada propia, de otra fecha):
      // medioPago por sí solo no es exclusivo de esta prueba (otras
      // también usan 'nequi'/'efectivo'), y las órdenes nunca se borran.
      const escenario = await construirEscenarioValido();
      const jornada = await abrirJornadaConFecha();
      await crearOrden(
        datosOrdenValida(escenario, { turno: 1, medioPago: 'efectivo' }),
        USUARIO_ID_PRUEBA,
      );

      const otroVehiculo = await crearVehiculoDePrueba();
      await crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo },
          { turno: 2, medioPago: 'nequi' },
        ),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes({ medioPago: 'nequi', jornadaId: jornada.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].medioPago).toBe('nequi');
    });

    it('filtra por jornadaId', async () => {
      const escenario = await construirEscenarioValido();
      const jornada1 = await abrirJornadaConFecha();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const otroVehiculo = await crearVehiculoDePrueba();
      const jornada2 = await abrirJornadaConFecha();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes({ jornadaId: jornada1.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].jornadaId).toBe(jornada1.id);
      expect(resultado[0].jornadaId).not.toBe(jornada2.id);
    });

    it('combina varios filtros a la vez con AND', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const primera = await crearOrden(
        datosOrdenValida(escenario, { turno: 1, medioPago: 'efectivo' }),
        USUARIO_ID_PRUEBA,
      );

      const otroVehiculo = await crearVehiculoDePrueba();
      await crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo },
          { turno: 2, medioPago: 'nequi' },
        ),
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarOrdenes({
        colaboradorId: escenario.colaborador.id,
        servicioId: escenario.servicio.id,
        medioPago: 'efectivo',
      });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(primera.id);
    });
  });

  describe('calcularTotales', () => {
    it('con un arreglo vacío, todo queda en 0', () => {
      const totales = calcularTotales([]);
      expect(totales.cantidadServicios).toBe(0);
      expect(totales.totalGeneral).toBe(0);
      Object.values(totales.totalesPorMedioPago).forEach((valor) => expect(valor).toBe(0));
    });

    it('inicializa una clave en 0 por cada medio de pago del dominio, sin hardcodear nombres', () => {
      const totales = calcularTotales([]);
      expect(Object.keys(totales.totalesPorMedioPago).sort()).toEqual(
        ['efectivo', 'nequi', 'daviplata', 'bancolombia', 'datafono', 'credito'].sort(),
      );
    });

    it('suma cantidadServicios, totalGeneral y el desglose por medio de pago', () => {
      const ordenes = [
        { estado: 'registrada', valor: 15000, medioPago: 'efectivo' },
        { estado: 'entregada', valor: 20000, medioPago: 'nequi' },
        { estado: 'en_proceso', valor: 10000, medioPago: 'efectivo' },
      ];

      const totales = calcularTotales(ordenes);

      expect(totales.cantidadServicios).toBe(3);
      expect(totales.totalGeneral).toBe(45000);
      expect(totales.totalesPorMedioPago.efectivo).toBe(25000);
      expect(totales.totalesPorMedioPago.nequi).toBe(20000);
      expect(totales.totalesPorMedioPago.daviplata).toBe(0);
    });

    it('una orden cancelada no suma a cantidadServicios, totalGeneral ni a su medioPago', () => {
      const ordenes = [
        { estado: 'registrada', valor: 15000, medioPago: 'efectivo' },
        { estado: 'cancelada', valor: 999999, medioPago: 'efectivo' },
      ];

      const totales = calcularTotales(ordenes);

      expect(totales.cantidadServicios).toBe(1);
      expect(totales.totalGeneral).toBe(15000);
      expect(totales.totalesPorMedioPago.efectivo).toBe(15000);
    });
  });

  describe('obtenerTotalesDeJornada', () => {
    it('agrega unidades y ventaTotal solo de las órdenes de esa jornada, sin mezclar otra', async () => {
      const escenario = await construirEscenarioValido();
      const jornada1 = await abrirJornadaConFecha();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const vehiculoB = await crearVehiculoDePrueba();
      const vehiculoC = await crearVehiculoDePrueba();
      const jornada2 = await abrirJornadaConFecha();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: vehiculoB }, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: vehiculoC }, { turno: 2 }),
        USUARIO_ID_PRUEBA,
      );

      const totalesJornada2 = await obtenerTotalesDeJornada(jornada2.id);
      expect(totalesJornada2.unidades).toBe(2);
      expect(totalesJornada2.ventaTotal).toBe(30000);

      const totalesJornada1 = await obtenerTotalesDeJornada(jornada1.id);
      expect(totalesJornada1.unidades).toBe(1);
      expect(totalesJornada1.ventaTotal).toBe(15000);
    });

    it('devuelve unidades 0 y ventaTotal 0 para una jornada sin ninguna orden', async () => {
      const jornadaVacia = await abrirJornadaConFecha();
      const totales = await obtenerTotalesDeJornada(jornadaVacia.id);
      expect(totales).toEqual({ unidades: 0, ventaTotal: 0 });
    });
  });

  describe('obtenerTotalesPorJornada', () => {
    it('devuelve los totales de varias jornadas en una sola llamada, sin mezclarlas', async () => {
      const escenario = await construirEscenarioValido();
      const jornada1 = await abrirJornadaConFecha();
      await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);

      const vehiculoB = await crearVehiculoDePrueba();
      const vehiculoC = await crearVehiculoDePrueba();
      const jornada2 = await abrirJornadaConFecha();
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: vehiculoB }, { turno: 1 }),
        USUARIO_ID_PRUEBA,
      );
      await crearOrden(
        datosOrdenValida({ ...escenario, vehiculo: vehiculoC }, { turno: 2 }),
        USUARIO_ID_PRUEBA,
      );

      const totales = await obtenerTotalesPorJornada([jornada1.id, jornada2.id]);

      expect(totales.get(jornada1.id)).toEqual({ unidades: 1, ventaTotal: 15000 });
      expect(totales.get(jornada2.id)).toEqual({ unidades: 2, ventaTotal: 30000 });
    });

    it('una orden cancelada no suma a los totales de su jornada', async () => {
      const escenario = await construirEscenarioValido();
      const jornada = await abrirJornadaConFecha();
      const orden = await crearOrden(datosOrdenValida(escenario, { turno: 1 }), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      const totales = await obtenerTotalesPorJornada([jornada.id]);

      expect(totales.get(jornada.id)).toEqual({ unidades: 0, ventaTotal: 0 });
    });

    it('devuelve unidades 0 y ventaTotal 0 para una jornada sin ninguna orden', async () => {
      const jornadaVacia = await abrirJornadaConFecha();
      const totales = await obtenerTotalesPorJornada([jornadaVacia.id]);
      expect(totales.get(jornadaVacia.id)).toEqual({ unidades: 0, ventaTotal: 0 });
    });

    it('devuelve un Map vacío si se le pasa un arreglo vacío de ids', async () => {
      const totales = await obtenerTotalesPorJornada([]);
      expect(totales.size).toBe(0);
    });
  });

  describe('obtenerOrdenPorId / obtenerOrdenOFallar', () => {
    it('devuelve null si el id no existe', async () => {
      await expect(obtenerOrdenPorId(999999999)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerOrdenOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('*TieneOrdenes', () => {
    it('colaboradorTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      await expect(colaboradorTieneOrdenes(escenario.colaborador.id)).resolves.toBe(true);
    });

    it('servicioTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      await expect(servicioTieneOrdenes(escenario.servicio.id)).resolves.toBe(true);
    });

    it('vehiculoTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      await expect(vehiculoTieneOrdenes(escenario.vehiculo.id)).resolves.toBe(true);
    });

    it('devuelven false cuando no hay ninguna orden asociada', async () => {
      // No se usa el colaborador compartido: para este punto del archivo ya
      // tiene órdenes de otras pruebas (colaboradorTieneOrdenes respondería
      // true, correctamente). vehiculo y servicio sí son frescos por cada
      // prueba, así que esos dos no tienen este problema.
      const escenario = await construirEscenarioValido();
      const colaboradorSinOrdenes = await crearColaboradorDePrueba();
      await expect(colaboradorTieneOrdenes(colaboradorSinOrdenes.id)).resolves.toBe(false);
      await expect(servicioTieneOrdenes(escenario.servicio.id)).resolves.toBe(false);
      await expect(vehiculoTieneOrdenes(escenario.vehiculo.id)).resolves.toBe(false);
    });
  });

  describe('cambiarEstadoOrden', () => {
    it.each([
      ['registrada', 'en_proceso'],
      ['registrada', 'cancelada'],
      ['en_proceso', 'terminada'],
      ['en_proceso', 'cancelada'],
      ['terminada', 'entregada'],
    ])('permite la transición de %s a %s', async (estadoInicial, estadoFinal) => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

      // Avanza la orden hasta estadoInicial recorriendo transiciones válidas.
      const camino = {
        registrada: [],
        en_proceso: ['en_proceso'],
        terminada: ['en_proceso', 'terminada'],
      }[estadoInicial];
      // for...of (no forEach) porque cada paso depende del anterior ya aplicado.
      for (const paso of camino) {
        await cambiarEstadoOrden(orden.id, paso, undefined, USUARIO_ID_PRUEBA);
      }

      const motivo = estadoFinal === 'cancelada' ? 'Cliente canceló' : undefined;
      const actualizada = await cambiarEstadoOrden(
        orden.id,
        estadoFinal,
        motivo,
        USUARIO_ID_PRUEBA,
      );
      expect(actualizada.estado).toBe(estadoFinal);
    });

    it('rechaza saltar de registrada a entregada', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await expect(
        cambiarEstadoOrden(orden.id, 'entregada', undefined, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza retroceder de entregada a en_proceso', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'en_proceso', undefined, USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'terminada', undefined, USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'entregada', undefined, USUARIO_ID_PRUEBA);

      await expect(
        cambiarEstadoOrden(orden.id, 'en_proceso', undefined, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('una orden entregada nunca puede volver a cambiar de estado', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'en_proceso', undefined, USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'terminada', undefined, USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'entregada', undefined, USUARIO_ID_PRUEBA);

      await expect(
        cambiarEstadoOrden(orden.id, 'cancelada', 'motivo', USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('una orden cancelada nunca puede volver a cambiar de estado', async () => {
      await abrirJornadaDePrueba();
      const escenario = await construirEscenarioValido();
      const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);
      await cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló', USUARIO_ID_PRUEBA);

      await expect(
        cambiarEstadoOrden(orden.id, 'en_proceso', undefined, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(
        cambiarEstadoOrden(999999999, 'en_proceso', undefined, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });

    describe('cancelación con motivo', () => {
      it('rechaza cancelar sin motivo (400, SolicitudInvalida)', async () => {
        await abrirJornadaDePrueba();
        const escenario = await construirEscenarioValido();
        const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

        await expect(
          cambiarEstadoOrden(orden.id, 'cancelada', undefined, USUARIO_ID_PRUEBA),
        ).rejects.toThrow(SolicitudInvalida);
      });

      it('cancela con motivo y lo guarda en la orden', async () => {
        await abrirJornadaDePrueba();
        const escenario = await construirEscenarioValido();
        const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

        const cancelada = await cambiarEstadoOrden(
          orden.id,
          'cancelada',
          'El cliente no llegó',
          USUARIO_ID_PRUEBA,
        );

        expect(cancelada.estado).toBe('cancelada');
        expect(cancelada.motivo).toBe('El cliente no llegó');
      });

      it('cambiar a cualquier otro estado no exige ni guarda motivo', async () => {
        await abrirJornadaDePrueba();
        const escenario = await construirEscenarioValido();
        const orden = await crearOrden(datosOrdenValida(escenario), USUARIO_ID_PRUEBA);

        const actualizada = await cambiarEstadoOrden(
          orden.id,
          'en_proceso',
          undefined,
          USUARIO_ID_PRUEBA,
        );

        expect(actualizada.estado).toBe('en_proceso');
        expect(actualizada.motivo).toBeNull();
      });
    });
  });
});

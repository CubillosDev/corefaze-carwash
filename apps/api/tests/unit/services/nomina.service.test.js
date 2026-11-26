const { supabase } = require('../../../src/db/supabaseCliente');
const { aCamelCase } = require('../../../src/utils/mapearCampos');
const colaboradoresService = require('../../../src/services/colaboradores.service');
const clientesService = require('../../../src/services/clientes.service');
const vehiculosService = require('../../../src/services/vehiculos.service');
const serviciosService = require('../../../src/services/servicios.service');
const jornadasService = require('../../../src/services/jornadas.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  obtenerResumenQuincena,
  listarDescuentosDeColaborador,
  registrarDescuento,
  liquidarQuincena,
  listarLiquidaciones,
  obtenerLiquidacionPorId,
  obtenerLiquidacionOFallar,
} = require('../../../src/services/nomina.service');
const { NoEncontrado, Conflicto, SolicitudInvalida } = require('../../../src/utils/errores');
const {
  generarSello,
  crearGeneradorDeValorUnico,
  baseAleatoriaDeServicio,
} = require('../../utils/valorUnico');

const USUARIO_ID_PRUEBA = 1;

// Mismo patrón de fixtures que credito.service.test.js/ordenesLavado.service.test.js.
const selloDocumento = generarSello();

const siguienteDocumentoCliente = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `${sello}P${String(contador).padStart(3, '0')}`,
);
const documentoUnicoColaborador = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `${sello}C${String(contador).padStart(3, '0')}`,
);

const codigosOcupados = new Set();
let siguienteIntentoCodigo = Math.floor(Math.random() * 900);

beforeAll(async () => {
  const { data, error } = await supabase.from('colaboradores').select('codigo');
  if (error) {
    throw error;
  }
  data.forEach((fila) => codigosOcupados.add(fila.codigo));
});

const codigoUnicoColaborador = () => {
  for (let intento = 0; intento < 900; intento += 1) {
    const candidato = 100 + ((siguienteIntentoCodigo + intento) % 900);
    if (!codigosOcupados.has(candidato)) {
      codigosOcupados.add(candidato);
      siguienteIntentoCodigo += intento + 1;
      return candidato;
    }
  }
  throw new Error('No quedan códigos de colaborador libres (hace falta un db reset)');
};

/** Colaborador activo, con porcentajeComision=0.15 (combinado con la tarifa de 15000 de abajo da comisión=2250, sin redondeo). */
const crearColaboradorDePrueba = (datos = {}) =>
  colaboradoresService.crearColaborador(
    {
      codigo: codigoUnicoColaborador(),
      nombre: 'Juan Pérez',
      documento: documentoUnicoColaborador(),
      telefono: '3001234567',
      porcentajeComision: 0.15,
      tipoVinculacion: 'fijo',
      ...datos,
    },
    USUARIO_ID_PRUEBA,
  );

let clienteCompartido = null;
const obtenerClienteCompartido = async () => {
  if (!clienteCompartido) {
    clienteCompartido = await clientesService.crearCliente(
      {
        nombre: 'Cliente de prueba',
        documento: siguienteDocumentoCliente(),
        tipo: 'particular',
        telefono: '3007654321',
      },
      USUARIO_ID_PRUEBA,
    );
  }
  return clienteCompartido;
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoria = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
const prefijoPlaca = `${letraAleatoria()}${letraAleatoria()}${letraAleatoria()}`;
let contadorPlaca = 0;
const siguientePlaca = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const crearVehiculoDePrueba = async () => {
  const cliente = await obtenerClienteCompartido();
  return vehiculosService.crearVehiculo(
    { placa: siguientePlaca(), tipoVehiculo: 'automovil', clienteId: cliente.id },
    USUARIO_ID_PRUEBA,
  );
};

// Bloque fijo reservado para este archivo (ARCHIVOS_CON_BLOQUE_DE_SERVICIO
// en valorUnico.js), con un desplazamiento aleatorio que no se sale de él
// (baseAleatoriaDeServicio): el bloque disjunto evita chocar con otro
// archivo aunque corran en secuencia sin `db reset` de por medio
// (.github/workflows/api.yml, causa del PR #42); el desplazamiento evita
// que repetir este archivo sin reset choque con lo que dejó la corrida anterior.
const selloNumeroServicio = baseAleatoriaDeServicio(__filename);
const numeroUnicoServicio = crearGeneradorDeValorUnico(
  selloNumeroServicio,
  (sello, contador) => sello + contador,
);
let servicioCompartido = null;
/** Tarifa fija de 15000 para automóvil: con porcentajeComision=0.15, comisión=2250 exacto. */
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

let contadorTurno = 0;
const siguienteTurno = () => {
  contadorTurno += 1;
  return contadorTurno;
};

const cerrarCualquierJornadaAbierta = async () => {
  const abierta = await jornadasService.obtenerJornadaAbierta();
  if (abierta) {
    await jornadasService.cerrarJornada(abierta.id, USUARIO_ID_PRUEBA);
  }
};

/** Abre una jornada en la fecha dada (cerrando cualquier otra abierta: el índice es GLOBAL). */
const abrirJornadaEn = async (fecha) => {
  await cerrarCualquierJornadaAbierta();
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

/**
 * Crea una orden (medio_pago efectivo: no necesita cliente a crédito) con
 * fecha = la jornada abierta, y la lleva al estado pedido (por defecto,
 * 'entregada' — liquidar_quincena exige que no haya órdenes abiertas).
 */
const crearOrdenDePrueba = async (colaboradorId, { estado = 'entregada' } = {}) => {
  const vehiculo = await crearVehiculoDePrueba();
  const servicio = await obtenerServicioCompartido();
  const orden = await ordenesLavadoService.crearOrden(
    {
      turno: siguienteTurno(),
      vehiculoId: vehiculo.id,
      servicioId: servicio.id,
      colaboradorId,
      medioPago: 'efectivo',
    },
    USUARIO_ID_PRUEBA,
  );

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

// Años muy anteriores al real (ver system-reminder de fecha): cualquier
// quincena en este rango ya "terminó" para liquidar_quincena (p_hoy real
// siempre >= p_fin), sin tener que fingir p_hoy. El año base es aleatorio
// para que archivos de prueba concurrentes no elijan la misma quincena
// (mismo criterio que anioBaseJornada en credito/ordenesLavado).
const anioBaseQuincena = 1900 + Math.floor(Math.random() * 90);
let contadorQuincena = 0;

const formatoFecha = (fecha) => fecha.toISOString().slice(0, 10);

/** Próxima quincena real, siempre posterior a la anterior dentro de este archivo (nunca se repite ni retrocede). */
const siguienteQuincena = () => {
  const indice = contadorQuincena;
  contadorQuincena += 1;

  const mesAbsoluto = Math.floor(indice / 2);
  const esSegundaQuincena = indice % 2 === 1;
  const anio = anioBaseQuincena + Math.floor(mesAbsoluto / 12);
  const mes = mesAbsoluto % 12;

  if (!esSegundaQuincena) {
    return {
      inicio: formatoFecha(new Date(Date.UTC(anio, mes, 1))),
      fin: formatoFecha(new Date(Date.UTC(anio, mes, 15))),
    };
  }

  return {
    inicio: formatoFecha(new Date(Date.UTC(anio, mes, 16))),
    // Día 0 del mes siguiente = último día de este mes.
    fin: formatoFecha(new Date(Date.UTC(anio, mes + 1, 0))),
  };
};

describe('nomina.service', () => {
  describe('obtenerResumenQuincena', () => {
    it('lanza SolicitudInvalida si [inicio, fin] no es exactamente una quincena real', async () => {
      await expect(
        obtenerResumenQuincena({ inicio: '2026-01-02', fin: '2026-01-15' }),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('una quincena sin ninguna actividad: liquidada=false y colaboradores vacío', async () => {
      const { inicio, fin } = siguienteQuincena();
      const resumen = await obtenerResumenQuincena({ inicio, fin });

      expect(resumen).toMatchObject({ inicio, fin, liquidada: false, liquidacionId: null });
      expect(resumen.colaboradores).toEqual([]);
    });

    it('incluye la comisión de una orden y los descuentos por tipo de un colaborador activo', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id); // comisión = round(15000*0.15) = 2250

      await registrarDescuento(
        { colaboradorId: colaborador.id, tipo: 'jabon', valor: 1000, fecha: inicio },
        USUARIO_ID_PRUEBA,
      );

      const resumen = await obtenerResumenQuincena({ inicio, fin });
      const fila = resumen.colaboradores.find((c) => c.colaboradorId === colaborador.id);

      expect(fila).toMatchObject({
        codigo: colaborador.codigo,
        nombre: colaborador.nombre,
        estado: 'activo',
        comision: 2250,
        descuentos: { prestamo: 0, jabon: 1000, multa: 0, cxc: 0 },
        neto: 1250,
        saldoPendiente: 0,
      });
    });

    it('incluye a un colaborador inactivo que tuvo órdenes en el periodo (misma unión que liquidar_quincena, sin filtrar por estado)', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id);

      await colaboradoresService.cambiarEstadoColaborador(
        colaborador.id,
        'inactivo',
        USUARIO_ID_PRUEBA,
      );

      const resumen = await obtenerResumenQuincena({ inicio, fin });
      const fila = resumen.colaboradores.find((c) => c.colaboradorId === colaborador.id);

      expect(fila).toMatchObject({ estado: 'inactivo', comision: 2250 });
    });

    it('un colaborador activo sin ninguna orden ni descuento en el periodo no aparece', async () => {
      const { inicio, fin } = siguienteQuincena();
      const colaborador = await crearColaboradorDePrueba();

      const resumen = await obtenerResumenQuincena({ inicio, fin });

      expect(resumen.colaboradores.find((c) => c.colaboradorId === colaborador.id)).toBeUndefined();
    });

    it('liquidada pasa a true y liquidacionId queda poblado después de liquidar', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id);

      const liquidacion = await liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA);

      const resumen = await obtenerResumenQuincena({ inicio, fin });
      expect(resumen.liquidada).toBe(true);
      expect(resumen.liquidacionId).toBe(liquidacion.id);
    });
  });

  describe('listarDescuentosDeColaborador', () => {
    it('lanza NoEncontrado si el colaborador no existe', async () => {
      await expect(
        listarDescuentosDeColaborador(999999999, { inicio: '2026-01-01', fin: '2026-01-15' }),
      ).rejects.toThrow(NoEncontrado);
    });

    it('incluye solo los descuentos dentro de [inicio, fin], con los datos del colaborador', async () => {
      const q1 = siguienteQuincena();
      const q2 = siguienteQuincena();
      const colaborador = await crearColaboradorDePrueba();

      const dentro = await registrarDescuento(
        { colaboradorId: colaborador.id, tipo: 'jabon', valor: 1000, fecha: q1.inicio },
        USUARIO_ID_PRUEBA,
      );
      await registrarDescuento(
        { colaboradorId: colaborador.id, tipo: 'jabon', valor: 2000, fecha: q2.inicio },
        USUARIO_ID_PRUEBA,
      );

      const resultado = await listarDescuentosDeColaborador(colaborador.id, {
        inicio: q1.inicio,
        fin: q1.fin,
      });

      expect(resultado.colaborador).toMatchObject({
        id: colaborador.id,
        codigo: colaborador.codigo,
        nombre: colaborador.nombre,
      });
      expect(resultado.descuentos.map((d) => d.id)).toEqual([dentro.id]);
    });
  });

  describe('registrarDescuento', () => {
    it('caso válido: registra un descuento tipo jabón (sin límite) y lo devuelve', async () => {
      const { inicio } = siguienteQuincena();
      const colaborador = await crearColaboradorDePrueba();

      const descuento = await registrarDescuento(
        { colaboradorId: colaborador.id, tipo: 'jabon', valor: 50000, fecha: inicio },
        USUARIO_ID_PRUEBA,
      );

      expect(descuento).toMatchObject({
        colaboradorId: colaborador.id,
        tipo: 'jabon',
        valor: 50000,
        registradoPor: USUARIO_ID_PRUEBA,
      });
    });

    it('lanza NoEncontrado si el colaborador no existe', async () => {
      const { inicio } = siguienteQuincena();
      await expect(
        registrarDescuento(
          { colaboradorId: 999999999, tipo: 'jabon', valor: 1000, fecha: inicio },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(NoEncontrado);
    });

    it('lanza Conflicto si el colaborador no está activo', async () => {
      const { inicio } = siguienteQuincena();
      const colaborador = await crearColaboradorDePrueba();
      await colaboradoresService.cambiarEstadoColaborador(
        colaborador.id,
        'inactivo',
        USUARIO_ID_PRUEBA,
      );

      await expect(
        registrarDescuento(
          { colaboradorId: colaborador.id, tipo: 'jabon', valor: 1000, fecha: inicio },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si un préstamo supera el disponible (sin comisión ni descuentos previos, disponible=0)', async () => {
      const { inicio } = siguienteQuincena();
      const colaborador = await crearColaboradorDePrueba();

      await expect(
        registrarDescuento(
          { colaboradorId: colaborador.id, tipo: 'prestamo', valor: 1, fecha: inicio },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si la quincena ya fue liquidada', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id);
      await liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA);

      await expect(
        registrarDescuento(
          { colaboradorId: colaborador.id, tipo: 'jabon', valor: 1000, fecha: inicio },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(Conflicto);
    });
  });

  describe('liquidarQuincena', () => {
    it('caso válido: congela el detalle por colaborador (servicios, producido, comisión, neto)', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      const orden = await crearOrdenDePrueba(colaborador.id);

      const liquidacion = await liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA);

      expect(liquidacion).toMatchObject({
        periodoInicio: inicio,
        periodoFin: fin,
        totalComision: 2250,
        totalDescuentos: 0,
        totalNeto: 2250,
      });
      const detalle = liquidacion.colaboradores.find((c) => c.colaboradorId === colaborador.id);
      expect(detalle).toMatchObject({
        servicios: 1,
        producido: orden.valor,
        comision: 2250,
        descuentos: 0,
        saldoPendiente: 0,
        neto: 2250,
        colaborador: { codigo: colaborador.codigo, nombre: colaborador.nombre },
      });
    });

    it('lanza SolicitudInvalida si el periodo no es una quincena real', async () => {
      await expect(
        liquidarQuincena({ inicio: '2026-01-01', fin: '2026-01-20' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('lanza Conflicto si la quincena aún no ha terminado', async () => {
      await expect(
        liquidarQuincena({ inicio: '2099-01-01', fin: '2099-01-15' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si la quincena ya fue liquidada antes', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id);
      await liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA);

      await expect(liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA)).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si ya existe una liquidación de un periodo posterior', async () => {
      const anterior = siguienteQuincena();
      const posterior = siguienteQuincena();
      await liquidarQuincena(posterior, USUARIO_ID_PRUEBA);

      await expect(liquidarQuincena(anterior, USUARIO_ID_PRUEBA)).rejects.toThrow(Conflicto);
    });

    it('lanza Conflicto si hay órdenes abiertas en el periodo', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id, { estado: 'registrada' });

      await expect(liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA)).rejects.toThrow(Conflicto);
    });
  });

  describe('listarLiquidaciones / obtenerLiquidacionPorId / obtenerLiquidacionOFallar', () => {
    it('devuelve null si el id no existe', async () => {
      await expect(obtenerLiquidacionPorId(999999999)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerLiquidacionOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });

    it('incluye la liquidación recién creada, con total y paginación', async () => {
      const { inicio, fin } = siguienteQuincena();
      await abrirJornadaEn(inicio);
      const colaborador = await crearColaboradorDePrueba();
      await crearOrdenDePrueba(colaborador.id);
      const liquidacion = await liquidarQuincena({ inicio, fin }, USUARIO_ID_PRUEBA);

      const resultado = await listarLiquidaciones();
      expect(resultado.liquidaciones.map((l) => l.id)).toContain(liquidacion.id);
      expect(resultado.pagina).toBe(1);
      expect(resultado.porPagina).toBe(20);
      expect(resultado.total).toBeGreaterThanOrEqual(1);
    });
  });
});

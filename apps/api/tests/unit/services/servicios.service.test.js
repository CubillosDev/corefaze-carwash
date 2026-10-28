const {
  listarServicios,
  obtenerServicioPorId,
  obtenerServicioOFallar,
  obtenerTarifaParaTipoVehiculo,
  requiereAutorizacionMotor,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
} = require('../../../src/services/servicios.service');
const { NoEncontrado, Conflicto, SolicitudInvalida } = require('../../../src/utils/errores');
const { crearGeneradorDeValorUnico } = require('../../utils/valorUnico');

const USUARIO_ID_PRUEBA = 1;

// servicios.service.js ya escribe en el Supabase local (SCRUM-152), no en
// un array que un beforeEach pudiera vaciar: el número es único (salto
// aleatorio por archivo + contador) para no chocar ni dentro de esta
// corrida ni con otro archivo que Jest ejecute en paralelo. A diferencia
// del código de colaboradores, `numero` no tiene un rango acotado (solo
// exige >= 1), así que un sorteo amplio basta sin consultar la BD antes.
const selloNumero = 1000 + Math.floor(Math.random() * 20000);
const numeroUnico = crearGeneradorDeValorUnico(selloNumero, (sello, contador) => sello + contador);

const servicioValido = (overrides = {}) => ({
  numero: numeroUnico(),
  nombre: 'Lavado básico',
  descripcion: 'Lavado exterior con shampoo',
  categoria: 'basico',
  tarifas: [
    { tipoVehiculo: 'automovil', valor: 15000 },
    { tipoVehiculo: 'camioneta', valor: 20000 },
  ],
  ...overrides,
});

describe('servicios.service', () => {
  describe('crearServicio', () => {
    it('crea un servicio con un id numérico', async () => {
      const datos = servicioValido();
      const servicio = await crearServicio(datos, USUARIO_ID_PRUEBA);
      expect(servicio).toMatchObject({ numero: datos.numero, nombre: 'Lavado básico' });
      expect(typeof servicio.id).toBe('number');
    });

    it('todo servicio nuevo nace activo, sin importar qué venga en datos', async () => {
      const servicio = await crearServicio(servicioValido({ activo: false }), USUARIO_ID_PRUEBA);
      expect(servicio.activo).toBe(true);
    });

    it('asigna ids distintos a cada servicio nuevo', async () => {
      const primero = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      const segundo = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      expect(segundo.id).not.toBe(primero.id);
    });

    it('rechaza un número de servicio duplicado (409)', async () => {
      const datos = servicioValido();
      await crearServicio(datos, USUARIO_ID_PRUEBA);
      await expect(
        crearServicio({ ...servicioValido(), numero: datos.numero }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza tarifas con el mismo tipoVehiculo repetido', async () => {
      await expect(
        crearServicio(
          servicioValido({
            tarifas: [
              { tipoVehiculo: 'automovil', valor: 15000 },
              { tipoVehiculo: 'automovil', valor: 18000 },
            ],
          }),
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('si el reemplazo de tarifas falla al crear, no queda un servicio huérfano sin tarifas', async () => {
      // mismo hallazgo que en actualizarServicio: un valor fuera de rango no lo
      // atrapa validarTarifasSinDuplicados y llega hasta la función RPC, que lo
      // rechaza por tarifas_servicio_valor_check. crearServicio compensa
      // borrando el servicio recién creado — nunca debe quedar un servicio sin
      // ninguna tarifa.
      const datos = servicioValido({
        tarifas: [
          { tipoVehiculo: 'automovil', valor: 15000 },
          { tipoVehiculo: 'camioneta', valor: 50 },
        ],
      });

      await expect(crearServicio(datos, USUARIO_ID_PRUEBA)).rejects.toThrow(SolicitudInvalida);

      const servicios = await listarServicios();
      expect(servicios.find((servicio) => servicio.numero === datos.numero)).toBeUndefined();
    });
  });

  describe('listarServicios / obtenerServicioPorId', () => {
    it('la lista incluye los servicios recién creados', async () => {
      const primero = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      const segundo = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);

      const ids = (await listarServicios()).map((servicio) => servicio.id);
      expect(ids).toEqual(expect.arrayContaining([primero.id, segundo.id]));
    });

    it('devuelve null si el id no existe', async () => {
      await expect(obtenerServicioPorId(999999999)).resolves.toBeNull();
    });
  });

  describe('obtenerServicioOFallar', () => {
    it('devuelve el servicio si existe', async () => {
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      await expect(obtenerServicioOFallar(creado.id)).resolves.toMatchObject({ id: creado.id });
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerServicioOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('obtenerTarifaParaTipoVehiculo', () => {
    it('devuelve el valor de la tarifa cuando el tipo de vehículo existe', async () => {
      const servicio = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      expect(obtenerTarifaParaTipoVehiculo(servicio, 'automovil')).toBe(15000);
      expect(obtenerTarifaParaTipoVehiculo(servicio, 'camioneta')).toBe(20000);
    });

    it('lanza Conflicto si el servicio no tiene tarifa para ese tipo de vehículo (R3)', async () => {
      const servicio = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      expect(() => obtenerTarifaParaTipoVehiculo(servicio, 'moto_hasta_150cc')).toThrow(Conflicto);
    });
  });

  describe('requiereAutorizacionMotor', () => {
    it.each([5, 6, 7, 8])('devuelve true para el número de servicio %i (R7)', (numero) => {
      expect(requiereAutorizacionMotor(numero)).toBe(true);
    });

    it.each([1, 2, 3, 4, 9, 100])('devuelve false para el número de servicio %i', (numero) => {
      expect(requiereAutorizacionMotor(numero)).toBe(false);
    });
  });

  describe('actualizarServicio', () => {
    it('actualiza el nombre', async () => {
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarServicio(
        creado.id,
        { nombre: 'Lavado premium' },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.nombre).toBe('Lavado premium');
    });

    it('reemplaza el arreglo de tarifas completo', async () => {
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      const nuevasTarifas = [{ tipoVehiculo: 'moto_hasta_150cc', valor: 8000 }];
      const actualizado = await actualizarServicio(
        creado.id,
        { tarifas: nuevasTarifas },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.tarifas).toEqual(nuevasTarifas);
    });

    it('rechaza tarifas nuevas con tipoVehiculo repetido', async () => {
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      await expect(
        actualizarServicio(
          creado.id,
          {
            tarifas: [
              { tipoVehiculo: 'automovil', valor: 15000 },
              { tipoVehiculo: 'automovil', valor: 16000 },
            ],
          },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('si el reemplazo de tarifas falla a mitad de camino, el servicio conserva las tarifas anteriores (nunca queda con 0)', async () => {
      // hallazgo de revisión del PR #12: un valor fuera de rango no lo atrapa
      // validarTarifasSinDuplicados (solo mira tipoVehiculo repetido), así que
      // llega hasta la función RPC y la rechaza tarifas_servicio_valor_check
      // (valor entre 1000 y 1000000) — eso es lo que hace fallar el INSERT a
      // mitad del reemplazo, con el DELETE ya corrido antes en la misma llamada.
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      const tarifasOriginales = creado.tarifas;

      await expect(
        actualizarServicio(
          creado.id,
          {
            tarifas: [
              { tipoVehiculo: 'moto_hasta_150cc', valor: 8000 },
              { tipoVehiculo: 'platon_7_pasajeros', valor: 50 },
            ],
          },
          USUARIO_ID_PRUEBA,
        ),
      ).rejects.toThrow(SolicitudInvalida);

      const servicioTrasElFallo = await obtenerServicioOFallar(creado.id);
      expect(servicioTrasElFallo.tarifas).toEqual(tarifasOriginales);
      expect(servicioTrasElFallo.tarifas.length).toBeGreaterThan(0);
    });

    it('rechaza cambiar a un número ocupado por otro servicio', async () => {
      const datos = servicioValido();
      await crearServicio(datos, USUARIO_ID_PRUEBA);
      const otro = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      await expect(
        actualizarServicio(otro.id, { numero: datos.numero }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('permite conservar el propio número sin conflicto al actualizar otros campos', async () => {
      const datos = servicioValido();
      const creado = await crearServicio(datos, USUARIO_ID_PRUEBA);
      await expect(
        actualizarServicio(
          creado.id,
          { numero: datos.numero, nombre: 'Lavado básico plus' },
          USUARIO_ID_PRUEBA,
        ),
      ).resolves.toBeDefined();
    });

    it('permite desactivar el servicio', async () => {
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarServicio(creado.id, { activo: false }, USUARIO_ID_PRUEBA);
      expect(actualizado.activo).toBe(false);
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(
        actualizarServicio(999999999, { nombre: 'x' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });
  });

  describe('eliminarServicio', () => {
    it('elimina un servicio existente', async () => {
      const creado = await crearServicio(servicioValido(), USUARIO_ID_PRUEBA);
      await eliminarServicio(creado.id, USUARIO_ID_PRUEBA);
      await expect(obtenerServicioPorId(creado.id)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(eliminarServicio(999999999, USUARIO_ID_PRUEBA)).rejects.toThrow(NoEncontrado);
    });
  });
});

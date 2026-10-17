const servicios = require('../../../src/data/servicios');
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

beforeEach(() => {
  servicios.length = 0;
});

const servicioValido = {
  numero: 1,
  nombre: 'Lavado básico',
  descripcion: 'Lavado exterior con shampoo',
  categoria: 'basico',
  tarifas: [
    { tipoVehiculo: 'automovil', valor: 15000 },
    { tipoVehiculo: 'camioneta', valor: 20000 },
  ],
};

describe('servicios.service', () => {
  describe('crearServicio', () => {
    it('crea un servicio con id 1', () => {
      const servicio = crearServicio(servicioValido);
      expect(servicio).toMatchObject({ id: 1, numero: 1, nombre: 'Lavado básico' });
    });

    it('todo servicio nuevo nace activo, sin importar qué venga en datos', () => {
      const servicio = crearServicio({ ...servicioValido, activo: false });
      expect(servicio.activo).toBe(true);
    });

    it('asigna ids consecutivos', () => {
      crearServicio(servicioValido);
      const segundo = crearServicio({ ...servicioValido, numero: 2 });
      expect(segundo.id).toBe(2);
    });

    it('rechaza un número de servicio duplicado (409)', () => {
      crearServicio(servicioValido);
      expect(() => crearServicio({ ...servicioValido, nombre: 'Otro lavado' })).toThrow(Conflicto);
    });

    it('rechaza tarifas con el mismo tipoVehiculo repetido', () => {
      expect(() =>
        crearServicio({
          ...servicioValido,
          tarifas: [
            { tipoVehiculo: 'automovil', valor: 15000 },
            { tipoVehiculo: 'automovil', valor: 18000 },
          ],
        }),
      ).toThrow(SolicitudInvalida);
    });
  });

  describe('listarServicios / obtenerServicioPorId', () => {
    it('lista todos los servicios creados', () => {
      crearServicio(servicioValido);
      crearServicio({ ...servicioValido, numero: 2 });
      expect(listarServicios()).toHaveLength(2);
    });

    it('devuelve null si el id no existe', () => {
      expect(obtenerServicioPorId(999)).toBeNull();
    });
  });

  describe('obtenerServicioOFallar', () => {
    it('devuelve el servicio si existe', () => {
      const creado = crearServicio(servicioValido);
      expect(obtenerServicioOFallar(creado.id)).toBe(creado);
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => obtenerServicioOFallar(999)).toThrow(NoEncontrado);
    });
  });

  describe('obtenerTarifaParaTipoVehiculo', () => {
    it('devuelve el valor de la tarifa cuando el tipo de vehículo existe', () => {
      const servicio = crearServicio(servicioValido);
      expect(obtenerTarifaParaTipoVehiculo(servicio, 'automovil')).toBe(15000);
      expect(obtenerTarifaParaTipoVehiculo(servicio, 'camioneta')).toBe(20000);
    });

    it('lanza Conflicto si el servicio no tiene tarifa para ese tipo de vehículo (R3)', () => {
      const servicio = crearServicio(servicioValido);
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
    it('actualiza el nombre', () => {
      const creado = crearServicio(servicioValido);
      const actualizado = actualizarServicio(creado.id, { nombre: 'Lavado premium' });
      expect(actualizado.nombre).toBe('Lavado premium');
    });

    it('reemplaza el arreglo de tarifas completo', () => {
      const creado = crearServicio(servicioValido);
      const nuevasTarifas = [{ tipoVehiculo: 'moto_hasta_150cc', valor: 8000 }];
      const actualizado = actualizarServicio(creado.id, { tarifas: nuevasTarifas });
      expect(actualizado.tarifas).toEqual(nuevasTarifas);
    });

    it('rechaza tarifas nuevas con tipoVehiculo repetido', () => {
      const creado = crearServicio(servicioValido);
      expect(() =>
        actualizarServicio(creado.id, {
          tarifas: [
            { tipoVehiculo: 'automovil', valor: 15000 },
            { tipoVehiculo: 'automovil', valor: 16000 },
          ],
        }),
      ).toThrow(SolicitudInvalida);
    });

    it('rechaza cambiar a un número ocupado por otro servicio', () => {
      crearServicio(servicioValido);
      const otro = crearServicio({ ...servicioValido, numero: 2 });
      expect(() => actualizarServicio(otro.id, { numero: 1 })).toThrow(Conflicto);
    });

    it('permite conservar el propio número sin conflicto al actualizar otros campos', () => {
      const creado = crearServicio(servicioValido);
      expect(() =>
        actualizarServicio(creado.id, { numero: 1, nombre: 'Lavado básico plus' }),
      ).not.toThrow();
    });

    it('permite desactivar el servicio', () => {
      const creado = crearServicio(servicioValido);
      const actualizado = actualizarServicio(creado.id, { activo: false });
      expect(actualizado.activo).toBe(false);
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => actualizarServicio(999, { nombre: 'x' })).toThrow(NoEncontrado);
    });
  });

  describe('eliminarServicio', () => {
    it('elimina un servicio existente', () => {
      const creado = crearServicio(servicioValido);
      eliminarServicio(creado.id);
      expect(obtenerServicioPorId(creado.id)).toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => eliminarServicio(999)).toThrow(NoEncontrado);
    });
  });
});

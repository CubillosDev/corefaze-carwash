const { aCamelCase, aSnakeCase } = require('../../../src/utils/mapearCampos');

describe('mapearCampos', () => {
  describe('aCamelCase (base de datos → JSON)', () => {
    it('convierte las llaves de un objeto', () => {
      expect(
        aCamelCase({ tipo_vehiculo: 'automovil', colaborador_id: 6, creado_en: '2026-08-03' }),
      ).toEqual({ tipoVehiculo: 'automovil', colaboradorId: 6, creadoEn: '2026-08-03' });
    });

    it('deja intactos los valores, incluidos los enumerados en snake_case', () => {
      expect(aCamelCase({ estado_orden: 'en_proceso' })).toEqual({ estadoOrden: 'en_proceso' });
    });

    it('convierte arreglos de objetos', () => {
      expect(aCamelCase([{ medio_pago: 'nequi' }, { medio_pago: 'efectivo' }])).toEqual([
        { medioPago: 'nequi' },
        { medioPago: 'efectivo' },
      ]);
    });

    it('convierte objetos anidados (servicio con sus tarifas)', () => {
      const fila = {
        id: 2,
        tarifas_servicio: [{ tipo_vehiculo: 'automovil', valor: 28000 }],
      };

      expect(aCamelCase(fila)).toEqual({
        id: 2,
        tarifasServicio: [{ tipoVehiculo: 'automovil', valor: 28000 }],
      });
    });

    it('no altera llaves que ya están en una sola palabra', () => {
      expect(aCamelCase({ id: 1, placa: 'ABC123' })).toEqual({ id: 1, placa: 'ABC123' });
    });
  });

  describe('aSnakeCase (JSON → base de datos)', () => {
    it('convierte las llaves de un objeto', () => {
      expect(aSnakeCase({ tipoVehiculo: 'automovil', autorizaMotor: true })).toEqual({
        tipo_vehiculo: 'automovil',
        autoriza_motor: true,
      });
    });

    it('convierte estructuras anidadas', () => {
      expect(aSnakeCase({ tarifas: [{ tipoVehiculo: 'moto_hasta_150cc' }] })).toEqual({
        tarifas: [{ tipo_vehiculo: 'moto_hasta_150cc' }],
      });
    });
  });

  describe('casos límite', () => {
    it.each([[null], [undefined], [42], ['texto'], [true]])('devuelve %p sin cambios', (valor) => {
      expect(aCamelCase(valor)).toBe(valor);
      expect(aSnakeCase(valor)).toBe(valor);
    });

    it('no convierte las fechas en objetos', () => {
      const fecha = new Date('2026-08-03T00:00:00Z');

      expect(aCamelCase({ creado_en: fecha }).creadoEn).toBe(fecha);
    });

    it('no modifica el objeto original', () => {
      const original = Object.freeze({ tipo_vehiculo: 'automovil' });

      expect(() => aCamelCase(original)).not.toThrow();
      expect(original).toEqual({ tipo_vehiculo: 'automovil' });
    });

    it('ida y vuelta devuelve el objeto original', () => {
      const fila = { colaborador_id: 6, medio_pago: 'nequi', autoriza_motor: false };

      expect(aSnakeCase(aCamelCase(fila))).toEqual(fila);
    });

    it('trata __proto__ como una llave más, sin contaminar prototipos', () => {
      const malicioso = JSON.parse('{"__proto__": {"admin": true}}');

      aCamelCase(malicioso);

      expect({}.admin).toBeUndefined();
    });
  });
});

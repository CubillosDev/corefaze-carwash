const {
  ESTADOS_ORDEN,
  ESTADOS_ORDEN_ABIERTOS,
  ESTADOS_ORDEN_CERRADOS,
  TRANSICIONES_ORDEN,
  MEDIOS_PAGO,
  TIPOS_VEHICULO,
  TIPOS_VEHICULO_MOTO,
  SERVICIOS_CON_LAVADO_MOTOR,
  PATRONES_PLACA,
  ROLES,
} = require('../../../src/constants/dominio');

const todosLosEstados = Object.values(ESTADOS_ORDEN);

describe('constantes de dominio', () => {
  describe('enumeraciones', () => {
    it('exponen los valores en snake_case bajo llaves UPPER_SNAKE_CASE', () => {
      expect(ESTADOS_ORDEN.EN_PROCESO).toBe('en_proceso');
      expect(MEDIOS_PAGO.CREDITO).toBe('credito');
      expect(TIPOS_VEHICULO.MOTO_HASTA_150CC).toBe('moto_hasta_150cc');
    });

    it('no tienen valores repetidos', () => {
      [ESTADOS_ORDEN, MEDIOS_PAGO, TIPOS_VEHICULO].forEach((enumeracion) => {
        const valores = Object.values(enumeracion);
        expect(new Set(valores).size).toBe(valores.length);
      });
    });

    it('las motos son un subconjunto de los tipos de vehículo', () => {
      TIPOS_VEHICULO_MOTO.forEach((tipo) => {
        expect(Object.values(TIPOS_VEHICULO)).toContain(tipo);
      });
    });

    it('están congeladas: no se pueden modificar', () => {
      expect(Object.isFrozen(ESTADOS_ORDEN)).toBe(true);
      expect(Object.isFrozen(ESTADOS_ORDEN_CERRADOS)).toBe(true);
      expect(Object.isFrozen(TRANSICIONES_ORDEN.registrada)).toBe(true);
    });
  });

  describe('máquina de estados de la orden', () => {
    it('define transiciones para todos los estados y solo para ellos', () => {
      expect(Object.keys(TRANSICIONES_ORDEN).sort()).toEqual([...todosLosEstados].sort());
    });

    it('todo destino de una transición es un estado válido', () => {
      Object.values(TRANSICIONES_ORDEN)
        .flat()
        .forEach((destino) => expect(todosLosEstados).toContain(destino));
    });

    it('los estados cerrados no tienen transiciones (R10)', () => {
      ESTADOS_ORDEN_CERRADOS.forEach((estado) => {
        expect(TRANSICIONES_ORDEN[estado]).toEqual([]);
      });
    });

    it('no permite saltar estados: registrada no pasa a entregada (R9)', () => {
      expect(TRANSICIONES_ORDEN[ESTADOS_ORDEN.REGISTRADA]).not.toContain(ESTADOS_ORDEN.ENTREGADA);
    });

    it('no permite retroceder: entregada no vuelve a en_proceso (R9)', () => {
      expect(TRANSICIONES_ORDEN[ESTADOS_ORDEN.ENTREGADA]).not.toContain(ESTADOS_ORDEN.EN_PROCESO);
    });

    it('los estados abiertos y cerrados no se cruzan (R6 y R10)', () => {
      ESTADOS_ORDEN_ABIERTOS.forEach((estado) => {
        expect(ESTADOS_ORDEN_CERRADOS).not.toContain(estado);
      });
    });
  });

  describe('reglas de servicio', () => {
    it('los servicios con lavado de motor son el 5, 6, 7 y 8 (R7)', () => {
      expect(SERVICIOS_CON_LAVADO_MOTOR).toEqual([5, 6, 7, 8]);
    });
  });

  describe('roles de usuario', () => {
    it('define superadmin, administrador y soporte', () => {
      expect(ROLES).toEqual(['superadmin', 'administrador', 'soporte']);
    });
  });

  describe('patrones de placa', () => {
    it.each(['ABC123', 'XYZ999'])('acepta la placa de carro %s', (placa) => {
      expect(PATRONES_PLACA.CARRO.test(placa)).toBe(true);
    });

    it.each(['ABC12D', 'XYZ99A'])('acepta la placa de moto %s', (placa) => {
      expect(PATRONES_PLACA.MOTO.test(placa)).toBe(true);
    });

    it.each(['12-ABC', 'abc123', 'ABC 123', 'AB1234', 'ABC1234', ''])(
      'rechaza la placa de carro inválida "%s"',
      (placa) => {
        expect(PATRONES_PLACA.CARRO.test(placa)).toBe(false);
      },
    );

    it('una placa de carro no es válida como placa de moto y viceversa', () => {
      expect(PATRONES_PLACA.MOTO.test('ABC123')).toBe(false);
      expect(PATRONES_PLACA.CARRO.test('ABC12D')).toBe(false);
    });
  });
});

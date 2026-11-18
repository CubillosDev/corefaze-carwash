import { describe, expect, it } from 'vitest';

import { LIMITES } from '@/constants/dominio';
import {
  validarServicio,
  valoresDeServicio,
  VALORES_INICIALES_SERVICIO,
} from '@/features/servicios/validators/servicio.schema';

const VALIDO = {
  ...VALORES_INICIALES_SERVICIO,
  numero: '20',
  nombre: 'Servicio de prueba',
  tarifas: { ...VALORES_INICIALES_SERVICIO.tarifas, automovil: '22000' },
};

describe('validarServicio', () => {
  it('solo envía las tarifas escritas, tal cual', () => {
    const { valido, datos } = validarServicio(VALIDO);

    expect(valido).toBe(true);
    expect(datos).toEqual({
      numero: 20,
      nombre: 'Servicio de prueba',
      activo: true,
      tarifas: [{ tipoVehiculo: 'automovil', valor: 22000 }],
    });
  });

  it('exige al menos una tarifa y respeta los límites del contrato', () => {
    const sinTarifas = validarServicio({ ...VALIDO, tarifas: VALORES_INICIALES_SERVICIO.tarifas });
    const conTarifaBaja = validarServicio({
      ...VALIDO,
      tarifas: { ...VALIDO.tarifas, camioneta: String(LIMITES.tarifa.min - 1) },
    });

    expect(sinTarifas.errores.tarifas).toBeTruthy();
    expect(conTarifaBaja.errores['tarifa-camioneta']).toBeTruthy();
  });

  it('carga un servicio de la API en el formulario', () => {
    const valores = valoresDeServicio({
      numero: 3,
      nombre: 'Lavado',
      descripcion: null,
      categoria: 'lavado',
      activo: false,
      tarifas: [{ tipoVehiculo: 'camioneta', valor: 25000 }],
    });

    expect(valores).toMatchObject({ numero: '3', descripcion: '', activo: false });
    expect(valores.tarifas).toMatchObject({ camioneta: '25000', automovil: '' });
  });
});

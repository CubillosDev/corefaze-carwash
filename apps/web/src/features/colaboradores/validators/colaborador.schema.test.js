import { describe, expect, it } from 'vitest';

import {
  estadoContrario,
  validarColaborador,
  valoresDeColaborador,
  VALORES_INICIALES_COLABORADOR,
} from '@/features/colaboradores/validators/colaborador.schema';

const VALIDO = {
  ...VALORES_INICIALES_COLABORADOR,
  codigo: '405',
  nombre: 'Colaborador Prueba',
  documento: '1020300405',
  telefono: '3010000405',
  porcentaje: '37',
};

describe('validarColaborador', () => {
  it('envía la comisión como la fracción que pide la API', () => {
    const { valido, datos } = validarColaborador(VALIDO);

    expect(valido).toBe(true);
    expect(datos).toMatchObject({ codigo: 405, porcentajeComision: 0.37, tipoVinculacion: 'fijo' });
  });

  it('valida el código de tres dígitos y la comisión entre 0 y 100 %', () => {
    const { errores } = validarColaborador({ ...VALIDO, codigo: '45', porcentaje: '120' });

    expect(Object.keys(errores).sort()).toEqual(['codigo', 'porcentaje']);
  });

  it('convierte la fracción de la API al porcentaje del formulario y de vuelta', () => {
    const valores = valoresDeColaborador({ ...VALIDO, codigo: 405, porcentajeComision: 0.375 });

    expect(valores.porcentaje).toBe('37.5');
    expect(validarColaborador(valores).datos.porcentajeComision).toBe(0.375);
  });

  it('alterna entre activo e inactivo', () => {
    expect(estadoContrario('activo')).toBe('inactivo');
    expect(estadoContrario('inactivo')).toBe('activo');
  });
});

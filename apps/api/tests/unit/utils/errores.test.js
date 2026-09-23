const {
  ErrorHttp,
  SolicitudInvalida,
  NoAutenticado,
  NoEncontrado,
  Conflicto,
  AccesoDenegado,
} = require('../../../src/utils/errores');

describe('errores HTTP del dominio', () => {
  it.each([
    ['SolicitudInvalida', new SolicitudInvalida(), 400],
    ['NoAutenticado', new NoAutenticado(), 401],
    ['NoEncontrado', new NoEncontrado(), 404],
    ['Conflicto', new Conflicto('Turno repetido'), 409],
    ['AccesoDenegado', new AccesoDenegado(), 403],
  ])('%s usa el estado HTTP %i', (nombre, error, estado) => {
    expect(error.estado).toBe(estado);
    expect(error.name).toBe(nombre);
  });
  it('todos son instancias de ErrorHttp y de Error', () => {
    [new SolicitudInvalida(), new NoAutenticado(), new NoEncontrado(), new Conflicto('x')].forEach(
      (error) => {
        expect(error).toBeInstanceOf(ErrorHttp);
        expect(error).toBeInstanceOf(Error);
      },
    );
  });

  it('conservan el mensaje recibido', () => {
    expect(new Conflicto('El turno ya existe').message).toBe('El turno ya existe');
    expect(new NoEncontrado('Vehículo no encontrado').message).toBe('Vehículo no encontrado');
  });

  it('tienen un mensaje por defecto donde corresponde', () => {
    expect(new NoAutenticado().message).toBe('API Key inválida o ausente');
    expect(new NoEncontrado().message).toBe('Recurso no encontrado');
    expect(new SolicitudInvalida().message).toBe('Datos de entrada inválidos');
  });

  describe('aCuerpo', () => {
    it('devuelve solo { mensaje } en los errores comunes', () => {
      expect(new Conflicto('Turno repetido').aCuerpo()).toEqual({ mensaje: 'Turno repetido' });
      expect(new NoEncontrado('Orden no encontrada').aCuerpo()).toEqual({
        mensaje: 'Orden no encontrada',
      });
      expect(new AccesoDenegado('API Key deshabilitada').aCuerpo()).toEqual({
        mensaje: 'API Key deshabilitada',
      });
    });

    it('agrega errores[] en SolicitudInvalida', () => {
      const errores = [{ campo: 'placa', mensaje: 'Placa inválida' }];

      expect(new SolicitudInvalida(errores).aCuerpo()).toEqual({
        mensaje: 'Datos de entrada inválidos',
        errores,
      });
    });

    it('SolicitudInvalida sin detalle devuelve una lista vacía', () => {
      expect(new SolicitudInvalida().aCuerpo().errores).toEqual([]);
    });
  });
});

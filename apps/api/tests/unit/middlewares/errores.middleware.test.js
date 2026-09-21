const { rutaNoEncontrada, manejarErrores } = require('../../../src/middlewares/errores.middleware');
const {
  SolicitudInvalida,
  NoAutenticado,
  NoEncontrado,
  Conflicto,
} = require('../../../src/utils/errores');

// Respuesta falsa: status() y json() encadenables, para inspeccionar qué se envió
const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const ejecutar = (error) => {
  const res = crearRespuesta();
  manejarErrores(error, {}, res, jest.fn());
  return res;
};

describe('manejarErrores', () => {
  it.each([
    ['NoAutenticado', new NoAutenticado(), 401, { mensaje: 'API Key inválida o ausente' }],
    [
      'NoEncontrado',
      new NoEncontrado('Orden no encontrada'),
      404,
      { mensaje: 'Orden no encontrada' },
    ],
    ['Conflicto', new Conflicto('El turno ya existe'), 409, { mensaje: 'El turno ya existe' }],
  ])('responde %s con su estado y { mensaje }', (_nombre, error, estado, cuerpo) => {
    const res = ejecutar(error);

    expect(res.status).toHaveBeenCalledWith(estado);
    expect(res.json).toHaveBeenCalledWith(cuerpo);
  });

  it('responde 400 con el detalle por campo en SolicitudInvalida', () => {
    const errores = [{ campo: 'placa', mensaje: 'Placa inválida' }];
    const res = ejecutar(new SolicitudInvalida(errores));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Datos de entrada inválidos', errores });
  });

  it('responde 400 cuando el cuerpo no es un JSON válido', () => {
    const errorDeExpress = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
    });
    const res = ejecutar(errorDeExpress);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'El cuerpo de la petición no es un JSON válido',
    });
  });

  it('responde 413 cuando el cuerpo es demasiado grande', () => {
    const res = ejecutar(Object.assign(new Error('too large'), { type: 'entity.too.large' }));

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('responde 500 genérico ante un error inesperado, sin filtrar detalles', () => {
    const res = ejecutar(new Error('password de la base: 12345'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error interno del servidor' });

    const cuerpoEnviado = JSON.stringify(res.json.mock.calls[0][0]);
    expect(cuerpoEnviado).not.toContain('12345');
    expect(cuerpoEnviado).not.toContain('stack');
  });
});

describe('rutaNoEncontrada', () => {
  it('pasa un NoEncontrado (404) al siguiente manejador', () => {
    const next = jest.fn();

    rutaNoEncontrada({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(NoEncontrado);
    expect(error.message).toBe('Ruta no encontrada');
  });
});

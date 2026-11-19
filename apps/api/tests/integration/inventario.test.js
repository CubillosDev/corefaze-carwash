const { conApiKey, conRol, conToken } = require('../utils/escenarioPanel');

const nombreUnico = () => `Insumo de prueba ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const crearInsumo = async (datos = {}) => {
  const respuesta = await conToken('post', '/api/inventario').send({
    nombre: nombreUnico(),
    categoria: 'Lavado exterior',
    unidad: 'litros',
    stockMinimo: 10,
    stockInicial: 18,
    ...datos,
  });
  expect(respuesta.status).toBe(201);
  return respuesta.body.insumo;
};

describe('/api/inventario', () => {
  it('exige token; soporte consulta y mueve stock, pero no crea', async () => {
    expect((await conApiKey('get', '/api/inventario')).status).toBe(401);
    expect((await conRol('soporte', 'get', '/api/inventario')).status).toBe(200);
    const respuesta = await conRol('soporte', 'post', '/api/inventario').send({
      nombre: nombreUnico(),
      categoria: 'Interior',
      unidad: 'frascos',
      stockMinimo: 1,
    });
    expect(respuesta.status).toBe(403);
  });

  it('crea un insumo con su stock inicial como primer movimiento', async () => {
    const insumo = await crearInsumo();
    expect(insumo).toMatchObject({
      stock: 18,
      stockMinimo: 10,
      stockBajo: false,
      estado: 'activo',
    });

    const movimientos = await conToken('get', `/api/inventario/${insumo.id}/movimientos`);
    expect(movimientos.body.movimientos).toEqual([
      expect.objectContaining({ cantidad: 18, stockResultante: 18, observacion: 'Stock inicial' }),
    ]);
  });

  it('suma y resta unidades, avisa el stock bajo y nunca queda en negativo', async () => {
    const insumo = await crearInsumo({ stockInicial: 11 });

    const menos = await conRol('soporte', 'post', `/api/inventario/${insumo.id}/movimientos`).send({
      cantidad: -2,
    });
    expect(menos.status).toBe(201);
    expect(menos.body.insumo).toMatchObject({ stock: 9, stockBajo: true });

    const negativo = await conToken('post', `/api/inventario/${insumo.id}/movimientos`).send({
      cantidad: -100,
    });
    expect(negativo.status).toBe(409);

    const cero = await conToken('post', `/api/inventario/${insumo.id}/movimientos`).send({
      cantidad: 0,
    });
    expect(cero.status).toBe(400);
  });

  it('edita sin tocar el stock, rechaza nombres repetidos y desactiva', async () => {
    const insumo = await crearInsumo();
    const editado = await conToken('put', `/api/inventario/${insumo.id}`).send({
      nombre: insumo.nombre,
      categoria: 'Protección',
      unidad: 'frascos',
      stockMinimo: 30,
    });
    expect(editado.body.insumo).toMatchObject({
      categoria: 'Protección',
      stock: 18,
      stockBajo: true,
    });

    const repetido = await conToken('post', '/api/inventario').send({
      nombre: insumo.nombre.toUpperCase(),
      categoria: 'Otra',
      unidad: 'litros',
      stockMinimo: 1,
    });
    expect(repetido.status).toBe(409);

    const inactivo = await conToken('patch', `/api/inventario/${insumo.id}/estado`).send({
      estado: 'inactivo',
    });
    expect(inactivo.body.insumo.estado).toBe('inactivo');
    const sinMover = await conToken('post', `/api/inventario/${insumo.id}/movimientos`).send({
      cantidad: 1,
    });
    expect(sinMover.status).toBe(409);
  });

  it('responde 404 con un insumo que no existe', async () => {
    expect(
      (
        await conToken('put', '/api/inventario/999999999').send({
          nombre: 'No existe',
          categoria: 'X1',
          unidad: 'u',
          stockMinimo: 1,
        })
      ).status,
    ).toBe(404);
  });
});

const { supabase } = require('../../../src/db/supabaseCliente');
const {
  listarColaboradores,
  obtenerColaboradorPorId,
  obtenerColaboradorOFallar,
  crearColaborador,
  actualizarColaborador,
  cambiarEstadoColaborador,
  eliminarColaborador,
} = require('../../../src/services/colaboradores.service');
const { NoEncontrado, Conflicto } = require('../../../src/utils/errores');

const USUARIO_ID_PRUEBA = 1;

// colaboradores.service.js ya escribe en el Supabase local (SCRUM-152), no
// en un array que un beforeEach pudiera vaciar: documento y código son
// únicos (salto aleatorio por archivo + contador) para no chocar ni dentro
// de esta corrida ni con otro archivo que Jest ejecute en paralelo.
//
// El código solo tiene 900 valores posibles (100-999, ver la migración de
// `colaboradores`): a diferencia del documento o la placa, este espacio es
// chico y un simple sorteo aleatorio choca con los códigos que ya quedaron
// "activos" de corridas anteriores (nada los limpia sin un `db reset`).
// Por eso aquí se consulta qué códigos ya existen antes de sortear uno
// libre, en vez de solo confiar en el azar. Un `db reset` periódico sigue
// siendo necesario para que el rango no se agote del todo con el tiempo.
const sello = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorDocumento = 0;
const documentoUnico = () => {
  contadorDocumento += 1;
  return `${sello}${String(contadorDocumento).padStart(3, '0')}`;
};

const codigosOcupados = new Set();
let siguienteIntentoCodigo = Math.floor(Math.random() * 900);

beforeAll(async () => {
  const { data, error } = await supabase.from('colaboradores').select('codigo');
  if (error) {
    throw error;
  }
  data.forEach((fila) => codigosOcupados.add(fila.codigo));
});

const codigoUnico = () => {
  for (let intento = 0; intento < 900; intento += 1) {
    const candidato = 100 + ((siguienteIntentoCodigo + intento) % 900);
    if (!codigosOcupados.has(candidato)) {
      codigosOcupados.add(candidato);
      siguienteIntentoCodigo += intento + 1;
      return candidato;
    }
  }
  throw new Error(
    'No quedan códigos de colaborador libres entre 100 y 999 (hace falta un db reset)',
  );
};

const colaboradorValido = (overrides = {}) => ({
  codigo: codigoUnico(),
  nombre: 'Juan Pérez',
  documento: documentoUnico(),
  telefono: '3001234567',
  porcentajeComision: 0.15,
  tipoVinculacion: 'fijo',
  ...overrides,
});

// Simula que un colaborador quedó inactivo hace `dias` días, escribiendo
// directo contra la BD (bypass del service): actualizarColaborador siempre
// pone inactivoDesde en el momento actual, nunca en una fecha arbitraria
// del pasado, así que no sirve para preparar este escenario.
const marcarInactivoHaceNDias = async (colaborador, dias) => {
  const fecha = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from('colaboradores')
    .update({ estado: 'inactivo', inactivo_desde: fecha.toISOString() })
    .eq('id', colaborador.id);
  if (error) {
    throw error;
  }
};

describe('colaboradores.service', () => {
  describe('crearColaborador', () => {
    it('crea un colaborador con un id numérico', async () => {
      const datos = colaboradorValido();
      const colaborador = await crearColaborador(datos, USUARIO_ID_PRUEBA);
      expect(colaborador).toMatchObject({ codigo: datos.codigo, estado: 'activo' });
      expect(typeof colaborador.id).toBe('number');
    });

    it('todo colaborador nuevo nace activo, con inactivoDesde en null', async () => {
      const colaborador = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      expect(colaborador.estado).toBe('activo');
      expect(colaborador.inactivoDesde).toBeNull();
    });

    it('rechaza un código que pertenece a un colaborador activo (409)', async () => {
      const datos = colaboradorValido();
      await crearColaborador(datos, USUARIO_ID_PRUEBA);
      await expect(
        crearColaborador({ ...colaboradorValido(), codigo: datos.codigo }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('rechaza un documento duplicado, sin importar el estado (409)', async () => {
      const datos = colaboradorValido();
      const creado = await crearColaborador(datos, USUARIO_ID_PRUEBA);
      await marcarInactivoHaceNDias(creado, 100); // mucho más allá del período de gracia
      await expect(
        crearColaborador({ ...colaboradorValido(), documento: datos.documento }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    describe('reasignación de código tras el período de gracia (15 días)', () => {
      it('rechaza el código de un colaborador inactivo hace menos de 15 días', async () => {
        const datos = colaboradorValido();
        const creado = await crearColaborador(datos, USUARIO_ID_PRUEBA);
        await marcarInactivoHaceNDias(creado, 10);

        await expect(
          crearColaborador({ ...colaboradorValido(), codigo: datos.codigo }, USUARIO_ID_PRUEBA),
        ).rejects.toThrow(Conflicto);
      });

      it('permite reasignar el código de un colaborador inactivo hace más de 15 días', async () => {
        const datos = colaboradorValido();
        const creado = await crearColaborador(datos, USUARIO_ID_PRUEBA);
        await marcarInactivoHaceNDias(creado, 20);

        const nuevo = await crearColaborador(
          { ...colaboradorValido(), codigo: datos.codigo },
          USUARIO_ID_PRUEBA,
        );
        expect(nuevo.codigo).toBe(datos.codigo);
      });

      it('exactamente en el límite (15 días) todavía protege el código', async () => {
        const datos = colaboradorValido();
        const creado = await crearColaborador(datos, USUARIO_ID_PRUEBA);
        await marcarInactivoHaceNDias(creado, 15);

        await expect(
          crearColaborador({ ...colaboradorValido(), codigo: datos.codigo }, USUARIO_ID_PRUEBA),
        ).rejects.toThrow(Conflicto);
      });
    });
  });

  describe('listarColaboradores / obtenerColaboradorPorId', () => {
    it('la lista incluye los colaboradores recién creados', async () => {
      const primero = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      const segundo = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);

      const ids = (await listarColaboradores()).map((colaborador) => colaborador.id);
      expect(ids).toEqual(expect.arrayContaining([primero.id, segundo.id]));
    });

    it('devuelve null si el id no existe', async () => {
      await expect(obtenerColaboradorPorId(999999999)).resolves.toBeNull();
    });
  });

  describe('obtenerColaboradorOFallar', () => {
    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerColaboradorOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('actualizarColaborador', () => {
    it('actualiza el porcentaje de comisión', async () => {
      const creado = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarColaborador(
        creado.id,
        { porcentajeComision: 0.2 },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.porcentajeComision).toBe(0.2);
    });

    it('al pasar a inactivo, registra inactivoDesde', async () => {
      const creado = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      const actualizado = await actualizarColaborador(
        creado.id,
        { estado: 'inactivo' },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.inactivoDesde).not.toBeNull();
    });

    it('al reactivar (mismo colaborador vuelve), limpia inactivoDesde', async () => {
      const creado = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      await actualizarColaborador(creado.id, { estado: 'inactivo' }, USUARIO_ID_PRUEBA);
      const reactivado = await actualizarColaborador(
        creado.id,
        { estado: 'activo' },
        USUARIO_ID_PRUEBA,
      );
      expect(reactivado.inactivoDesde).toBeNull();
    });

    it('rechaza cambiar a un código ocupado por otro colaborador activo', async () => {
      const datos = colaboradorValido();
      await crearColaborador(datos, USUARIO_ID_PRUEBA);
      const otro = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      await expect(
        actualizarColaborador(otro.id, { codigo: datos.codigo }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(Conflicto);
    });

    it('permite conservar el propio código sin conflicto al actualizar otros campos', async () => {
      const datos = colaboradorValido();
      const creado = await crearColaborador(datos, USUARIO_ID_PRUEBA);
      await expect(
        actualizarColaborador(
          creado.id,
          { codigo: datos.codigo, nombre: 'Juan P.' },
          USUARIO_ID_PRUEBA,
        ),
      ).resolves.toBeDefined();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(
        actualizarColaborador(999999999, { nombre: 'x' }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });
  });

  describe('cambiarEstadoColaborador', () => {
    it('cambia el estado a inactivo y registra inactivoDesde', async () => {
      const creado = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      const actualizado = await cambiarEstadoColaborador(creado.id, 'inactivo', USUARIO_ID_PRUEBA);
      expect(actualizado.estado).toBe('inactivo');
      expect(actualizado.inactivoDesde).not.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(
        cambiarEstadoColaborador(999999999, 'inactivo', USUARIO_ID_PRUEBA),
      ).rejects.toThrow(NoEncontrado);
    });
  });

  describe('eliminarColaborador', () => {
    it('elimina un colaborador existente', async () => {
      const creado = await crearColaborador(colaboradorValido(), USUARIO_ID_PRUEBA);
      await eliminarColaborador(creado.id, USUARIO_ID_PRUEBA);
      await expect(obtenerColaboradorPorId(creado.id)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(eliminarColaborador(999999999, USUARIO_ID_PRUEBA)).rejects.toThrow(NoEncontrado);
    });
  });
});

const { supabase } = require('../../../src/db/supabaseCliente');
const {
  obtenerParametros,
  actualizarParametros,
} = require('../../../src/services/parametros.service');
const { SolicitudInvalida } = require('../../../src/utils/errores');

const USUARIO_ID_PRUEBA = 1;

const COLUMNAS = [
  'id',
  'nombre_negocio',
  'nit',
  'direccion',
  'telefono',
  'porcentaje_comision',
  'comision_vigente_desde',
  'descontar_comision_diaria',
  'costo_arriendo',
  'costo_luz',
  'costo_agua',
  'costo_nomina_fija',
  'costo_depreciacion',
  'costo_insumos',
  'costo_variable_lavado',
  'precio_promedio_referencia',
  'tope_prestamo_colaborador',
  'dias_operacion_mes',
  'actualizado_por',
].join(', ');

// parametros_negocio es una fila única (id = 1): a diferencia de los
// demás recursos, no se puede "limpiar" entre pruebas. Se guarda su
// estado original antes de este archivo y se restaura al final, para no
// dejarlo en el estado de la última prueba ni afectar otros archivos
// (actuales o futuros) que también la consulten.
let filaOriginal;

beforeAll(async () => {
  const { data, error } = await supabase
    .from('parametros_negocio')
    .select(COLUMNAS)
    .eq('id', 1)
    .single();

  if (error) {
    throw error;
  }
  filaOriginal = data;
});

/** Quita "id" (no es una columna editable) antes de usar la fila como payload de un update. */
const sinId = ({ id: _id, ...resto }) => resto;

afterAll(async () => {
  const { error } = await supabase
    .from('parametros_negocio')
    .update(sinId(filaOriginal))
    .eq('id', 1);
  if (error) {
    throw error;
  }
});

describe('parametros.service', () => {
  describe('obtenerParametros', () => {
    it('devuelve la fila única (id = 1)', async () => {
      const parametros = await obtenerParametros();
      expect(parametros.id).toBe(1);
    });

    it('nunca incluye creadoEn ni actualizadoEn', async () => {
      const parametros = await obtenerParametros();
      expect(parametros.creadoEn).toBeUndefined();
      expect(parametros.actualizadoEn).toBeUndefined();
    });
  });

  describe('actualizarParametros', () => {
    it('actualiza solo los campos enviados; el resto conserva su valor anterior', async () => {
      const antes = await obtenerParametros();
      const actualizado = await actualizarParametros(
        { nombreNegocio: 'Lavadero de Prueba' },
        USUARIO_ID_PRUEBA,
      );

      expect(actualizado.nombreNegocio).toBe('Lavadero de Prueba');
      expect(actualizado.porcentajeComision).toBe(antes.porcentajeComision);
    });

    it('guarda quién hizo el cambio en actualizadoPor', async () => {
      // actualizado_por es una FK real hacia usuarios(id): usa otro id ya
      // sembrado (2 = administrador), no uno inventado.
      const actualizado = await actualizarParametros({ nombreNegocio: 'Otro nombre' }, 2);
      expect(actualizado.actualizadoPor).toBe(2);
    });

    it('actualiza porcentajeComision', async () => {
      const actualizado = await actualizarParametros(
        { porcentajeComision: 0.4 },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.porcentajeComision).toBe(0.4);
    });

    it('actualiza varios costos a la vez', async () => {
      const actualizado = await actualizarParametros(
        { costoArriendo: 1500000, costoLuz: 250000 },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.costoArriendo).toBe(1500000);
      expect(actualizado.costoLuz).toBe(250000);
    });

    it('acepta un costo en 0 (no lo trata como "no enviado")', async () => {
      // ?? (no ||): 0 no es null ni undefined, así que se guarda tal cual,
      // no se confunde con "el campo no vino en la petición".
      await actualizarParametros({ costoDepreciacion: 500 }, USUARIO_ID_PRUEBA);
      const actualizado = await actualizarParametros({ costoDepreciacion: 0 }, USUARIO_ID_PRUEBA);
      expect(actualizado.costoDepreciacion).toBe(0);
    });

    it('acepta null en un campo opcional (nit)', async () => {
      await actualizarParametros({ nit: '900123456' }, USUARIO_ID_PRUEBA);
      const actualizado = await actualizarParametros({ nit: null }, USUARIO_ID_PRUEBA);
      expect(actualizado.nit).toBeNull();
    });

    it('ignora cualquier intento de cambiar "id" (mass assignment)', async () => {
      const actualizado = await actualizarParametros(
        { id: 999, nombreNegocio: 'Otra vez' },
        USUARIO_ID_PRUEBA,
      );
      expect(actualizado.id).toBe(1);
    });

    it('rechaza un valor que viola una regla de negocio de la BD (defensa adicional al validador)', async () => {
      await expect(
        actualizarParametros({ diasOperacionMes: 40 }, USUARIO_ID_PRUEBA),
      ).rejects.toThrow(SolicitudInvalida);
    });
  });
});

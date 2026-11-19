const nominaService = require('../../../src/services/nomina.service');
const {
  obtenerResumenQuincena,
  listarDescuentosDeColaborador,
  registrarDescuento,
  liquidarQuincena,
  listarLiquidaciones,
  obtenerLiquidacionPorId,
} = require('../../../src/controllers/nomina.controller');

jest.mock('../../../src/services/nomina.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const crearPeticion = ({
  cuerpo = {},
  parametros = {},
  consulta = {},
  usuario = { id: 1 },
} = {}) => ({
  datos: { cuerpo, parametros, consulta },
  usuario,
});

describe('nomina.controller', () => {
  describe('obtenerResumenQuincena', () => {
    it('responde 200 con el resumen devuelto por el service', async () => {
      const resumen = {
        inicio: '2026-01-01',
        fin: '2026-01-15',
        liquidada: false,
        colaboradores: [],
      };
      nominaService.obtenerResumenQuincena.mockResolvedValue(resumen);

      const res = crearRespuesta();
      await obtenerResumenQuincena(
        crearPeticion({ consulta: { inicio: '2026-01-01', fin: '2026-01-15' } }),
        res,
        jest.fn(),
      );

      expect(nominaService.obtenerResumenQuincena).toHaveBeenCalledWith({
        inicio: '2026-01-01',
        fin: '2026-01-15',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(resumen);
    });
  });

  describe('listarDescuentosDeColaborador', () => {
    it('responde 200 con el resultado del service, pasando colaboradorId e inicio/fin', async () => {
      const resultado = { colaborador: { id: 1 }, descuentos: [] };
      nominaService.listarDescuentosDeColaborador.mockResolvedValue(resultado);

      const res = crearRespuesta();
      await listarDescuentosDeColaborador(
        crearPeticion({
          parametros: { colaboradorId: 1 },
          consulta: { inicio: '2026-01-01', fin: '2026-01-15' },
        }),
        res,
        jest.fn(),
      );

      expect(nominaService.listarDescuentosDeColaborador).toHaveBeenCalledWith(1, {
        inicio: '2026-01-01',
        fin: '2026-01-15',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(resultado);
    });
  });

  describe('registrarDescuento', () => {
    it('responde 201 con el descuento creado, pasando el usuario autenticado', async () => {
      const datos = { colaboradorId: 1, tipo: 'jabon', valor: 1000, fecha: '2026-01-01' };
      nominaService.registrarDescuento.mockResolvedValue({ id: 5, ...datos });

      const res = crearRespuesta();
      await registrarDescuento(
        crearPeticion({ cuerpo: datos, usuario: { id: 7 } }),
        res,
        jest.fn(),
      );

      expect(nominaService.registrarDescuento).toHaveBeenCalledWith(datos, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Descuento registrado correctamente' }),
      );
    });

    it('propaga el error si el colaborador no está activo (409)', async () => {
      const error = new Error('conflicto');
      nominaService.registrarDescuento.mockRejectedValue(error);

      await expect(
        registrarDescuento(
          crearPeticion({
            cuerpo: { colaboradorId: 1, tipo: 'jabon', valor: 1000, fecha: '2026-01-01' },
          }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('liquidarQuincena', () => {
    it('responde 201 con la liquidación creada, pasando el usuario autenticado', async () => {
      const datos = { inicio: '2026-01-01', fin: '2026-01-15' };
      nominaService.liquidarQuincena.mockResolvedValue({ id: 9, ...datos });

      const res = crearRespuesta();
      await liquidarQuincena(crearPeticion({ cuerpo: datos, usuario: { id: 7 } }), res, jest.fn());

      expect(nominaService.liquidarQuincena).toHaveBeenCalledWith(datos, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Quincena liquidada correctamente' }),
      );
    });

    it('propaga el error si la quincena aún no ha terminado (409)', async () => {
      const error = new Error('conflicto');
      nominaService.liquidarQuincena.mockRejectedValue(error);

      await expect(
        liquidarQuincena(
          crearPeticion({ cuerpo: { inicio: '2026-01-01', fin: '2026-01-15' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('listarLiquidaciones', () => {
    it('responde 200 con la página devuelta por el service', async () => {
      const resultado = {
        liquidaciones: [{ id: 1 }],
        total: 1,
        pagina: 1,
        porPagina: 20,
        totalPaginas: 1,
      };
      nominaService.listarLiquidaciones.mockResolvedValue(resultado);

      const res = crearRespuesta();
      await listarLiquidaciones(crearPeticion({ consulta: { pagina: 1 } }), res, jest.fn());

      expect(nominaService.listarLiquidaciones).toHaveBeenCalledWith({ pagina: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(resultado);
    });
  });

  describe('obtenerLiquidacionPorId', () => {
    it('responde 200 con la liquidación encontrada', async () => {
      nominaService.obtenerLiquidacionOFallar.mockResolvedValue({ id: 1 });

      const res = crearRespuesta();
      await obtenerLiquidacionPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(nominaService.obtenerLiquidacionOFallar).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ liquidacion: { id: 1 } });
    });

    it('propaga el error si la liquidación no existe (404)', async () => {
      const error = new Error('no encontrado');
      nominaService.obtenerLiquidacionOFallar.mockRejectedValue(error);

      await expect(
        obtenerLiquidacionPorId(
          crearPeticion({ parametros: { id: 999 } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });
});

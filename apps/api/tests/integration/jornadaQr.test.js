const { supabase, conApiKey, conRol, conToken } = require('../utils/escenarioPanel');
const { generarHash } = require('../../src/utils/crypto.util');
const { fechaDeHoyEnBogota } = require('../../src/utils/fechaNegocio');

// El canje abre la jornada de HOY. Igual que jornadas.test.js, cada prueba
// libera la fecha de hoy (y cierra cualquier otra abierta) antes de empezar.
const liberarHoy = async () => {
  await supabase
    .from('jornadas')
    .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
    .eq('estado', 'abierta');
  const { data: deHoy } = await supabase
    .from('jornadas')
    .select('id')
    .eq('fecha', fechaDeHoyEnBogota())
    .maybeSingle();
  if (deHoy) {
    await supabase.from('tokens_jornada').update({ jornada_id: null }).eq('jornada_id', deHoy.id);
    await supabase.from('reaperturas_jornada').delete().eq('jornada_id', deHoy.id);
    await supabase.from('jornadas').delete().eq('id', deHoy.id);
  }
};

beforeEach(liberarHoy);

describe('/api/jornadas/qr', () => {
  it('exige token y rol', async () => {
    expect((await conApiKey('post', '/api/jornadas/qr')).status).toBe(401);
    expect((await conRol('pendiente', 'post', '/api/jornadas/qr')).status).toBe(403);
  });

  it('genera un QR de un solo uso que abre la jornada desde el móvil', async () => {
    const generado = await conToken('post', '/api/jornadas/qr');
    expect(generado.status).toBe(201);
    const { contenido, vigenciaSegundos } = generado.body.qr;
    expect(contenido).toMatch(/^corefaze-jornada:/);
    expect(vigenciaSegundos).toBe(30);

    // Solo se guarda el hash del token, nunca el token.
    const token = contenido.slice('corefaze-jornada:'.length);
    const { data } = await supabase
      .from('tokens_jornada')
      .select('id')
      .eq('token_hash', generarHash(token));
    expect(data).toHaveLength(1);

    const canje = await conRol('soporte', 'post', '/api/jornadas/qr/canje').send({ contenido });
    expect(canje.status).toBe(201);
    expect(canje.body.jornada).toMatchObject({ estado: 'abierta', fecha: fechaDeHoyEnBogota() });

    const otraVez = await conRol('soporte', 'post', '/api/jornadas/qr/canje').send({ contenido });
    expect(otraVez.status).toBe(409);
  });

  it('rechaza un QR vencido', async () => {
    const generado = await conToken('post', '/api/jornadas/qr');
    const { contenido } = generado.body.qr;
    const token = contenido.slice('corefaze-jornada:'.length);
    // expira_en debe ser posterior a creado_en (tokens_jornada_vigencia_check):
    // se deja en creado_en + 1 s y se espera a que pase.
    const { data: fila } = await supabase
      .from('tokens_jornada')
      .select('id, creado_en')
      .eq('token_hash', generarHash(token))
      .single();
    const { error } = await supabase
      .from('tokens_jornada')
      .update({ expira_en: new Date(new Date(fila.creado_en).getTime() + 1000).toISOString() })
      .eq('id', fila.id);
    expect(error).toBeNull();
    await new Promise((resolver) => {
      setTimeout(resolver, 1600);
    });

    const canje = await conToken('post', '/api/jornadas/qr/canje').send({ contenido });
    expect(canje.status).toBe(409);
    expect(canje.body.mensaje).toMatch(/venció o ya se usó/);
  });

  it('rechaza un contenido que no es un QR de jornada', async () => {
    expect((await conToken('post', '/api/jornadas/qr/canje').send({ contenido: 'x' })).status).toBe(
      400,
    );
  });
});

/**
 * Datos de DEMOSTRACIÓN, ficticios, para la exposición.
 *
 *   node --env-file=<archivo> scripts/seed-demo.js
 *
 * Variables: DEMO_API_URL (ej. http://localhost:3000/api), DEMO_API_KEY (la
 * API_KEY_WEB), DEMO_EMAIL y DEMO_PASSWORD (un superadmin), SUPABASE_URL y
 * SUPABASE_SERVICE_ROLE_KEY. Nunca se imprimen.
 *
 * - Clientes, vehículos, la jornada de hoy y sus órdenes entran por la API:
 *   el servidor aplica R1–R10 y calcula el valor.
 * - Las jornadas pasadas no se pueden abrir por la API (solo abre la del día),
 *   así que se insertan directo con el valor tomado de tarifas_servicio, la
 *   misma regla del servidor (R3/R4).
 * - Reutiliza el catálogo de servicios y los colaboradores existentes.
 * - Es idempotente: no duplica clientes (correo), vehículos (placa), jornadas
 *   (fecha) ni órdenes de hoy. Todo queda marcado: correos @corefaze.demo y
 *   observaciones que empiezan por [DEMO]. Para borrarlo: scripts/borrar-demo.sql.
 */
const { createClient } = require('@supabase/supabase-js');

const MARCA = '[DEMO]';
const ZONA = 'America/Bogota';
// Menos de 1.000 órdenes en total: hoy la API no pagina sus consultas y
// PostgREST corta en 1.000 filas (max_rows), lo que dañaría los totales.
const DIAS_HISTORIA = 30;
const CLIENTES = 150;
const EMPRESAS = 10;
const VEHICULOS = 220;
const MOTOS = 40;
const ORDENES_HOY = 32;

const requerida = (nombre) => {
  if (!process.env[nombre]) {
    throw new Error(`Falta la variable ${nombre}`);
  }
  return process.env[nombre];
};

// Generador pseudoaleatorio con semilla fija: cada ejecución produce los mismos datos.
function crearAzar(semilla) {
  let estado = semilla;
  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min, max) => min + Math.floor(siguiente() * (max - min + 1));
  const elegir = (lista) => lista[Math.floor(siguiente() * lista.length)];
  const ponderado = (pares) => {
    const total = pares.reduce((suma, [, peso]) => suma + peso, 0);
    let punto = siguiente() * total;
    for (const [valor, peso] of pares) {
      punto -= peso;
      if (punto <= 0) {
        return valor;
      }
    }
    return pares[pares.length - 1][0];
  };
  return { siguiente, entero, elegir, ponderado };
}

const NOMBRES = [
  'Andrés',
  'Camila',
  'Juan Pablo',
  'Valentina',
  'Santiago',
  'Daniela',
  'Sebastián',
  'Mariana',
  'Felipe',
  'Laura',
  'Mateo',
  'Paula',
  'Nicolás',
  'Juliana',
  'Alejandro',
  'Natalia',
  'Carlos',
  'Sara',
  'Diego',
  'Luisa',
  'Jorge',
  'Manuela',
  'Óscar',
  'Carolina',
  'Esteban',
  'Isabela',
  'Ricardo',
  'Gabriela',
  'Héctor',
  'Lina',
];
const APELLIDOS = [
  'Gómez',
  'Rodríguez',
  'Martínez',
  'López',
  'García',
  'Hernández',
  'Ramírez',
  'Torres',
  'Castro',
  'Vargas',
  'Rojas',
  'Moreno',
  'Jiménez',
  'Ospina',
  'Cardona',
  'Restrepo',
  'Quintero',
  'Salazar',
  'Arango',
  'Montoya',
  'Zapata',
  'Giraldo',
  'Mejía',
  'Patiño',
  'Valencia',
  'Muñoz',
  'Pineda',
  'Henao',
  'Duque',
  'Echeverri',
];
const EMPRESAS_NOMBRES = [
  'Transportes Cordillera Central S.A.S.',
  'Logística Valle de Aburrá S.A.S.',
  'Distribuidora Andina del Café S.A.S.',
  'Servicios Médicos La Colina S.A.S.',
  'Mensajería Express Antioquia S.A.S.',
  'Constructora Montaña Verde S.A.S.',
  'Inmobiliaria Río Medellín S.A.S.',
  'Seguridad Integral del Norte S.A.S.',
  'Alimentos La Pradera S.A.S.',
  'Rentacar Ciudad Jardín S.A.S.',
];
const MARCAS_CARRO = [
  ['Chevrolet', ['automovil', 'camioneta']],
  ['Renault', ['automovil', 'camioneta']],
  ['Mazda', ['automovil', 'camioneta']],
  ['Kia', ['automovil', 'camioneta']],
  ['Toyota', ['camioneta', 'platon_7_pasajeros']],
  ['Nissan', ['automovil', 'platon_7_pasajeros']],
  ['Hyundai', ['automovil', 'camioneta']],
  ['Ford', ['camioneta', 'platon_7_pasajeros']],
  ['Volkswagen', ['automovil']],
  ['Suzuki', ['automovil', 'camioneta']],
];
const MARCAS_MOTO = ['Yamaha', 'Honda', 'Suzuki', 'AKT', 'Bajaj', 'TVS', 'Kawasaki'];
const COLORES = ['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul', 'Plata', 'Beige', 'Vino tinto'];
const LETRAS = 'BCDFGHJKLMNPRSTVWXY';
const OBSERVACIONES = [
  'Sin novedades',
  'Rayón leve en puerta trasera',
  'Deja objetos en la guantera',
  'Rin delantero con golpe',
  'Cliente pide aromatizante',
  'Barro en los guardafangos',
  'Sin novedades',
  'Sin novedades',
];
const MOTIVOS = [
  'El cliente se retiró antes de iniciar',
  'El cliente cambió de servicio',
  'Error al registrar la placa',
];
const MEDIOS = [
  ['efectivo', 45],
  ['nequi', 20],
  ['daviplata', 8],
  ['bancolombia', 10],
  ['datafono', 17],
];

const hoyEnBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
const enBogota = (fecha, minutos) =>
  new Date(
    `${fecha}T${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}:00-05:00`,
  ).toISOString();

function crearApi(base, llave) {
  let token = null;
  const pedir = async (metodo, ruta, cuerpo) => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        'X-API-Key': llave,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(`${metodo} ${ruta} -> ${respuesta.status} ${datos.mensaje ?? ''}`);
    }
    return datos;
  };
  return {
    pedir,
    entrar: async (email, password) => {
      token = (await pedir('POST', '/auth/login', { email, password })).token;
      return (await pedir('GET', '/auth/perfil')).usuario;
    },
  };
}

function generarClientes(azar) {
  return Array.from({ length: CLIENTES }, (_, i) => {
    const esEmpresa = i < EMPRESAS;
    const nombre = esEmpresa
      ? EMPRESAS_NOMBRES[i]
      : `${azar.elegir(NOMBRES)} ${azar.elegir(APELLIDOS)} ${azar.elegir(APELLIDOS)}`;
    return {
      nombre,
      documento: esEmpresa ? String(901000000 + i * 7919) : String(1010000000 + i * 104729),
      tipo: esEmpresa ? 'empresa' : 'particular',
      telefono: String(3005550000 + i * 37),
      email: `${esEmpresa ? 'empresa' : 'cliente'}${String(i + 1).padStart(3, '0')}@corefaze.demo`,
      creditoHabilitado: esEmpresa,
    };
  });
}

function generarPlacas(azar, cantidad, esMoto, ocupadas) {
  const placas = [];
  while (placas.length < cantidad) {
    const letras = Array.from({ length: 3 }, () => azar.elegir(LETRAS)).join('');
    const placa = esMoto
      ? `${letras}${String(azar.entero(10, 99))}${azar.elegir(LETRAS)}`
      : `${letras}${String(azar.entero(100, 999))}`;
    if (!ocupadas.has(placa)) {
      ocupadas.add(placa);
      placas.push(placa);
    }
  }
  return placas;
}

async function asegurarClientes(api, azar) {
  const existentes = new Map(
    (await api.pedir('GET', '/clientes')).clientes.map((c) => [c.email, c]),
  );
  const resultado = [];
  for (const cliente of generarClientes(azar)) {
    resultado.push(
      existentes.get(cliente.email) ?? (await api.pedir('POST', '/clientes', cliente)).cliente,
    );
  }
  return resultado;
}

async function asegurarVehiculos(api, azar, clientes) {
  const actuales = (await api.pedir('GET', '/vehiculos')).vehiculos;
  const idsDemo = new Set(clientes.map((c) => c.id));
  const delDemo = actuales.filter((v) => idsDemo.has(v.clienteId));
  if (delDemo.length >= VEHICULOS) {
    return delDemo;
  }
  const ocupadas = new Set(actuales.map((v) => v.placa));
  const nuevos = [
    ...generarPlacas(azar, VEHICULOS - MOTOS, false, ocupadas).map((placa, i) => {
      const [marca, tipos] = azar.elegir(MARCAS_CARRO);
      // Las empresas tienen flota: reciben más vehículos.
      const cliente =
        i < 30 ? clientes[i % EMPRESAS] : clientes[EMPRESAS + ((i - 30) % (CLIENTES - EMPRESAS))];
      return {
        placa,
        tipoVehiculo: azar.elegir(tipos),
        marca,
        color: azar.elegir(COLORES),
        clienteId: cliente.id,
      };
    }),
    ...generarPlacas(azar, MOTOS, true, ocupadas).map((placa) => ({
      placa,
      tipoVehiculo: azar.ponderado([
        ['moto_hasta_150cc', 3],
        ['moto_desde_150cc', 1],
      ]),
      marca: azar.elegir(MARCAS_MOTO),
      color: azar.elegir(COLORES),
      clienteId: clientes[azar.entero(EMPRESAS, CLIENTES - 1)].id,
    })),
  ];
  const resultado = [...delDemo];
  for (const vehiculo of nuevos.slice(delDemo.length)) {
    resultado.push((await api.pedir('POST', '/vehiculos', vehiculo)).vehiculo);
  }
  return resultado;
}

/** Arma una orden válida para el dominio: servicio con tarifa para el tipo (R3), crédito solo de empresas (R8). */
function armarOrden(azar, { vehiculos, servicios, colaboradores, clientesPorId }) {
  const vehiculo = azar.elegir(vehiculos);
  const opciones = servicios.filter((s) =>
    s.tarifas.some((t) => t.tipoVehiculo === vehiculo.tipoVehiculo),
  );
  const servicio = azar.ponderado(
    opciones.map((s) => [
      s,
      s.categoria === 'tapiceria' ? 1 : s.numero <= 2 || s.numero >= 11 ? 12 : 4,
    ]),
  );
  const cliente = clientesPorId.get(vehiculo.clienteId);
  const credito = cliente?.creditoHabilitado && azar.siguiente() < 0.7;
  return {
    vehiculo,
    servicio,
    colaborador: azar.elegir(colaboradores),
    medioPago: credito ? 'credito' : azar.ponderado(MEDIOS),
    clienteId: credito ? cliente.id : null,
    autorizaMotor: servicio.numero >= 5 && servicio.numero <= 8,
    observaciones: `${MARCA} ${azar.elegir(OBSERVACIONES)}`,
  };
}

async function cargarHistoria(supabase, azar, contexto, usuarioId, hoy) {
  const { data: jornadas } = await supabase.from('jornadas').select('fecha');
  const conJornada = new Set(jornadas.map((j) => j.fecha));
  let creadas = 0;
  for (let dias = DIAS_HISTORIA; dias >= 1; dias -= 1) {
    const fecha = sumarDias(hoy, -dias);
    if (conJornada.has(fecha)) {
      continue;
    }
    const finDeSemana = [0, 6].includes(new Date(`${fecha}T12:00:00Z`).getUTCDay());
    const { data: jornada, error } = await supabase
      .from('jornadas')
      .insert({
        fecha,
        estado: 'cerrada',
        abierta_en: enBogota(fecha, 7 * 60),
        abierta_por: usuarioId,
        cerrada_en: enBogota(fecha, 18 * 60 + 30),
        cerrada_por: usuarioId,
      })
      .select('id')
      .single();
    if (error) {
      throw new Error(`jornada ${fecha}: ${error.message}`);
    }
    const cantidad = finDeSemana ? azar.entero(30, 40) : azar.entero(18, 30);
    const filas = Array.from({ length: cantidad }, (_, i) => {
      const orden = armarOrden(azar, contexto);
      const cancelada = azar.siguiente() < 0.05;
      const tarifa = orden.servicio.tarifas.find(
        (t) => t.tipoVehiculo === orden.vehiculo.tipoVehiculo,
      );
      return {
        jornada_id: jornada.id,
        fecha,
        turno: i + 1,
        vehiculo_id: orden.vehiculo.id,
        servicio_id: orden.servicio.id,
        colaborador_id: orden.colaborador.id,
        cliente_id: orden.clienteId,
        valor: tarifa.valor,
        medio_pago: orden.medioPago,
        autoriza_motor: orden.autorizaMotor,
        observaciones: orden.observaciones,
        motivo: cancelada ? azar.elegir(MOTIVOS) : null,
        estado: cancelada ? 'cancelada' : 'entregada',
        creado_en: enBogota(fecha, 7 * 60 + 30 + Math.floor((i * 600) / cantidad)),
      };
    });
    const { error: errorOrdenes } = await supabase.from('ordenes_lavado').insert(filas);
    if (errorOrdenes) {
      throw new Error(`órdenes ${fecha}: ${errorOrdenes.message}`);
    }
    creadas += 1;
  }
  return creadas;
}

async function cargarHoy(api, azar, contexto) {
  const jornadas = (await api.pedir('GET', '/jornadas')).jornadas;
  const hoy = hoyEnBogota();
  for (const abierta of jornadas.filter((j) => j.estado === 'abierta' && j.fecha !== hoy)) {
    await api.pedir('PATCH', `/jornadas/${abierta.id}/estado`, { estado: 'cerrada' });
  }
  let jornada = jornadas.find((j) => j.fecha === hoy);
  if (!jornada) {
    jornada = (await api.pedir('POST', '/jornadas')).jornada;
  }
  if (jornada.estado !== 'abierta') {
    return 0;
  }
  const { ordenes } = await api.pedir('GET', `/ordenes-lavado?jornadaId=${jornada.id}`);
  const ocupados = new Set(
    ordenes.filter((o) => !['entregada', 'cancelada'].includes(o.estado)).map((o) => o.vehiculoId),
  );
  let turno = ordenes.reduce((max, o) => Math.max(max, o.turno), 0);
  const faltan = ORDENES_HOY - ordenes.filter((o) => o.observaciones?.startsWith(MARCA)).length;
  for (let i = 0; i < faltan; i += 1) {
    const libres = {
      ...contexto,
      vehiculos: contexto.vehiculos.filter((v) => !ocupados.has(v.id)),
    };
    const orden = armarOrden(azar, libres);
    ocupados.add(orden.vehiculo.id);
    turno += 1;
    const creada = (
      await api.pedir('POST', '/ordenes-lavado', {
        turno,
        vehiculoId: orden.vehiculo.id,
        servicioId: orden.servicio.id,
        colaboradorId: orden.colaborador.id,
        medioPago: orden.medioPago,
        ...(orden.clienteId ? { clienteId: orden.clienteId } : {}),
        ...(orden.autorizaMotor ? { autorizaMotor: true } : {}),
        observaciones: orden.observaciones,
      })
    ).orden;
    // Reparto del tablero: registradas, en proceso y terminadas (solo transiciones permitidas).
    const pasos = azar.ponderado([
      [[], 35],
      [['en_proceso'], 35],
      [['en_proceso', 'terminada'], 30],
    ]);
    for (const estado of pasos) {
      await api.pedir('PATCH', `/ordenes-lavado/${creada.id}/estado`, { estado });
    }
  }
  return Math.max(faltan, 0);
}

async function main() {
  const api = crearApi(requerida('DEMO_API_URL'), requerida('DEMO_API_KEY'));
  const usuario = await api.entrar(requerida('DEMO_EMAIL'), requerida('DEMO_PASSWORD'));
  const supabase = createClient(requerida('SUPABASE_URL'), requerida('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
    global: { headers: { 'x-usuario-id': String(usuario.id) } },
  });
  const azar = crearAzar(20261118);

  const clientes = await asegurarClientes(api, azar);
  const vehiculos = await asegurarVehiculos(api, azar, clientes);
  const servicios = (await api.pedir('GET', '/servicios')).servicios.filter(
    (s) => s.activo && s.tarifas.length > 0,
  );
  const colaboradores = (await api.pedir('GET', '/colaboradores')).colaboradores.filter(
    (c) => c.estado === 'activo',
  );
  const contexto = {
    vehiculos,
    servicios,
    colaboradores,
    clientesPorId: new Map(clientes.map((c) => [c.id, c])),
  };

  const jornadasPasadas = await cargarHistoria(supabase, azar, contexto, usuario.id, hoyEnBogota());
  const ordenesHoy = await cargarHoy(api, azar, contexto);

  const conteos = {};
  for (const tabla of [
    'clientes',
    'vehiculos',
    'jornadas',
    'ordenes_lavado',
    'servicios',
    'colaboradores',
    'usuarios',
  ]) {
    const { count } = await supabase.from(tabla).select('*', { count: 'exact', head: true });
    conteos[tabla] = count;
  }
  const resumen = {
    clientesDemo: clientes.length,
    vehiculosDemo: vehiculos.length,
    jornadasPasadas,
    ordenesHoy,
    conteos,
  };
  process.stdout.write(`${JSON.stringify(resumen, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`No se completó la carga: ${error.message}\n`);
  process.exitCode = 1;
});

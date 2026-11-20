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
 * - Los módulos del panel entran por la API: caja de hoy (apertura, egresos y
 *   cobros, incluidos los pendientes de días anteriores), condiciones de
 *   crédito, vales y pagos de las empresas, insumos con sus movimientos y
 *   descuentos de la quincena.
 * - Las órdenes de hoy llevan la hora en que corre el script (creado_en no se
 *   modifica): conviene correrlo al empezar el día de la demostración.
 * - Es idempotente: no duplica clientes (correo), vehículos (placa), jornadas
 *   (fecha), órdenes de hoy, cobros de hoy, vales, pagos, insumos (nombre),
 *   descuentos ni cuentas de prueba (correo). Todo queda marcado: correos @corefaze.demo y observaciones que
 *   empiezan por [DEMO]. Para borrarlo: scripts/borrar-demo.sql.
 */
const { randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const MARCA = '[DEMO]';
const ZONA = 'America/Bogota';
// Menos de 1.000 órdenes en total: hoy la API no pagina sus consultas y
// PostgREST corta en 1.000 filas (max_rows), lo que dañaría los totales.
const DIAS_HISTORIA = 30;
const CLIENTES = 190;
const EMPRESAS = 14;
const VEHICULOS = 270;
const MOTOS = 50;
const ORDENES_HOY = 40;
// La primera tanda (150 clientes, 10 empresas) conserva sus correos: las
// empresas nuevas van al final para que el script siga siendo idempotente.
const CLIENTES_PRIMERA_TANDA = 150;
const EMPRESAS_PRIMERA_TANDA = 10;

/**
 * Los datos de demostración nunca entran a producción: el script se niega a
 * correr con ENTORNO=produccion o NODE_ENV=production, antes de leer
 * credenciales o tocar la red.
 */
function negarseEnProduccion() {
  if (process.env.ENTORNO === 'produccion' || process.env.NODE_ENV === 'production') {
    process.stderr.write(
      'seed-demo no corre en producción (ENTORNO=produccion o NODE_ENV=production): ' +
        'los datos de demostración solo van en desarrollo y pruebas.\n',
    );
    process.exit(1);
  }
}

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
  'Taxis Unidos del Sur S.A.S.',
  'Panificadora El Trigal S.A.S.',
  'Ferretería La Escuadra S.A.S.',
  'Viajes Horizonte Andino S.A.S.',
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
// Insumos del lavadero: nombre, categoría, unidad, mínimo y stock inicial.
// Los dos últimos quedan por debajo del mínimo para el aviso de stock bajo.
const INSUMOS = [
  ['Shampoo para carrocería', 'Químicos', 'galones', 4, 12],
  ['Cera líquida', 'Químicos', 'litros', 3, 9],
  ['Desengrasante para motor', 'Químicos', 'galones', 2, 6],
  ['Silicona para llantas', 'Químicos', 'litros', 3, 8],
  ['Limpiavidrios', 'Químicos', 'litros', 2, 7],
  ['Jabón para tapicería', 'Químicos', 'litros', 2, 5],
  ['Microfibras', 'Accesorios', 'unidades', 20, 64],
  ['Esponjas', 'Accesorios', 'unidades', 10, 30],
  ['Ambientadores', 'Accesorios', 'unidades', 15, 40],
  ['Bolsas de basura', 'Aseo', 'paquetes', 4, 10],
  ['Abrillantador de tablero', 'Químicos', 'litros', 3, 2],
  ['Guantes de nitrilo', 'Aseo', 'cajas', 3, 1],
  ['Toallas de algodón', 'Accesorios', 'unidades', 20, 26],
  ['Cepillos para rines', 'Accesorios', 'unidades', 4, 6],
  ['Aromatizante de cabina', 'Químicos', 'litros', 2, 5],
  ['Neutralizador de olores', 'Químicos', 'litros', 2, 1],
  ['Pulidor de faros', 'Químicos', 'frascos', 3, 2],
];
const DESCUENTOS = [
  ['prestamo', 80000, 'Préstamo personal'],
  ['jabon', 12000, 'Jabón para lavar la dotación'],
  ['multa', 20000, 'Llegada tarde'],
  ['prestamo', 50000, 'Adelanto de quincena'],
  ['jabon', 12000, 'Jabón para lavar la dotación'],
  ['multa', 15000, 'Daño en un accesorio del cliente'],
  ['prestamo', 40000, 'Préstamo para transporte'],
  ['jabon', 8000, 'Jabón de la semana'],
];
// Cuentas de prueba con una contraseña aleatoria que nadie conoce (no se
// guarda ni se imprime): llenan la pantalla de Usuarios, no sirven para entrar.
const USUARIOS_DEMO = [
  ['Laura Méndez (prueba)', 'solicitud.laura@corefaze.demo', null],
  ['Mateo Rincón (prueba)', 'solicitud.mateo@corefaze.demo', null],
  ['Sara Quintero (prueba)', 'solicitud.sara@corefaze.demo', null],
  ['Valeria Ortega (prueba)', 'operaciones.valeria@corefaze.demo', 'administrador'],
  ['Tomás Arango (prueba)', 'recepcion.tomas@corefaze.demo', 'soporte'],
];
const EGRESOS = [
  { categoria: 'almuerzos', concepto: 'Almuerzos del equipo', valor: 48000 },
  { categoria: 'insumos', concepto: 'Bolsas y microfibras', valor: 32000 },
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

const EMPRESAS_SEGUNDA_TANDA = EMPRESAS - EMPRESAS_PRIMERA_TANDA;

/** Posición del cliente i en EMPRESAS_NOMBRES, o -1 si es particular. */
const indiceDeEmpresa = (i) => {
  if (i < EMPRESAS_PRIMERA_TANDA) {
    return i;
  }
  const enSegunda = i - CLIENTES_PRIMERA_TANDA;
  return enSegunda >= 0 && enSegunda < EMPRESAS_SEGUNDA_TANDA
    ? EMPRESAS_PRIMERA_TANDA + enSegunda
    : -1;
};

function generarClientes(azar) {
  return Array.from({ length: CLIENTES }, (_, i) => {
    const esEmpresa = indiceDeEmpresa(i) >= 0;
    const nombre = esEmpresa
      ? EMPRESAS_NOMBRES[indiceDeEmpresa(i)]
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
  // Completa por separado los carros y las motos que falten.
  const esMoto = (v) => v.tipoVehiculo.startsWith('moto');
  const carrosActuales = delDemo.filter((v) => !esMoto(v)).length;
  const faltanCarros = Math.max(0, VEHICULOS - MOTOS - carrosActuales);
  const faltanMotos = Math.max(0, MOTOS - delDemo.filter(esMoto).length);
  if (faltanCarros === 0 && faltanMotos === 0) {
    return delDemo;
  }
  const empresas = clientes.filter((c) => c.tipo === 'empresa');
  const particulares = clientes.filter((c) => c.tipo === 'particular');
  const ocupadas = new Set(actuales.map((v) => v.placa));
  const nuevos = [
    ...generarPlacas(azar, faltanCarros, false, ocupadas).map((placa, i) => {
      const [marca, tipos] = azar.elegir(MARCAS_CARRO);
      // Las empresas tienen flota: los primeros 30 carros y uno de cada seis después.
      const n = carrosActuales + i;
      const cliente =
        n < 30 || n % 6 === 0
          ? empresas[n % empresas.length]
          : particulares[n % particulares.length];
      return {
        placa,
        tipoVehiculo: azar.elegir(tipos),
        marca,
        color: azar.elegir(COLORES),
        clienteId: cliente.id,
      };
    }),
    ...generarPlacas(azar, faltanMotos, true, ocupadas).map((placa) => ({
      placa,
      tipoVehiculo: azar.ponderado([
        ['moto_hasta_150cc', 3],
        ['moto_desde_150cc', 1],
      ]),
      marca: azar.elegir(MARCAS_MOTO),
      color: azar.elegir(COLORES),
      clienteId: particulares[azar.entero(0, particulares.length - 1)].id,
    })),
  ];
  const resultado = [...delDemo];
  for (const vehiculo of nuevos) {
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

/** Número de vale único con la sigla de la empresa: "TC-4821". */
function nuevoVale(azar, empresa, usados) {
  const sigla = empresa.nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase();
  let numero;
  do {
    numero = `${sigla}-${azar.entero(1000, 9999)}`;
  } while (usados.has(numero));
  usados.add(numero);
  return numero;
}

/** Solo una caja puede estar abierta: si quedó abierta la de un día anterior, se cierra cuadrada. */
async function cerrarCajaAnterior(api, hoy) {
  const estado = await api.pedir('GET', '/caja');
  if (estado.caja?.estado !== 'abierta' || estado.jornada?.fecha === hoy) {
    return false;
  }
  await api.pedir('POST', '/caja/cierre', { efectivoContado: estado.totales.efectivoEsperado });
  return true;
}

/** Ids de las órdenes [DEMO] entre las dadas: el seed nunca toca órdenes reales. */
async function soloDemo(supabase, ordenes) {
  if (ordenes.length === 0) {
    return new Set();
  }
  const { data, error } = await supabase
    .from('ordenes_lavado')
    .select('id')
    .in(
      'id',
      ordenes.map((o) => o.id),
    )
    .like('observaciones', `${MARCA}%`);
  if (error) {
    throw new Error(`órdenes demo: ${error.message}`);
  }
  return new Set(data.map((fila) => fila.id));
}

function cuerpoDeCobro(azar, orden, empresasPorId, usados) {
  const base = { ordenId: orden.id, medioPago: orden.medioPago };
  if (orden.medioPago === 'efectivo') {
    return { ...base, recibido: Math.ceil(orden.valor / 10000) * 10000 };
  }
  if (orden.medioPago === 'credito') {
    const empresa = empresasPorId.get(orden.clienteId);
    return { ...base, clienteId: orden.clienteId, numeroVale: nuevoVale(azar, empresa, usados) };
  }
  return base;
}

/**
 * Caja de la jornada de hoy por la API: apertura, egresos, lo que quedó en el
 * patio de días anteriores se termina y se cobra, y se cobra una parte de lo
 * terminado hoy (en efectivo con cambio, transferencias y crédito con vale).
 */
async function cargarCaja(api, supabase, azar, contexto, hoy, usados) {
  let estado = await api.pedir('GET', '/caja');
  if (estado.jornada?.fecha !== hoy || estado.jornada.estado !== 'abierta') {
    return { cobros: 0, egresos: 0 };
  }
  if (!estado.caja) {
    await api.pedir('POST', '/caja/apertura', { baseInicial: 150000 });
    estado = await api.pedir('GET', '/caja');
  }
  if (estado.caja.estado !== 'abierta') {
    return { cobros: 0, egresos: 0 };
  }

  const atrasadas = estado.enPatio.filter((o) => o.fecha < hoy);
  const demoAtrasadas = await soloDemo(supabase, atrasadas);
  for (const orden of atrasadas.filter((o) => demoAtrasadas.has(o.id))) {
    const pasos = orden.estado === 'registrada' ? ['en_proceso', 'terminada'] : ['terminada'];
    for (const paso of pasos) {
      await api.pedir('PATCH', `/ordenes-lavado/${orden.id}/estado`, { estado: paso });
    }
  }

  estado = await api.pedir('GET', '/caja');
  const demo = await soloDemo(supabase, estado.porCobrar);
  const deAntes = estado.porCobrar.filter((o) => o.fecha < hoy && demo.has(o.id));
  const deHoy =
    estado.cobros.length === 0
      ? estado.porCobrar.filter((o) => o.fecha === hoy && demo.has(o.id))
      : [];
  const porCobrar = [...deAntes, ...deHoy.slice(0, Math.ceil(deHoy.length * 0.6))];
  for (const orden of porCobrar) {
    await api.pedir(
      'POST',
      '/caja/cobros',
      cuerpoDeCobro(azar, orden, contexto.clientesPorId, usados),
    );
  }

  let egresos = 0;
  if (estado.egresos.length === 0) {
    for (const egreso of EGRESOS) {
      await api.pedir('POST', '/caja/egresos', egreso);
      egresos += 1;
    }
  }
  return { cobros: porCobrar.length, egresos };
}

/**
 * Crédito empresarial por la API: cupo, día de corte y contacto de cada
 * empresa; vales para los servicios a crédito ya entregados (casi todos),
 * verificados los de más de una semana; y pagos de lo verificado con más de
 * dos semanas en cuatro empresas.
 */
async function cargarCredito(api, azar, empresas, hoy, usados) {
  const resumen = { condiciones: 0, vales: 0, verificados: 0, pagos: 0 };
  const actuales = new Map(
    (await api.pedir('GET', '/credito/clientes')).clientes.map((c) => [c.id, c]),
  );
  for (const empresa of empresas) {
    if (actuales.get(empresa.id)?.cupoCredito) {
      continue;
    }
    await api.pedir('PATCH', `/credito/clientes/${empresa.id}/condiciones`, {
      cupoCredito: azar.entero(15, 50) * 100000,
      diaCorte: azar.elegir([5, 10, 15, 20, 25, 30]),
      contacto: `${azar.elegir(NOMBRES)} ${azar.elegir(APELLIDOS)} · Tesorería`,
    });
    resumen.condiciones += 1;
  }

  const pendientesPorEmpresa = new Map();
  for (const empresa of empresas) {
    const { ordenes } = await api.pedir(
      'GET',
      `/credito/clientes/${empresa.id}/ordenes?tipo=pendientes`,
    );
    ordenes.forEach((orden) => orden.vale && usados.add(orden.vale.numero));
    pendientesPorEmpresa.set(empresa.id, ordenes);
  }

  const haceUnaSemana = sumarDias(hoy, -7);
  const haceDosSemanas = sumarDias(hoy, -14);
  for (const [indice, empresa] of empresas.entries()) {
    const ordenes = pendientesPorEmpresa
      .get(empresa.id)
      .filter((o) => o.estado === 'entregada' && o.fecha < hoy);
    // Se decide por el id de la orden (no al azar) para que volver a correr no cambie nada:
    // 1 de cada 10 queda sin vale y 1 de cada 4 vales con más de una semana, sin verificar.
    for (const orden of ordenes) {
      if (!orden.vale && orden.id % 10 !== 0) {
        orden.vale = { numero: nuevoVale(azar, empresa, usados), verificadoEn: null };
        await api.pedir('POST', '/credito/vales', { ordenId: orden.id, numero: orden.vale.numero });
        resumen.vales += 1;
      }
      if (
        orden.vale &&
        !orden.vale.verificadoEn &&
        orden.fecha <= haceUnaSemana &&
        orden.id % 4 !== 0
      ) {
        await api.pedir('PATCH', `/credito/vales/${orden.id}`, { verificado: true });
        orden.vale.verificadoEn = hoy;
        resumen.verificados += 1;
      }
    }

    const { ordenes: pagadas } = await api.pedir(
      'GET',
      `/credito/clientes/${empresa.id}/ordenes?tipo=pagadas`,
    );
    const aPagar = ordenes
      .filter((o) => o.vale?.verificadoEn && o.fecha <= haceDosSemanas)
      .map((o) => o.id);
    if (indice < 4 && pagadas.length === 0 && aPagar.length > 0) {
      await api.pedir('POST', '/credito/pagos', {
        clienteId: empresa.id,
        ordenIds: aPagar,
        medio: azar.elegir(['transferencia', 'cheque']),
      });
      resumen.pagos += 1;
    }
  }
  return resumen;
}

/**
 * Insumos por la API. Cada uno entra con stock 0 y un movimiento inicial
 * marcado [DEMO] (así los encuentra borrar-demo.sql), más dos salidas de
 * consumo. Los que ya existen con el mismo nombre no se tocan.
 */
async function cargarInventario(api, azar) {
  const existentes = new Set(
    (await api.pedir('GET', '/inventario')).insumos.map((i) => i.nombre.toLocaleLowerCase('es-CO')),
  );
  let creados = 0;
  for (const [nombre, categoria, unidad, stockMinimo, stock] of INSUMOS) {
    if (existentes.has(nombre.toLocaleLowerCase('es-CO'))) {
      continue;
    }
    const { insumo } = await api.pedir('POST', '/inventario', {
      nombre,
      categoria,
      unidad,
      stockMinimo,
    });
    const consumo = Math.min(stock - 1, azar.entero(1, 3));
    await api.pedir('POST', `/inventario/${insumo.id}/movimientos`, {
      cantidad: stock + Math.max(consumo, 0),
      observacion: `${MARCA} Inventario inicial`,
    });
    if (consumo > 0) {
      await api.pedir('POST', `/inventario/${insumo.id}/movimientos`, {
        cantidad: -consumo,
        observacion: `${MARCA} Consumo del día`,
      });
    }
    creados += 1;
  }
  return creados;
}

/**
 * Cuentas de prueba por la API: solicitudes de acceso pendientes y algunas
 * cuentas activas con rol. Idempotente por correo.
 */
async function asegurarUsuarios(api) {
  const { usuarios } = await api.pedir('GET', '/usuarios?busqueda=corefaze.demo&porPagina=100');
  const existentes = new Set(usuarios.map((u) => u.email));
  let creados = 0;
  for (const [nombre, email, rol] of USUARIOS_DEMO) {
    if (existentes.has(email)) {
      continue;
    }
    const { usuario } = await api.pedir('POST', '/auth/registro', {
      nombre,
      email,
      password: randomBytes(18).toString('base64url'),
    });
    if (rol) {
      await api.pedir('PATCH', `/auth/usuarios/${usuario.id}/rol`, { rol });
    }
    creados += 1;
  }
  return creados;
}

/**
 * Descuentos de la quincena en curso por la API (solo los que falten de la
 * lista). Van a los
 * colaboradores con más neto disponible, y un préstamo nunca supera ese
 * neto: registrar_descuento() rechaza el que pase de la comisión acumulada.
 */
async function cargarNomina(api, supabase, hoy) {
  const { data: quincena, error } = await supabase.rpc('limites_quincena', { p_fecha: hoy });
  if (error) {
    throw new Error(`quincena: ${error.message}`);
  }
  const resumen = await api.pedir(
    'GET',
    `/nomina/quincenas/resumen?inicio=${quincena.inicio}&fin=${quincena.fin}`,
  );
  // Idempotente por cantidad: solo agrega los descuentos de la lista que falten.
  const yaCargados = resumen.descuentosDelPeriodo.filter((d) =>
    d.observacion?.startsWith(MARCA),
  ).length;
  if (yaCargados >= DESCUENTOS.length) {
    return 0;
  }
  const disponibles = [...resumen.colaboradores]
    .filter((c) => c.estado === 'activo')
    .sort((a, b) => b.neto - a.neto);
  if (disponibles.length === 0) {
    return 0;
  }
  let creados = 0;
  for (const [indice, [tipo, valor, detalle]] of DESCUENTOS.entries()) {
    if (indice < yaCargados) {
      continue;
    }
    const colaborador = disponibles[indice % disponibles.length];
    const monto =
      tipo === 'prestamo' ? Math.min(valor, Math.floor(colaborador.neto / 2 / 1000) * 1000) : valor;
    if (monto < 1000) {
      continue;
    }
    colaborador.neto -= monto;
    await api.pedir('POST', '/nomina/descuentos', {
      colaboradorId: colaborador.colaboradorId,
      tipo,
      valor: monto,
      fecha: hoy,
      observacion: `${MARCA} ${detalle}`,
    });
    creados += 1;
  }
  return creados;
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

  // --sin-hoy: completa crédito, inventario y nómina sin abrir la jornada ni la caja del día
  // (útil a deshoras: las órdenes de hoy quedarían todas a la hora en que corre el script).
  const sinHoy = process.argv.includes('--sin-hoy');
  const hoy = hoyEnBogota();
  const jornadasPasadas = await cargarHistoria(supabase, azar, contexto, usuario.id, hoy);
  const cajaAnteriorCerrada = sinHoy ? false : await cerrarCajaAnterior(api, hoy);
  const ordenesHoy = sinHoy ? 0 : await cargarHoy(api, azar, contexto);
  // Números de vale ya usados: crédito los recoge antes de que la caja cobre con vales nuevos.
  const valesUsados = new Set();
  const credito = await cargarCredito(
    api,
    azar,
    clientes.filter((c) => c.tipo === 'empresa'),
    hoy,
    valesUsados,
  );
  const caja = sinHoy
    ? { cobros: 0, egresos: 0 }
    : await cargarCaja(api, supabase, azar, contexto, hoy, valesUsados);
  const insumos = await cargarInventario(api, azar);
  const descuentos = await cargarNomina(api, supabase, hoy);
  const usuariosDemo = await asegurarUsuarios(api);

  const conteos = {};
  for (const tabla of [
    'clientes',
    'vehiculos',
    'jornadas',
    'ordenes_lavado',
    'servicios',
    'colaboradores',
    'usuarios',
    'cajas',
    'cobros_caja',
    'egresos_caja',
    'vales_credito',
    'pagos_credito',
    'insumos',
    'movimientos_inventario',
    'descuentos_colaborador',
  ]) {
    const { count } = await supabase.from(tabla).select('*', { count: 'exact', head: true });
    conteos[tabla] = count;
  }
  const resumen = {
    clientesDemo: clientes.length,
    vehiculosDemo: vehiculos.length,
    jornadasPasadas,
    cajaAnteriorCerrada,
    ordenesHoy,
    credito,
    caja,
    insumos,
    descuentos,
    usuariosDemo,
    conteos,
  };
  process.stdout.write(`${JSON.stringify(resumen, null, 2)}\n`);
}

negarseEnProduccion();
main().catch((error) => {
  process.stderr.write(`No se completó la carga: ${error.message}\n`);
  process.exitCode = 1;
});

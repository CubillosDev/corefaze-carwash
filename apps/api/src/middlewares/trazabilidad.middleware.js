const { randomUUID } = require('node:crypto');

/**
 * Un X-Request-Id que llega del cliente se respeta solo si es corto y sin
 * caracteres especiales: así se puede seguir una petición de punta a punta
 * sin dejar que un cliente inyecte texto arbitrario en cabeceras o registros.
 */
const ID_ACEPTABLE = /^[A-Za-z0-9_-]{8,64}$/;

const milisegundosDesde = (inicio) => Number(process.hrtime.bigint() - inicio) / 1e6;

/**
 * Patrón de la ruta que atendió la petición (`GET /api/clientes/:id`), nunca
 * la URL real. Si ninguna ruta la atendió (API Key rechazada, 404), se usa el
 * recurso: `GET /api/clientes (sin ruta)`.
 */
const nombreDeRuta = (req) => {
  if (req.route) {
    const ruta = req.route.path === '/' ? req.baseUrl : `${req.baseUrl}${req.route.path}`;
    return `${req.method} ${ruta}`;
  }
  const recurso = (req.originalUrl.split('?')[0].split('/').slice(0, 3).join('/') || '/').slice(0, 60);
  return `${req.method} ${recurso} (sin ruta)`;
};

/**
 * Traza cada petición:
 *   - X-Request-Id: identificador para seguirla (se genera si no llega uno válido).
 *   - X-Response-Time: lo que tardó la API en responder, en milisegundos.
 *   - Acumula el tiempo por ruta en el registro de trazabilidad.
 *
 * @param {{ registrar: (medicion: { ruta: string, estado: number, milisegundos: number }) => void }} registro
 */
const crearMiddlewareTrazabilidad = (registro) => (req, res, next) => {
  const inicio = process.hrtime.bigint();
  const recibido = req.get('X-Request-Id');
  const idPeticion = recibido && ID_ACEPTABLE.test(recibido) ? recibido : randomUUID();
  req.idPeticion = idPeticion;
  res.setHeader('X-Request-Id', idPeticion);

  // La ruta se anota en el instante en que Express la asigna (req.route): ahí
  // req.baseUrl todavía es el del router que la atiende. Si la petición termina
  // en el manejador de errores, Express ya restauró req.baseUrl y el nombre
  // saldría incompleto.
  let rutaAtendida = null;
  let rutaExpress;
  Object.defineProperty(req, 'route', {
    configurable: true,
    enumerable: true,
    get: () => rutaExpress,
    set: (valor) => {
      rutaExpress = valor;
      if (valor) rutaAtendida = nombreDeRuta(req);
    },
  });

  let ruta = null;
  const escribirCabeceras = res.writeHead;
  res.writeHead = function escribirConTiempo(...argumentos) {
    ruta = rutaAtendida ?? nombreDeRuta(req);
    res.setHeader('X-Response-Time', `${milisegundosDesde(inicio).toFixed(1)}ms`);
    return escribirCabeceras.apply(this, argumentos);
  };

  res.on('finish', () => {
    registro.registrar({
      ruta: ruta ?? rutaAtendida ?? nombreDeRuta(req),
      estado: res.statusCode,
      milisegundos: milisegundosDesde(inicio),
    });
  });

  next();
};

module.exports = { crearMiddlewareTrazabilidad, nombreDeRuta };

const LADO = 29;
const BUSCADORES = [
  [0, 0],
  [LADO - 7, 0],
  [0, LADO - 7],
];

function enBuscador(x, y, ox, oy) {
  const dx = x - ox;
  const dy = y - oy;
  if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
  return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
}

function encendido(x, y) {
  for (const [ox, oy] of BUSCADORES) {
    const modulo = enBuscador(x, y, ox, oy);
    if (modulo !== null) return modulo;
    if (x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7) return false;
  }
  if (x >= 11 && x <= 17 && y >= 11 && y <= 17) return false;
  if (y === 6) return x % 2 === 0;
  if (x === 6) return y % 2 === 0;
  const ruido = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return ruido - Math.floor(ruido) > 0.52;
}

/**
 * Trazo SVG (viewBox 0 0 29 29) de un código QR decorativo: tiene la forma
 * de un QR, con espacio para el ícono central, pero no codifica nada. La app
 * todavía no está publicada en las tiendas.
 *
 * @returns {string}
 */
export function trazoQrDecorativo() {
  const partes = [];
  for (let y = 0; y < LADO; y += 1) {
    for (let x = 0; x < LADO; x += 1) {
      if (encendido(x, y)) partes.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return partes.join('');
}

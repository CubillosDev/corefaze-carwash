import qrcode from 'qrcode-generator';

/**
 * Módulos de un código QR como un solo trazo SVG de cuadros de 1 × 1, listo
 * para un `<path>` con viewBox `0 0 tamano tamano`. Usa el nivel de
 * corrección H, como el diseño: el código se sigue leyendo con el ícono
 * encima.
 *
 * @param {string} texto
 * @returns {{ tamano: number, trazo: string }}
 */
export function trazoQr(texto) {
  const codigo = qrcode(0, 'H');
  codigo.addData(texto);
  codigo.make();

  const tamano = codigo.getModuleCount();
  const cuadros = [];
  for (let fila = 0; fila < tamano; fila += 1) {
    for (let columna = 0; columna < tamano; columna += 1) {
      if (codigo.isDark(fila, columna)) {
        cuadros.push(`M${columna} ${fila}h1v1h-1z`);
      }
    }
  }
  return { tamano, trazo: cuadros.join('') };
}

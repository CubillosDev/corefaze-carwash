/**
 * Número del comprobante de pago a partir del id del cobro: CP-000123. En la
 * vista previa, antes de cobrar, todavía no existe.
 *
 * @param {{ id: number|null }} cobro
 * @returns {string}
 */
export function numeroComprobante(cobro) {
  return cobro.id ? `CP-${String(cobro.id).padStart(6, '0')}` : 'Se asigna al cobrar';
}

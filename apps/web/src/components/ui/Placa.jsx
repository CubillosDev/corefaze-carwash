import { formatoPlaca } from '@/utils/formatoPlaca';

const TAMANOS = {
  normal: 'px-1.75 py-0.75 text-meta',
  pequeno: 'px-1.5 py-0.5 text-micro',
};

/**
 * Placa de un vehículo en JetBrains Mono, sobre gris, como en el diseño.
 *
 * @param {object} props
 * @param {string} props.placa Valor guardado (ABC123).
 * @param {'normal'|'pequeno'} [props.tamano]
 */
export function Placa({ placa, tamano = 'normal' }) {
  return (
    <span
      className={`inline-block rounded-placa bg-neutro-100 font-mono font-semibold tracking-placa whitespace-nowrap text-neutro-900 ${
        TAMANOS[tamano] ?? TAMANOS.normal
      }`}
    >
      {formatoPlaca(placa)}
    </span>
  );
}

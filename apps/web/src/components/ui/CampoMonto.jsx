import { CampoTexto } from '@/components/ui/CampoTexto';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { leerMonto } from '@/utils/efectivo';

/**
 * Campo de dinero en pesos: muestra el valor con formato ($ 28.000) mientras
 * se escribe y entrega un entero (o null si está vacío). Abre el teclado
 * numérico en el celular.
 *
 * @param {object} props
 * @param {string} props.etiqueta
 * @param {number|null} props.valor
 * @param {(valor: number|null) => void} props.alCambiar
 * @param {string} [props.ayuda]
 * @param {string} [props.error]
 * @param {boolean} [props.requerido]
 * @param {'normal'|'grande'} [props.tamano]
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 */
export function CampoMonto({ etiqueta, valor, alCambiar, placeholder = '$ 0', ...resto }) {
  return (
    <CampoTexto
      etiqueta={etiqueta}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={valor === null || valor === undefined ? '' : formatoMoneda(valor)}
      onChange={(evento) => alCambiar(leerMonto(evento.target.value))}
      {...resto}
    />
  );
}

const TONOS = {
  primario: 'bg-primario',
  advertencia: 'bg-advertencia-solido',
  exito: 'bg-exito-solido',
  error: 'bg-error',
  neutro: 'bg-neutro-500',
};

const TAMANOS = {
  pequeno: 'size-1.5',
  mediano: 'size-1.75',
  grande: 'size-2',
};

/**
 * Punto de color que acompaña un estado (columna del tablero, tarjeta, menú).
 * Es decorativo: el estado siempre se escribe al lado.
 *
 * @param {object} props
 * @param {'primario'|'advertencia'|'exito'|'error'|'neutro'} [props.tono]
 * @param {'pequeno'|'mediano'|'grande'} [props.tamano] 6, 7 y 8 px.
 */
export function Punto({ tono = 'neutro', tamano = 'mediano' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${TAMANOS[tamano] ?? TAMANOS.mediano} ${
        TONOS[tono] ?? TONOS.neutro
      }`}
    />
  );
}

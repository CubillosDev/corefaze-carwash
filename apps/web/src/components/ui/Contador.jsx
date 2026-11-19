const TONOS = {
  neutro: 'bg-neutro-325 text-neutro-650',
  suave: 'bg-neutro-100 text-neutro-700',
  primario: 'bg-primario-100 text-primario',
};

/**
 * Número dentro de una píldora pequeña: cantidad de una columna o de un grupo.
 *
 * @param {object} props
 * @param {number|string} props.children
 * @param {'neutro'|'suave'|'primario'} [props.tono]
 * @param {string} [props.etiqueta] Texto completo para lectores de pantalla ("3 órdenes").
 */
export function Contador({ children, tono = 'neutro', etiqueta }) {
  return (
    <span
      className={`inline-flex h-4.5 min-w-5 items-center justify-center rounded-full px-1.5 text-micro font-semibold tabular-nums ${
        TONOS[tono] ?? TONOS.neutro
      }`}
    >
      {etiqueta ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{etiqueta}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

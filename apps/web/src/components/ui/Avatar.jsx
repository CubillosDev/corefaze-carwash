import { iniciales } from '@/utils/iniciales';

const TAMANOS = {
  pequeno: 'size-5.5 text-avatar',
  compacto: 'size-6 text-avatar',
  mediano: 'size-7.5 text-micro font-bold',
  grande: 'size-13 text-titulo-cajon font-bold',
};

const TONOS = {
  primario: 'bg-primario-100 text-primario-800',
  neutro: 'bg-neutro-150 text-neutro-700',
};

/**
 * Círculo con las iniciales de una persona, o un texto corto tal cual (el
 * código de un colaborador). Es decorativo: el nombre se muestra al lado.
 *
 * @param {object} props
 * @param {string} props.nombre Nombre completo, o el texto que se muestra tal cual.
 * @param {boolean} [props.textoLiteral] Si es verdadero no calcula iniciales.
 * @param {'pequeno'|'compacto'|'mediano'|'grande'} [props.tamano] 22, 24, 30 y 52 px.
 * @param {'primario'|'neutro'} [props.tono]
 */
export function Avatar({ nombre, textoLiteral = false, tamano = 'mediano', tono = 'primario' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${
        TAMANOS[tamano] ?? TAMANOS.mediano
      } ${TONOS[tono] ?? TONOS.primario}`}
    >
      {textoLiteral ? nombre : iniciales(nombre)}
    </span>
  );
}

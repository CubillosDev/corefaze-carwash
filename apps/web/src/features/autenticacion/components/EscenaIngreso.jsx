import './EscenaIngreso.css';

/**
 * Las 14 capas de la C, de oscuro a claro (oklch L 0.28 -> 0.46), con la capa
 * superior en el azul de marca. Valores copiados de export/monolito.html: no
 * se calculan, para no arrastrar un redondeo distinto al del diseño.
 */
const COLORES_CAPA = [
  'oklch(0.280 0.15 262)',
  'oklch(0.295 0.15 262)',
  'oklch(0.311 0.15 262)',
  'oklch(0.326 0.15 262)',
  'oklch(0.342 0.15 262)',
  'oklch(0.357 0.15 262)',
  'oklch(0.372 0.15 262)',
  'oklch(0.388 0.15 262)',
  'oklch(0.403 0.15 262)',
  'oklch(0.418 0.15 262)',
  'oklch(0.434 0.15 262)',
  'oklch(0.449 0.15 262)',
  'oklch(0.465 0.15 262)',
  '#4d84ee',
];

const PASO_Z_CAPA = 4;

/**
 * Panel "Monolito" (export/monolito.html): la C del logo en 3D, hecha solo
 * con CSS, sobre una retícula de puntos con halo. Decorativa: el padre
 * (MarcoAcceso) la marca aria-hidden.
 */
export function EscenaIngreso() {
  return (
    <>
      <div className="cf-glow" />
      <div className="cf-scene">
        <div className="cf-plane">
          <div className="cf-floor" />
          {COLORES_CAPA.map((color, indice) => (
            <div
              key={color + indice}
              className="cf-layer"
              style={{ '--z': `${indice * PASO_Z_CAPA}px`, '--c': color }}
            >
              <i className="cf-top" />
              <i className="cf-left" />
              <i className="cf-bottom" />
            </div>
          ))}
          <div className="cf-cars">
            <div className="cf-car cf-car--amber" />
            <div className="cf-car cf-car--green" />
          </div>
        </div>
      </div>
    </>
  );
}

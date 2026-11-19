/** Rombo isométrico (proporción del logo) centrado en (x, y). */
function rombo(x, y, ancho) {
  const alto = ancho * 0.52;
  return `M${x} ${y - alto / 2} L${x + ancho / 2} ${y} L${x} ${y + alto / 2} L${x - ancho / 2} ${y} Z`;
}

/** Caras laterales de un rombo con grosor: le dan volumen. */
function canto(x, y, ancho, grosor) {
  const alto = ancho * 0.52;
  const izquierda = `M${x - ancho / 2} ${y} L${x} ${y + alto / 2} L${x} ${y + alto / 2 + grosor} L${x - ancho / 2} ${y + grosor} Z`;
  const derecha = `M${x} ${y + alto / 2} L${x + ancho / 2} ${y} L${x + ancho / 2} ${y + grosor} L${x} ${y + alto / 2 + grosor} Z`;
  return { izquierda, derecha };
}

const parada = (variable, opacidad = 1) => ({ stopColor: `var(${variable})`, stopOpacity: opacidad });

/**
 * Piezas sueltas alrededor del cubo, con los colores de los estados de una
 * orden: registrada, en proceso, terminada y entregada.
 */
const PIEZAS = [
  { x: 468, y: 150, ancho: 66, cara: 'fill-advertencia-solido', retraso: '0s' },
  { x: 104, y: 122, ancho: 58, cara: 'fill-primario-400', retraso: '-2.5s' },
  { x: 472, y: 372, ancho: 70, cara: 'fill-exito-solido', retraso: '-4s' },
  { x: 118, y: 418, ancho: 50, cara: 'fill-neutro-450', retraso: '-1.2s' },
];

/**
 * Escena de la pantalla de ingreso: el cubo isométrico de Corefaze en grande,
 * con volumen, sobre una retícula isométrica que se desvanece hacia los
 * bordes, un halo azul que respira y piezas que flotan con los colores de los
 * estados de una orden. Es decorativa: se oculta a los lectores de pantalla.
 * Con "reducir movimiento" activo, las animaciones se detienen (global.css).
 *
 * @param {{ className?: string }} props
 */
export function EscenaIngreso({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 560 520"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="escena-reticula" width="56" height="29" patternUnits="userSpaceOnUse">
          <path d="M0 14.5 L28 0 L56 14.5 L28 29 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </pattern>
        <radialGradient id="escena-desvanecer" cx="50%" cy="50%" r="55%">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="escena-mascara">
          <rect width="560" height="520" fill="url(#escena-desvanecer)" />
        </mask>
        <radialGradient id="escena-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" style={parada('--color-primario-500', 0.7)} />
          <stop offset="1" style={parada('--color-primario-500', 0)} />
        </radialGradient>
        <linearGradient id="escena-tapa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={parada('--color-primario-400')} />
          <stop offset="1" style={parada('--color-primario-500')} />
        </linearGradient>
        <linearGradient id="escena-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={parada('--color-primario-500')} />
          <stop offset="1" style={parada('--color-primario-800')} />
        </linearGradient>
        <linearGradient id="escena-lado" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={parada('--color-primario-600')} />
          <stop offset="1" style={parada('--color-primario-800')} />
        </linearGradient>
      </defs>

      <rect width="560" height="520" fill="url(#escena-reticula)" mask="url(#escena-mascara)" className="text-white/8" />

      <ellipse cx="300" cy="258" rx="250" ry="210" fill="url(#escena-halo)" className="animate-brillo" />

      <ellipse
        cx="300"
        cy="262"
        rx="236"
        ry="124"
        fill="none"
        stroke="currentColor"
        strokeDasharray="2 7"
        className="text-white/18"
      />

      <g className="animate-flotar">
        {/* Cara izquierda */}
        <path d="M161.2 209.2 L214 182 L214 334 L161.2 308.4 Z" fill="url(#escena-lado)" />
        {/* Rombo superior con su canto */}
        <path d={canto(316.4, 164.4, 166.4, 12).izquierda} className="fill-primario-600" />
        <path d={canto(316.4, 164.4, 166.4, 12).derecha} className="fill-primario-800" />
        <path d="M316.4 121.2 L399.6 164.4 L316.4 207.6 L233.2 164.4 Z" fill="url(#escena-tapa)" />
        {/* Rombo inferior con su canto */}
        <path d={canto(316.4, 343.6, 166.4, 12).izquierda} className="fill-primario-800" />
        <path d={canto(316.4, 343.6, 166.4, 12).derecha} className="fill-marco" />
        <path d="M316.4 300.4 L399.6 343.6 L316.4 386.8 L233.2 343.6 Z" fill="url(#escena-base)" />
        {/* Brillo sobre la tapa */}
        <path d="M316.4 128 L380 161 L316.4 168 L252.8 161 Z" className="fill-white/14" />
      </g>

      {PIEZAS.map((pieza) => {
        const lados = canto(pieza.x, pieza.y, pieza.ancho, 7);
        return (
          <g key={`${pieza.x}-${pieza.y}`} className="animate-flotar" style={{ animationDelay: pieza.retraso }}>
            <path d={lados.izquierda} className={`${pieza.cara} opacity-55`} />
            <path d={lados.derecha} className={`${pieza.cara} opacity-35`} />
            <path d={rombo(pieza.x, pieza.y, pieza.ancho)} className={pieza.cara} />
          </g>
        );
      })}

      {[
        [204, 108],
        [452, 252],
        [176, 452],
        [388, 470],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" className="fill-white/45" />
      ))}
    </svg>
  );
}

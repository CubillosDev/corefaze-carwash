/** Acordeón de preguntas frecuentes: una abierta a la vez (o ninguna). */
export function iniciarPreguntas() {
  const botones = [...document.querySelectorAll('[data-faq] .pregunta__boton')];

  const abrir = (elegido) =>
    botones.forEach((boton) => {
      const abierta = boton === elegido;
      boton.setAttribute('aria-expanded', String(abierta));
      document.getElementById(boton.getAttribute('aria-controls')).inert = !abierta;
    });

  botones.forEach((boton) =>
    boton.addEventListener('click', () => abrir(boton.getAttribute('aria-expanded') === 'true' ? null : boton)),
  );
}

import { enviarSolicitudDemo } from '@/api/solicitudDemo';
import { animar, CURVA } from '@/utils/movimiento';
import { CAMPOS_OBLIGATORIOS, camposInvalidos, primerNombre } from '@/utils/solicitudDemo';

const MENSAJE_INCOMPLETO = 'Completa los campos marcados para continuar.';
const MENSAJE_FALLO = 'No pudimos enviar tu solicitud. Inténtalo de nuevo.';

/**
 * Formulario "Agenda tu demo": valida, marca los campos que faltan (y los
 * vuelve a revisar mientras se corrigen) y muestra la confirmación.
 */
export function iniciarSolicitud() {
  const formulario = document.querySelector('[data-solicitud]');
  const error = document.querySelector('[data-solicitud-error]');
  const listo = document.querySelector('[data-solicitud-listo]');
  const saludo = document.querySelector('[data-solicitud-saludo]');
  const mensaje = document.querySelector('[data-solicitud-mensaje]');
  const enviar = formulario.querySelector('[type="submit"]');
  let intentado = false;

  const leer = () => Object.fromEntries(new FormData(formulario));

  const marcar = (invalidos) => {
    CAMPOS_OBLIGATORIOS.forEach((campo) => {
      formulario.elements[campo].setAttribute('aria-invalid', String(invalidos.includes(campo)));
    });
    error.textContent = invalidos.length ? MENSAJE_INCOMPLETO : '';
  };

  formulario.addEventListener('input', () => {
    if (intentado) marcar(camposInvalidos(leer()));
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const solicitud = leer();
    const invalidos = camposInvalidos(solicitud);
    intentado = true;
    marcar(invalidos);
    if (invalidos.length) {
      formulario.elements[invalidos[0]].focus();
      return;
    }

    enviar.disabled = true;
    try {
      await enviarSolicitudDemo(solicitud);
    } catch {
      error.textContent = MENSAJE_FALLO;
      return;
    } finally {
      enviar.disabled = false;
    }

    saludo.textContent = `¡Listo, ${primerNombre(solicitud.nombre)}!`;
    mensaje.textContent = `Te escribiremos al WhatsApp ${solicitud.whatsapp.trim()} para agendar la demo de ${solicitud.lavadero.trim()}.`;
    formulario.hidden = true;
    listo.hidden = false;
    listo.focus();
    animar(listo, [{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }], {
      duration: 450,
      easing: CURVA,
    });
  });

  document.querySelector('[data-solicitud-otra]').addEventListener('click', () => {
    formulario.reset();
    intentado = false;
    marcar([]);
    listo.hidden = true;
    formulario.hidden = false;
    formulario.elements.nombre.focus();
  });
}

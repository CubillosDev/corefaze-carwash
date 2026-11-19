import { enviarSolicitudDemo, hayDestinoDeSolicitudes } from '@/api/solicitudDemo';
import { CAMPOS_OBLIGATORIOS, camposInvalidos } from '@/utils/solicitudDemo';

const MENSAJE_INCOMPLETO = 'Completa los campos marcados para continuar.';
const MENSAJE_SIN_DESTINO = 'Formulario de demostración: aún no envía solicitudes.';
const MENSAJE_CORREO = 'Abrimos tu correo con la solicitud lista. Envíala para que te contactemos.';

/**
 * Formulario "Agenda tu demo": valida y marca los campos que faltan (y los
 * vuelve a revisar mientras se corrigen). Si hay correo de contacto, abre el
 * correo de la persona con la solicitud armada; si no, lo dice. Nunca muestra
 * una confirmación de algo que no se envió.
 */
export function iniciarSolicitud() {
  const formulario = document.querySelector('[data-solicitud]');
  const error = document.querySelector('[data-solicitud-error]');
  const aviso = document.querySelector('[data-solicitud-aviso]');
  let intentado = false;

  const leer = () => Object.fromEntries(new FormData(formulario));

  const marcar = (invalidos) => {
    CAMPOS_OBLIGATORIOS.forEach((campo) => {
      formulario.elements[campo].setAttribute('aria-invalid', String(invalidos.includes(campo)));
    });
    error.textContent = invalidos.length ? MENSAJE_INCOMPLETO : '';
  };

  formulario.addEventListener('input', () => {
    aviso.textContent = '';
    if (intentado) marcar(camposInvalidos(leer()));
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const solicitud = leer();
    const invalidos = camposInvalidos(solicitud);
    intentado = true;
    marcar(invalidos);
    aviso.textContent = '';
    if (invalidos.length) {
      formulario.elements[invalidos[0]].focus();
      return;
    }
    if (!hayDestinoDeSolicitudes()) {
      aviso.textContent = MENSAJE_SIN_DESTINO;
      return;
    }
    enviarSolicitudDemo(solicitud);
    aviso.textContent = MENSAJE_CORREO;
  });
}

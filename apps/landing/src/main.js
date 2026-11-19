import '@/styles/global.css';

import { iniciarFlujo } from '@/secciones/flujo';
import { iniciarHero } from '@/secciones/hero';
import { iniciarModulos } from '@/secciones/modulos';
import { iniciarNavegacion } from '@/secciones/navegacion';
import { iniciarPlanes } from '@/secciones/planes';
import { iniciarPreguntas } from '@/secciones/preguntas';
import { iniciarRevelado } from '@/secciones/revelar';
import { iniciarSolicitud } from '@/secciones/solicitud';
import { iniciarTema } from '@/secciones/tema';
import { trazoQrDecorativo } from '@/utils/codigoQrDecorativo';

iniciarTema();
iniciarNavegacion();
iniciarHero();
iniciarRevelado();
iniciarFlujo();
iniciarModulos();
iniciarPlanes();
iniciarPreguntas();
iniciarSolicitud();
document.querySelector('[data-qr]').setAttribute('d', trazoQrDecorativo());

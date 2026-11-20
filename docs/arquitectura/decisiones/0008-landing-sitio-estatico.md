# 0008 — La landing (`apps/landing`) es un sitio estático aparte del panel

**Estado:** Aceptado (decisión del 2026-11-19).

## Contexto

Corefaze necesita una landing comercial que presente el producto, sus planes y una forma de pedir una demo.
El diseño ("Landing Corefaze", en `docs/diseno/`) trae animaciones, tema claro y oscuro, y en el hero y en
"Módulos" incrusta la app del prototipo en iframes.

La landing es lo primero que carga una persona que no conoce el producto, a menudo desde el celular y con
datos móviles. Tiene que pesar poco y verse bien en buscadores. No usa la sesión, ni la API, ni nada del panel.

## Decisión

- **Sitio estático, sin framework.** HTML semántico con todo el contenido (se lee sin JavaScript y lo indexan
  los buscadores), CSS y módulos de JavaScript pequeños para las animaciones y la interacción. Se construye con
  Vite. No usa React: el panel lo necesita, la landing no.
- **Aparte del panel**, en su propio workspace (`apps/landing`), con su propio despliegue. Un cambio en el panel
  no la afecta, y viceversa.
- **Capturas reales en vez de los iframes del prototipo.** WebP del panel y de la app con datos de demostración
  ficticios, con `srcset` y carga diferida. Por eso se ajustaron dos textos del diseño ("Así se ve la aplicación
  real…" y "App de recepción · Android").
- **Animaciones baratas.** Los ciclos infinitos usan `@keyframes`. Las que dependen de un estado usan la Web
  Animations API. Todo se pausa fuera de pantalla y respeta `prefers-reduced-motion`.
- **Fuentes empaquetadas** (`@fontsource`, solo latín). Sin CDN ni Google Fonts.

Peso descargado (gzip): HTML ~11 KB, CSS ~12 KB y JS ~6 KB. La captura del hero pesa 56 KB (20 KB en celular).

## Consecuencias

- **Componente nuevo.** La landing no está en la lista de componentes del estándar del equipo, que vive fuera de
  este repositorio. Usa el alcance `landing` en los commits y su propio workflow de CI (`landing.yml`). Hay que
  agregarla al estándar.
- **Las capturas envejecen.** Si el diseño del panel cambia, hay que volver a tomarlas.
- **Promesas comerciales marcadas como "Próximamente".** Los textos se copiaron del diseño, pero estas funciones
  hoy no existen y llevan la insignia:
  - varias sedes (vista por sede, reporte por sede y dashboard multisede);
  - aviso al cliente por WhatsApp;
  - escáner de placa con autocompletado de los datos del vehículo (SOAT y RTM).
  Los medios de pago **no** se marcan: tarjeta (datáfono) y transferencia (Nequi, Daviplata y Bancolombia) ya
  existen en `mediosPago` del dominio. Los precios de los planes quedan como están en el diseño.
- **Formulario de demo sin confirmación falsa.** Si existe `VITE_CORREO_CONTACTO` (pública), abre el correo de la
  persona con la solicitud armada. Si no existe, avisa que es un formulario de demostración. El envío vive solo en
  `src/api/solicitudDemo.js`.

## Pendiente

- Definir el destino del formulario: endpoint, correo o WhatsApp del negocio.
- Enlaces de App Store y Google Play (la app no está publicada; el QR es decorativo).
- Destinos del pie: Novedades, Nosotros, Clientes, Trabaja con nosotros, Términos y privacidad.

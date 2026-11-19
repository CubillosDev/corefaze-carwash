# Corefaze · Landing comercial

La landing de Corefaze, hecha a partir del diseño "Landing Corefaze". Es un sitio estático: HTML semántico,
CSS y JavaScript moderno, sin framework. El contenido está en `index.html`, se lee sin JavaScript y lo
indexan los buscadores. El JavaScript solo agrega las animaciones y la interacción.

## Peso

Lo que descarga el navegador, comprimido con gzip:

| Recurso | Tamaño |
|---|---|
| HTML | ~11 KB |
| CSS | ~12 KB |
| JavaScript | ~6 KB |
| Captura del hero | 56 KB (20 KB en celular, `srcset`) |
| Fuentes (DM Sans y JetBrains Mono, solo latín) | ~85 KB |

- Las demás capturas cargan cuando hacen falta (`loading="lazy"`).
- Las fuentes vienen empaquetadas: no hay CDN ni Google Fonts.

## Animaciones

| Animación | Cómo se hace |
|---|---|
| Ciclos infinitos: marquesina, manchas del hero, líneas de escaneo y flotación de tarjetas | `@keyframes` de CSS |
| Animaciones con estado: palabra rotativa, teléfono del hero, pasos de "Cómo funciona", aparición al hacer scroll y cambio de tema | Web Animations API |

- El cambio de tema usa un revelado circular con View Transitions.
- Lo que no está en pantalla se pausa.
- Con `prefers-reduced-motion` no hay movimiento: el teléfono queda quieto y el navegador del hero sin inclinar.

## Estructura

```
index.html            todo el contenido
src/
  main.js             arranca cada sección
  secciones/          un módulo por sección: tema, navegación, hero, revelado, flujo,
                      módulos, planes, preguntas y solicitud
  api/                envío de la solicitud de demo (mailto: mientras no haya endpoint)
  constants/          textos de la sección Módulos
  utils/              funciones puras con pruebas (precio, solicitud y su mailto:, QR decorativo) y movimiento
  styles/             tokens.css (única fuente de colores y temas), base.css y una hoja por sección
  assets/images/      logos y capturas del panel real (WebP)
```

## Correr

```bash
npm run dev:landing       # http://localhost:5175
npm run build:landing
npm run preview:landing   # http://localhost:4175
npm run lint:landing
npm run test:landing
```

Variables públicas (quedan en el JavaScript del sitio; nunca secretos), ver `.env.example`:

| Variable | Para qué |
|---|---|
| `VITE_PANEL_URL` | Enlace "Iniciar sesión" al panel |
| `VITE_CORREO_CONTACTO` | Correo al que el formulario "Agenda tu demo" arma la solicitud (`mailto:`). Vacía: el formulario avisa que aún no envía solicitudes |

## Funciones marcadas como "Próximamente"

Los textos vienen del diseño. Lo que el producto todavía no tiene lleva la insignia "Próximamente":

- varias sedes;
- aviso al cliente por WhatsApp;
- escáner de placa con autocompletado (SOAT y RTM).

Tarjeta y transferencia no se marcan: ya existen en el dominio (`mediosPago`). Ver el ADR 0008.

## Pendiente

- Destino definitivo del formulario: endpoint, correo o WhatsApp del negocio. Hoy usa `mailto:` si existe `VITE_CORREO_CONTACTO`.
- Las insignias de App Store y Google Play no enlazan a ningún lado, y el QR es decorativo: la app no está publicada.
- Los enlaces del pie sin destino (Novedades, Nosotros, Clientes, Trabaja con nosotros, Términos) son texto.
- Las capturas se tomaron del panel y de la app con datos de demostración ficticios. Si el diseño del panel
  cambia, hay que repetirlas.

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
  api/                envío de la solicitud de demo (SIMULADO: aún no hay endpoint)
  constants/          textos de la sección Módulos
  utils/              funciones puras con pruebas (precio, validación, QR decorativo) y movimiento
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

`VITE_PANEL_URL` es la URL del panel para "Iniciar sesión". Es pública, no un secreto. Ver `.env.example`.

## Pendiente

- El formulario "Agenda tu demo" no envía nada todavía. Para conectarlo se cambia solo `src/api/solicitudDemo.js`.
- Las insignias de App Store y Google Play no enlazan a ningún lado, y el QR es decorativo: la app no está
  publicada.
- Los enlaces del pie sin destino (Novedades, Nosotros, Clientes, Trabaja con nosotros, Términos) son texto.
- Las capturas se tomaron del panel y de la app con datos de demostración ficticios. Si el diseño del panel
  cambia, hay que repetirlas.

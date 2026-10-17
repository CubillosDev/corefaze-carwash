# Panel web · Car Wash

Panel de gestión del lavadero, construido con **React + Vite en JavaScript**, **React Router** y
**Tailwind CSS v4**. Las pruebas corren con **Vitest + React Testing Library**.

## Puesta en marcha

```bash
# Desde la raíz del monorepo
npm install
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

La aplicación queda en <http://localhost:5173>.

### Variables de entorno

| Variable        | Para qué sirve                                                         |
| --------------- | ---------------------------------------------------------------------- |
| `VITE_API_URL`  | URL base de la API (`apps/api`), incluido el prefijo `/api`.           |
| `VITE_API_KEY`  | Encabezado `X-API-Key`: el valor de `API_KEY_ADMIN` de `apps/api/.env`. |

Solo se versiona `.env.example`. El archivo `.env` está en `.gitignore`. Toda variable `VITE_*`
queda dentro del JavaScript que descarga el navegador, así que es pública: nunca lleva secretos.

## Comandos

Se corren dentro de `apps/web`, o desde la raíz con el sufijo `:web`
(`npm run dev:web`, `npm run lint:web`, ...).

| Comando           | Qué hace                                       |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo en el puerto 5173.      |
| `npm run build`   | Compilación de producción en `dist/`.          |
| `npm run preview` | Sirve `dist/` en el puerto 4173.               |
| `npm run lint`    | ESLint sobre todo el proyecto.                 |
| `npm run test`    | Pruebas una sola vez.                          |
| `npm run test:watch` | Pruebas en modo observador.                 |

## Estructura

```
src/
├── app/          App.jsx, router.jsx (rutas), providers.jsx (contextos globales)
├── assets/       images/, fonts/
├── components/
│   ├── ui/       Componentes del sistema de diseño (Boton, CampoTexto, Tabla, Modal, Alerta)
│   │   └── iconos/   Un icono SVG por archivo
│   └── layout/   LayoutPrincipal, BarraLateral, Encabezado
├── features/     Una carpeta en kebab-case por recurso del negocio
│   └── <recurso>/   api/ components/ hooks/ pages/ validators/ index.js
├── hooks/        Hooks reutilizables
├── lib/          httpCliente.js: único punto que habla con la API
├── constants/    rutas.js y constantes del dominio
├── utils/        Formatos y ayudas puras
└── styles/       global.css con los tokens del sistema de diseño
```

## Sistema de diseño

Con la aplicación en desarrollo, <http://localhost:5173/sistema-diseno> muestra el catálogo
completo: paleta, tipografía, componentes y ejemplos de formato. Esa ruta **solo existe en
desarrollo**; en la compilación de producción desaparece del paquete.

### Tokens

Toda la paleta, la tipografía y las animaciones se definen con `@theme` en
[`src/styles/global.css`](src/styles/global.css). La paleta por defecto de Tailwind se borra a
propósito (`--color-*: initial`), de modo que `bg-blue-500` no existe: **en los componentes los
colores se usan siempre por nombre** (`bg-primario`, `text-acento`, `border-error-borde`) y nunca
con un hex suelto.

| Familia       | Base      | Para qué                                                        |
| ------------- | --------- | --------------------------------------------------------------- |
| `primario`    | `#0b1f4f` | Azul marino de la marca: barra lateral, botones primarios.      |
| `acento`      | `#d0202e` | Rojo: acciones destructivas y marcas de campo obligatorio.      |
| `resalte`     | `#f5b800` | Amarillo: solo como fondo y con texto oscuro encima.            |
| `neutro`      | `#6b7488` | Fondos, bordes y texto.                                         |
| Estado        | —         | `exito`, `advertencia`, `error`, `info`, cada uno con `-suave` y `-borde`. |

Cada familia de marca tiene su escala de `50` a `900`. La tipografía es Inter, cargada desde
`@fontsource-variable/inter` (sin CDN), con siete tamaños de `text-xs` a `text-3xl`.

### Layout

`LayoutPrincipal` arma barra lateral, encabezado y área de contenido (`<Outlet />`). Desde 1024 px
la barra lateral queda fija a la izquierda; por debajo se oculta y se abre como cajón desde el
botón de menú: atrapa el foco, se cierra con Escape, con el velo o al elegir una opción, y
devuelve el foco al botón que lo abrió.

Para agregar una sección al menú, se suma su entrada a `ENLACES` en
[`src/components/layout/BarraLateral.jsx`](src/components/layout/BarraLateral.jsx).

## Convenciones

- **Componentes** en PascalCase con extensión `.jsx`, uno por archivo. Las páginas terminan en
  `Page`. Los hooks se llaman `useAlgo.js` y las utilidades, camelCase `.js`.
- **Exportaciones con nombre**, no por defecto.
- **Pruebas** junto al archivo que prueban: `Nombre.test.jsx`.
- **Rutas del navegador** en kebab-case y en español, siempre desde `RUTAS`
  ([`src/constants/rutas.js`](src/constants/rutas.js)).
- **Todo el dominio y los textos de la interfaz en español**, con tildes. No se mezclan idiomas en
  un mismo nombre.
- **Importaciones con el alias `@/`**, nunca con `../../..`. ESLint lo verifica.
- **Ningún componente llama a `fetch`**: todo pasa por `httpCliente`. ESLint lo verifica.
- `dangerouslySetInnerHTML` está prohibido. ESLint lo verifica.
- Las props que vienen del DOM conservan su nombre (`type`, `disabled`, `onChange`); las propias
  del sistema de diseño van en español (`variante`, `tamano`, `cargando`, `etiqueta`, `alCerrar`).

React 19 ya no valida `propTypes` en tiempo de ejecución, así que las props se documentan con
JSDoc sobre cada componente.

## Formatos

El dinero viaja como **entero de pesos** por toda la aplicación y solo se convierte a texto al
mostrarlo. Las fechas se muestran siempre en la zona horaria de Bogotá.

```js
formatoMoneda(28000);                            // "$ 28.000"
formatoFecha('2026-08-03');                      // "03/08/2026"
formatoFechaHora('2026-08-03T14:30:00-05:00');   // "03/08/2026 2:30 p. m."
```

`formatoFecha` descompone las fechas ISO sin hora por partes en lugar de pasarlas por `new Date()`:
`new Date('2026-08-03')` es medianoche **UTC** y en Colombia (UTC−5) se vería como el 2 de agosto.

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

| Variable        | Para qué sirve                                                |
| --------------- | ------------------------------------------------------------- |
| `VITE_API_URL`  | URL base de la API (`apps/api`), incluido el prefijo `/api`.  |
| `VITE_API_KEY`  | Llave del cliente web; viaja en el encabezado `X-API-Key`.    |

Solo se versiona `.env.example`. El archivo `.env` está en `.gitignore`. Toda variable `VITE_*`
queda dentro del JavaScript que descarga el navegador, así que es **pública**: nunca lleva
secretos.

Sobre `VITE_API_KEY`:

- Es la llave del cliente web y **cualquiera puede verla** en el navegador. Identifica a la
  aplicación ante la API; no protege datos.
- En desarrollo local, cada persona copia en `VITE_API_KEY` el valor de `API_KEY_WEB` de **su
  propio** `apps/api/.env`, generada con `crypto` como explica
  [`apps/api/README.md`](../api/README.md). Esa llave no se comparte ni se sube al repositorio.
- La llave no es un control de acceso: los datos los protegen el JWT y los roles de la API.

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

### Reglas del sistema de diseño

1. **El catálogo es la guía.** Antes de construir algo, revisa `src/components/ui` y
   `/sistema-diseno`, y sigue este orden: **usar** lo que ya existe → **extenderlo** con una
   variante → **crear** un componente nuevo, solo si no queda otra.
2. **Todo lo nuevo aparece en el catálogo.** Cada componente, variante o token nuevo se agrega a
   `/sistema-diseno` en el mismo commit que lo crea.
3. **El diseño manda en lo visual; el dominio, en el negocio.** Del diseño aprobado se copian
   exactos los colores, medidas, tipografía, sombras, animaciones y la disposición. Los estados,
   medios de pago, tipos de vehículo, campos, validaciones y reglas salen de
   `packages/contratos/dominio.json` (vía `@/constants/dominio`) y de la API. Si el diseño
   contradice el dominio, esa parte no se implementa y se reporta.
4. **Los tokens viven solo en `src/styles/global.css`.** En los componentes no van hex, px sueltos
   ni sombras escritas a mano. Un valor puntual del diseño puede ir como clase arbitraria de
   Tailwind, justificada en el PR.

### Tokens

Los valores vienen del diseño aprobado (handoff en `docs/diseno/`, que es solo referencia y no
se importa). Colores, tipografía, radios, sombras, la curva de movimiento y el punto de quiebre
se definen con `@theme` en [`src/styles/global.css`](src/styles/global.css). Los valores por
defecto de Tailwind se borran a propósito (`--color-*: initial`, `--radius-*: initial`, ...),
así que `bg-blue-500` o `rounded-lg` no existen: **en los componentes los tokens se usan
siempre por nombre** (`bg-primario`, `rounded-control`, `shadow-modal`) y nunca con un valor
suelto.

| Grupo      | Tokens                                                              | Para qué                                     |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------- |
| Marco      | `marco` `#0e1730`, `velo`                                           | Cabecera, borde del panel y capa de modales. |
| Primario   | `primario` `#1268e8` y los tonos `50` `100` `200` `600` `800`          | Botones primarios, foco y selección.         |
| Resalte    | `resalte` `#f2c230`                                                 | Amarillo de placa, solo como fondo.          |
| Neutros    | `neutro-50` a `neutro-900`                                          | Superficies y bordes; texto en los oscuros.  |
| Estado     | `exito`, `advertencia`, `error`, `info` con `-solido` y `-suave`      | Texto, puntos e iconos, y fondo.             |
| Tipografía | `text-titulo`, `text-cuerpo`, `text-control`, `text-etiqueta`, ...    | Escala por rol; cada token trae su peso.     |
| Radios     | `rounded-control` (9 px), `rounded-tarjeta`, `rounded-panel`, ...     | Controles, tarjetas y panel.                 |
| Sombras    | `shadow-pildora`, `shadow-cajon`, `shadow-modal`, ...                 | Elevación de cada capa.                      |
| Movimiento | `ease-suave` y `animate-entrar-vista`, `animate-entrar-modal`, ...    | Una sola curva para todo.                    |
| Quiebre    | `escritorio:` (760 px)                                              | Por debajo, la barra lateral es un cajón.    |

La tipografía es DM Sans con eje de tamaño óptico (`@fontsource-variable/dm-sans/opsz.css`) y
JetBrains Mono 600 para placas y códigos (`@fontsource/jetbrains-mono`), sin CDN. El catálogo
`/sistema-diseno` muestra todos los tokens con su valor leído del tema en vivo.

### Layout

`LayoutPrincipal` arma el marco del diseño: la cabecera sobre el fondo `marco` (logo, divisor y
nombre) y un panel redondeado con la barra lateral y el área de contenido (`<Outlet />`). La
página no se desplaza: el scroll es del área de contenido, que vuelve arriba al cambiar de página
y anima la entrada de cada vista.

Desde el punto de quiebre `escritorio` (760 px) la barra lateral queda fija. Por debajo es un
cajón que se abre con el botón de menú de la cabecera: atrapa el foco, se cierra con Escape, con
el velo o al elegir una opción, y devuelve el foco al botón. Cerrado queda inerte, así que sus
enlaces no se alcanzan con el teclado.

Las opciones del menú salen de `MENU_PRINCIPAL` en [`src/constants/rutas.js`](src/constants/rutas.js).
Una sección se agrega ahí solo cuando su página ya está en el enrutador; una prueba lo verifica.
Cada página se carga en diferido (`React.lazy`) desde el `index.js` de su feature.

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
mostrarlo. Las fechas se muestran siempre en la zona horaria de Bogotá. Las placas se normalizan
(mayúsculas, sin espacios ni guiones) y se separan según los patrones de `dominio.json`.

```js
formatoMoneda(28000);                            // "$ 28.000"
formatoFecha('2026-08-03');                      // "03/08/2026"
formatoFechaHora('2026-08-03T14:30:00-05:00');   // "03/08/2026 2:30 p. m."
formatoPlaca('aaa-111');                         // "AAA 111"
```

`formatoFecha` descompone las fechas ISO sin hora por partes en lugar de pasarlas por `new Date()`:
`new Date('2026-08-03')` es medianoche **UTC** y en Colombia (UTC−5) se vería como el 2 de agosto.

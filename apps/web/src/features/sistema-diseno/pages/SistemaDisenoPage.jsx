import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { IconoMenu } from '@/components/ui/iconos/IconoMenu';
import { Modal } from '@/components/ui/Modal';
import { Tabla } from '@/components/ui/Tabla';
import { MenuPerfil } from '@/features/autenticacion';
import { MuestraDeColor } from '@/features/sistema-diseno/components/MuestraDeColor';
import { MuestraDeForma } from '@/features/sistema-diseno/components/MuestraDeForma';
import { SeccionDelCatalogo } from '@/features/sistema-diseno/components/SeccionDelCatalogo';
import { useValoresDeTokens } from '@/features/sistema-diseno/hooks/useValoresDeTokens';
import { formatoFecha, formatoFechaHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

const GRUPOS_DE_COLOR = [
  {
    nombre: 'Marco',
    nota: 'Fondo de la cabecera y del borde del panel, y velo detrás del cajón y de los modales.',
    tonos: [
      { token: 'marco', clase: 'bg-marco' },
      { token: 'velo', clase: 'bg-velo' },
    ],
  },
  {
    nombre: 'Primario · Electric Blue',
    nota: 'Botones primarios, foco y selección. Solo existen los tonos que usa el diseño.',
    tonos: [
      { token: 'primario-50', clase: 'bg-primario-50' },
      { token: 'primario-100', clase: 'bg-primario-100' },
      { token: 'primario-200', clase: 'bg-primario-200' },
      { token: 'primario-500', clase: 'bg-primario-500' },
      { token: 'primario-600', clase: 'bg-primario-600' },
      { token: 'primario-800', clase: 'bg-primario-800' },
    ],
  },
  {
    nombre: 'Resalte',
    nota: 'Amarillo de placa física. Solo como fondo y con texto oscuro encima.',
    tonos: [{ token: 'resalte', clase: 'bg-resalte' }],
  },
  {
    nombre: 'Neutros',
    nota: 'Superficies y bordes en los tonos claros; texto e iconos en los oscuros.',
    tonos: [
      { token: 'neutro-50', clase: 'bg-neutro-50' },
      { token: 'neutro-100', clase: 'bg-neutro-100' },
      { token: 'neutro-150', clase: 'bg-neutro-150' },
      { token: 'neutro-200', clase: 'bg-neutro-200' },
      { token: 'neutro-250', clase: 'bg-neutro-250' },
      { token: 'neutro-300', clase: 'bg-neutro-300' },
      { token: 'neutro-350', clase: 'bg-neutro-350' },
      { token: 'neutro-400', clase: 'bg-neutro-400' },
      { token: 'neutro-500', clase: 'bg-neutro-500' },
      { token: 'neutro-600', clase: 'bg-neutro-600' },
      { token: 'neutro-700', clase: 'bg-neutro-700' },
      { token: 'neutro-800', clase: 'bg-neutro-800' },
      { token: 'neutro-900', clase: 'bg-neutro-900' },
    ],
  },
  {
    nombre: 'Estado',
    nota: 'Cada estado trae su tono de texto, uno sólido para puntos e iconos y uno suave de fondo.',
    tonos: [
      { token: 'exito', clase: 'bg-exito' },
      { token: 'exito-solido', clase: 'bg-exito-solido' },
      { token: 'exito-suave', clase: 'bg-exito-suave' },
      { token: 'advertencia', clase: 'bg-advertencia' },
      { token: 'advertencia-solido', clase: 'bg-advertencia-solido' },
      { token: 'advertencia-suave', clase: 'bg-advertencia-suave' },
      { token: 'error', clase: 'bg-error' },
      { token: 'error-suave', clase: 'bg-error-suave' },
      { token: 'info', clase: 'bg-info' },
      { token: 'info-suave', clase: 'bg-info-suave' },
    ],
  },
];

const ESCALA_TIPOGRAFICA = [
  { clase: 'text-indicador', uso: 'Cifras de indicadores' },
  { clase: 'text-titulo', uso: 'Título de página' },
  { clase: 'text-total', uso: 'Totales' },
  { clase: 'text-titulo-modal', uso: 'Título de ventana modal' },
  { clase: 'text-marca', uso: 'Nombre de la aplicación en la cabecera' },
  { clase: 'text-titulo-tarjeta', uso: 'Título de tarjeta y de sección' },
  { clase: 'text-cuerpo', uso: 'Navegación y campos' },
  { clase: 'text-control', uso: 'Botones y filas de tabla' },
  { clase: 'text-detalle', uso: 'Subtítulos y chips' },
  { clase: 'text-meta', uso: 'Etiquetas de campo y datos secundarios' },
  { clase: 'text-micro', uso: 'Insignias y encabezados de tabla' },
  { clase: 'text-etiqueta uppercase', uso: 'Etiqueta de sección, siempre en mayúsculas' },
];

const RADIOS = [
  { clase: 'rounded-placa', uso: 'Placa' },
  { clase: 'rounded-opcion', uso: 'Opciones de menú y botón de cerrar' },
  { clase: 'rounded-control', uso: 'Botones, campos y píldora del menú' },
  { clase: 'rounded-tarjeta', uso: 'Tarjetas y tablas' },
  { clase: 'rounded-modal', uso: 'Modal; panel y cajón en móvil' },
  { clase: 'rounded-panel', uso: 'Panel principal y hoja inferior' },
];

const SOMBRAS = [
  { clase: 'shadow-pildora', uso: 'Píldora activa del menú' },
  { clase: 'shadow-barra-lateral', uso: 'Borde derecho de la barra lateral' },
  { clase: 'shadow-cajon', uso: 'Cajón de navegación abierto' },
  { clase: 'shadow-modal', uso: 'Ventana modal' },
];

const ANIMACIONES = [
  { variable: '--animate-aparecer', uso: 'Velo de los modales' },
  { variable: '--animate-aparecer-velo', uso: 'Velo del cajón de navegación' },
  { variable: '--animate-entrar-vista', uso: 'Entrada del contenido al cambiar de página' },
  { variable: '--animate-entrar-modal', uso: 'Entrada de la ventana modal' },
];

/** La utilidad de texto coincide con su variable: 'text-etiqueta uppercase' -> '--text-etiqueta'. */
const variableDeTexto = (clase) => `--${clase.split(' ')[0]}`;

/** Todas las variables que muestra el catálogo, en una referencia estable para el hook. */
const VARIABLES_DEL_CATALOGO = [
  ...GRUPOS_DE_COLOR.flatMap((grupo) => grupo.tonos.map((tono) => `--color-${tono.token}`)),
  ...ESCALA_TIPOGRAFICA.map((nivel) => variableDeTexto(nivel.clase)),
  '--ease-suave',
  ...ANIMACIONES.map((animacion) => animacion.variable),
];

const COLUMNAS_DE_SERVICIOS = [
  { clave: 'servicio', titulo: 'Servicio' },
  { clave: 'duracion', titulo: 'Duración', alineacion: 'centro' },
  {
    clave: 'precio',
    titulo: 'Precio',
    alineacion: 'derecha',
    render: (fila) => formatoMoneda(fila.precio),
  },
];

const SERVICIOS_DE_EJEMPLO = [
  { id: 1, servicio: 'Lavado general', duracion: '40 min', precio: 28000 },
  { id: 2, servicio: 'Lavado y encerado', duracion: '90 min', precio: 65000 },
  { id: 3, servicio: 'Aspirado interior', duracion: '25 min', precio: 18000 },
];

const COLUMNAS_DE_FORMATO = [
  { clave: 'llamada', titulo: 'Llamada' },
  { clave: 'resultado', titulo: 'Resultado' },
];

const EJEMPLOS_DE_FORMATO = [
  { id: 1, llamada: 'formatoMoneda(28000)', resultado: formatoMoneda(28000) },
  { id: 2, llamada: 'formatoMoneda(1234567)', resultado: formatoMoneda(1234567) },
  { id: 3, llamada: 'formatoMoneda(null)', resultado: formatoMoneda(null) },
  { id: 4, llamada: "formatoFecha('2026-08-03')", resultado: formatoFecha('2026-08-03') },
  {
    id: 5,
    llamada: "formatoFecha('2026-08-04T02:00:00Z')",
    resultado: formatoFecha('2026-08-04T02:00:00Z'),
  },
  {
    id: 6,
    llamada: "formatoFechaHora('2026-08-03T14:30:00-05:00')",
    resultado: formatoFechaHora('2026-08-03T14:30:00-05:00'),
  },
  { id: 7, llamada: "formatoPlaca('aaa-111')", resultado: formatoPlaca('aaa-111') },
  { id: 8, llamada: "formatoPlaca('BBB22B')", resultado: formatoPlaca('BBB22B') },
];

/**
 * Catálogo visual del sistema de diseño.
 *
 * Solo se publica en desarrollo (ver src/app/router.jsx). Sirve para revisar de
 * un vistazo los tokens y el comportamiento de los componentes base sin tener
 * que navegar por toda la aplicación. Todos los valores se leen del tema en
 * vivo, así que el catálogo no puede desincronizarse de global.css.
 */
export function SistemaDisenoPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alertaVisible, setAlertaVisible] = useState(true);
  const [placa, setPlaca] = useState('');
  const [repeticiones, setRepeticiones] = useState(0);
  const valores = useValoresDeTokens(VARIABLES_DEL_CATALOGO);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-titulo text-neutro-900">Sistema de diseño</h1>
        <p className="text-detalle text-neutro-600">
          Tokens, componentes base y formatos del panel de Car Wash. Los valores se leen del tema en
          vivo.
        </p>
      </header>

      <SeccionDelCatalogo
        titulo="Paleta"
        descripcion="Definida con @theme en src/styles/global.css. En los componentes se usa por nombre (bg-primario, text-error), nunca con un hex suelto."
      >
        <div className="flex flex-col gap-8">
          {GRUPOS_DE_COLOR.map((grupo) => (
            <div key={grupo.nombre} className="flex flex-col gap-3">
              <div>
                <h3 className="text-control font-semibold text-neutro-800">{grupo.nombre}</h3>
                <p className="mt-0.5 text-meta text-neutro-600">{grupo.nota}</p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
                {grupo.tonos.map((tono) => (
                  <MuestraDeColor
                    key={tono.token}
                    token={tono.token}
                    clase={tono.clase}
                    valor={valores[`--color-${tono.token}`]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Tipografía"
        descripcion="DM Sans con eje de tamaño óptico y JetBrains Mono 600, desde @fontsource. La escala va por rol: cada token ya trae su peso y su espaciado cuando el diseño los fija."
      >
        <ul className="flex flex-col gap-4">
          {ESCALA_TIPOGRAFICA.map((nivel) => (
            <li
              key={nivel.clase}
              className="flex flex-col gap-1 border-b border-neutro-150 pb-4 last:border-b-0 last:pb-0"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-meta text-neutro-700">{nivel.clase.split(' ')[0]}</span>
                <span className="font-mono text-micro text-neutro-500">
                  {valores[variableDeTexto(nivel.clase)] || '—'}
                </span>
                <span className="text-meta text-neutro-600">{nivel.uso}</span>
              </span>
              <span className={`text-neutro-900 ${nivel.clase}`}>Órdenes de lavado</span>
            </li>
          ))}
          <li className="flex flex-col gap-1">
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-meta text-neutro-700">font-mono</span>
              <span className="text-meta text-neutro-600">Placas y códigos de operador</span>
            </span>
            <span className="font-mono text-cuerpo font-semibold text-neutro-900">ABC123 · Op. 400</span>
          </li>
        </ul>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo titulo="Radios" descripcion="Los chips y los puntos usan rounded-full.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-5">
          {RADIOS.map((radio) => (
            <MuestraDeForma
              key={radio.clase}
              clase={radio.clase}
              nombre={radio.clase}
              uso={radio.uso}
              propiedad="borderRadius"
            />
          ))}
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo titulo="Sombras">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-6 bg-neutro-50 p-4">
          {SOMBRAS.map((sombra) => (
            <MuestraDeForma
              key={sombra.clase}
              clase={`rounded-tarjeta ${sombra.clase}`}
              nombre={sombra.clase}
              uso={sombra.uso}
              propiedad="boxShadow"
            />
          ))}
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Movimiento y punto de quiebre"
        descripcion="Una sola curva para todo el sistema. Por debajo del punto escritorio, la barra lateral pasa a ser un cajón."
      >
        <div className="flex flex-col gap-5">
          <dl className="grid gap-x-6 gap-y-3 text-meta escritorio:grid-cols-[auto_1fr]">
            <dt className="font-mono text-neutro-700">ease-suave</dt>
            <dd className="font-mono text-neutro-600">{valores['--ease-suave'] || '—'}</dd>
            {ANIMACIONES.map((animacion) => (
              <div key={animacion.variable} className="contents">
                <dt className="font-mono text-neutro-700">{animacion.variable.slice(2)}</dt>
                <dd className="text-neutro-600">
                  <span className="font-mono">{valores[animacion.variable] || '—'}</span> ·{' '}
                  {animacion.uso}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center gap-4">
            <Boton
              variante="secundario"
              tamano="pequeno"
              onClick={() => setRepeticiones((n) => n + 1)}
            >
              Repetir entrada de vista
            </Boton>
            <div
              key={repeticiones}
              className="animate-entrar-vista rounded-control bg-primario-50 px-4 py-2 text-control text-primario-800"
            >
              Contenido que entra
            </div>
          </div>

          <p className="rounded-control bg-neutro-100 px-4 py-3 text-control text-neutro-800">
            <span className="escritorio:hidden">
              Esta ventana está por debajo de escritorio: la barra lateral funciona como cajón.
            </span>
            <span className="max-escritorio:hidden">
              Esta ventana está en escritorio: la barra lateral queda fija.
            </span>
          </p>
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Botones"
        descripcion="Cinco variantes, tamaños de texto y de icono, y los estados cargando y deshabilitado."
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Boton variante="primario">Guardar orden</Boton>
            <Boton variante="secundario">Cancelar</Boton>
            <Boton variante="peligro">Anular orden</Boton>
            <Boton variante="fantasma">Ver detalle</Boton>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Boton tamano="pequeno">Pequeño</Boton>
            <Boton tamano="mediano">Mediano</Boton>
            <Boton tamano="grande">Grande</Boton>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Boton cargando>Guardando</Boton>
            <Boton variante="secundario" cargando>
              Guardando
            </Boton>
            <Boton disabled>Deshabilitado</Boton>
            <Boton variante="peligro" disabled>
              Deshabilitado
            </Boton>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-control bg-marco p-3">
            <Boton variante="marco" tamano="icono" aria-label="Ejemplo de botón de la cabecera">
              <IconoMenu />
            </Boton>
            <span className="text-detalle text-white/70">
              Variante marco en tamaño icono: botones de la cabecera.
            </span>
          </div>
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Campos de texto"
        descripcion="Etiqueta asociada por htmlFor, con ayuda y error anunciados por aria-describedby."
      >
        <div className="grid gap-5 escritorio:grid-cols-2">
          <CampoTexto
            etiqueta="Placa del vehículo"
            ayuda="Tres letras y tres números, sin guiones."
            placeholder="ABC123"
            requerido
            value={placa}
            onChange={(evento) => setPlaca(evento.target.value)}
          />
          <CampoTexto
            etiqueta="Correo del cliente"
            error="Escribe un correo válido."
            defaultValue="cliente@"
          />
          <CampoTexto etiqueta="Observaciones" placeholder="Opcional" />
          <CampoTexto etiqueta="Código interno" defaultValue="CW-0001" disabled />
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Alertas"
        descripcion="Los errores y advertencias se anuncian como alert; el éxito y la información, como status."
      >
        <div className="flex flex-col gap-3">
          <Alerta tipo="exito" titulo="Orden registrada">
            La orden quedó guardada y ya aparece en el listado del día.
          </Alerta>
          <Alerta tipo="advertencia" titulo="Faltan datos del cliente">
            El vehículo todavía no tiene un cliente asociado.
          </Alerta>
          <Alerta tipo="error" titulo="No pudimos guardar la orden">
            Revisa la conexión con el servidor e inténtalo de nuevo.
          </Alerta>
          {alertaVisible ? (
            <Alerta tipo="info" titulo="Se puede cerrar" alCerrar={() => setAlertaVisible(false)}>
              Cuando recibe la propiedad alCerrar, la alerta muestra su botón de cerrar.
            </Alerta>
          ) : (
            <Boton variante="secundario" tamano="pequeno" onClick={() => setAlertaVisible(true)}>
              Mostrar la alerta de nuevo
            </Boton>
          )}
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Tabla"
        descripcion="Recibe columnas y filas. En pantallas angostas se desplaza de lado dentro de su contenedor, y tiene estado vacío."
      >
        <div className="flex flex-col gap-6">
          <Tabla
            columnas={COLUMNAS_DE_SERVICIOS}
            filas={SERVICIOS_DE_EJEMPLO}
            descripcion="Servicios de ejemplo con duración y precio"
          />
          <Tabla
            columnas={COLUMNAS_DE_SERVICIOS}
            filas={[]}
            descripcion="Tabla de servicios sin resultados"
            mensajeVacio="No hay servicios que coincidan con la búsqueda."
          />
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Modal"
        descripcion="Se dibuja en un portal, atrapa el foco, se cierra con Escape o con un clic por fuera y devuelve el foco al botón que la abrió."
      >
        <Boton onClick={() => setModalAbierto(true)}>Abrir la ventana</Boton>

        <Modal
          abierto={modalAbierto}
          alCerrar={() => setModalAbierto(false)}
          titulo="Anular la orden ABC123"
          pie={
            <>
              <Boton variante="secundario" onClick={() => setModalAbierto(false)}>
                Volver
              </Boton>
              <Boton variante="peligro" onClick={() => setModalAbierto(false)}>
                Anular
              </Boton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p>
              Esta acción no se puede deshacer. La orden quedará marcada como anulada y no sumará a
              los ingresos del día.
            </p>
            <CampoTexto etiqueta="Motivo de la anulación" placeholder="Escribe el motivo" />
          </div>
        </Modal>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Formatos"
        descripcion="La moneda, las fechas y las placas se formatean en un solo lugar; las fechas, siempre en la zona horaria de Bogotá."
      >
        <Tabla
          columnas={COLUMNAS_DE_FORMATO}
          filas={EJEMPLOS_DE_FORMATO}
          descripcion="Ejemplos de las funciones de formato con su resultado"
        />
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Menú de perfil"
        descripcion="Va en la cabecera, sobre el marco oscuro: el botón con las iniciales abre un panel con el nombre, el correo, el rol y «Cerrar sesión». Se cierra con Escape o al hacer clic por fuera. Aquí usa la sesión actual."
      >
        <div className="flex h-24 items-start justify-end rounded-tarjeta bg-marco p-3">
          <MenuPerfil />
        </div>
      </SeccionDelCatalogo>
    </div>
  );
}

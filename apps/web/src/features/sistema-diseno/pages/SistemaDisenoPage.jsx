import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { Tabla } from '@/components/ui/Tabla';
import { MuestraDeColor } from '@/features/sistema-diseno/components/MuestraDeColor';
import { SeccionDelCatalogo } from '@/features/sistema-diseno/components/SeccionDelCatalogo';
import { useValoresDeColor } from '@/features/sistema-diseno/hooks/useValoresDeColor';
import { formatoFecha, formatoFechaHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';

const GRUPOS_DE_COLOR = [
  {
    nombre: 'Primario · azul marino',
    nota: 'Color principal de la marca: barra lateral, botones primarios y cifras destacadas.',
    tonos: [
      { token: 'primario-50', clase: 'bg-primario-50' },
      { token: 'primario-100', clase: 'bg-primario-100' },
      { token: 'primario-200', clase: 'bg-primario-200' },
      { token: 'primario-300', clase: 'bg-primario-300' },
      { token: 'primario-400', clase: 'bg-primario-400' },
      { token: 'primario-500', clase: 'bg-primario-500' },
      { token: 'primario-600', clase: 'bg-primario-600' },
      { token: 'primario-700', clase: 'bg-primario-700' },
      { token: 'primario-800', clase: 'bg-primario-800' },
      { token: 'primario-900', clase: 'bg-primario-900' },
    ],
  },
  {
    nombre: 'Acento · rojo',
    nota: 'Acciones destructivas y marcas de campo obligatorio. Llama mucho la atención: se usa con medida.',
    tonos: [
      { token: 'acento-50', clase: 'bg-acento-50' },
      { token: 'acento-100', clase: 'bg-acento-100' },
      { token: 'acento-200', clase: 'bg-acento-200' },
      { token: 'acento-300', clase: 'bg-acento-300' },
      { token: 'acento-400', clase: 'bg-acento-400' },
      { token: 'acento-500', clase: 'bg-acento-500' },
      { token: 'acento-600', clase: 'bg-acento-600' },
      { token: 'acento-700', clase: 'bg-acento-700' },
      { token: 'acento-800', clase: 'bg-acento-800' },
    ],
  },
  {
    nombre: 'Resalte · amarillo',
    nota: 'Solo como fondo y siempre con texto oscuro encima: sobre blanco no alcanza el contraste mínimo.',
    tonos: [
      { token: 'resalte-50', clase: 'bg-resalte-50' },
      { token: 'resalte-100', clase: 'bg-resalte-100' },
      { token: 'resalte-200', clase: 'bg-resalte-200' },
      { token: 'resalte-300', clase: 'bg-resalte-300' },
      { token: 'resalte-400', clase: 'bg-resalte-400' },
      { token: 'resalte-500', clase: 'bg-resalte-500' },
      { token: 'resalte-600', clase: 'bg-resalte-600' },
      { token: 'resalte-700', clase: 'bg-resalte-700' },
    ],
  },
  {
    nombre: 'Neutros',
    nota: 'Fondos, bordes y texto. El cuerpo del panel vive casi por completo en esta escala.',
    tonos: [
      { token: 'neutro-50', clase: 'bg-neutro-50' },
      { token: 'neutro-100', clase: 'bg-neutro-100' },
      { token: 'neutro-200', clase: 'bg-neutro-200' },
      { token: 'neutro-300', clase: 'bg-neutro-300' },
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
    nota: 'Alertas y validaciones. Cada estado trae su tono fuerte, uno suave de fondo y uno de borde.',
    tonos: [
      { token: 'exito', clase: 'bg-exito' },
      { token: 'exito-suave', clase: 'bg-exito-suave' },
      { token: 'exito-borde', clase: 'bg-exito-borde' },
      { token: 'advertencia', clase: 'bg-advertencia' },
      { token: 'advertencia-suave', clase: 'bg-advertencia-suave' },
      { token: 'advertencia-borde', clase: 'bg-advertencia-borde' },
      { token: 'error', clase: 'bg-error' },
      { token: 'error-suave', clase: 'bg-error-suave' },
      { token: 'error-borde', clase: 'bg-error-borde' },
      { token: 'info', clase: 'bg-info' },
      { token: 'info-suave', clase: 'bg-info-suave' },
      { token: 'info-borde', clase: 'bg-info-borde' },
    ],
  },
];

/** Todos los tokens del catálogo, en una referencia estable para el hook. */
const TOKENS_DE_COLOR = GRUPOS_DE_COLOR.flatMap((grupo) => grupo.tonos.map((tono) => tono.token));

const ESCALA_TIPOGRAFICA = [
  { token: 'text-3xl', clase: 'text-3xl', uso: 'Cifra o título de portada' },
  { token: 'text-2xl', clase: 'text-2xl', uso: 'Título de página' },
  { token: 'text-xl', clase: 'text-xl', uso: 'Título de sección' },
  { token: 'text-lg', clase: 'text-lg', uso: 'Subtítulo' },
  { token: 'text-base', clase: 'text-base', uso: 'Texto corrido' },
  { token: 'text-sm', clase: 'text-sm', uso: 'Texto de interfaz y tablas' },
  { token: 'text-xs', clase: 'text-xs', uso: 'Ayudas y etiquetas' },
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
];

/**
 * Catálogo visual del sistema de diseño.
 *
 * Solo se publica en desarrollo (ver src/app/router.jsx). Sirve para revisar de
 * un vistazo la paleta, la tipografía y el comportamiento de los componentes
 * base sin tener que navegar por toda la aplicación.
 */
export function SistemaDisenoPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alertaVisible, setAlertaVisible] = useState(true);
  const [placa, setPlaca] = useState('');
  const valoresDeColor = useValoresDeColor(TOKENS_DE_COLOR);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutro-900">Sistema de diseño</h1>
        <p className="text-sm text-neutro-600">
          Paleta, tipografía, componentes base y formatos del panel de Car Wash. Los valores de
          color se leen del tema en vivo.
        </p>
      </header>

      <SeccionDelCatalogo
        titulo="Paleta"
        descripcion="Definida con @theme en src/styles/global.css. En los componentes se usa por nombre (bg-primario, text-acento), nunca con un hex suelto."
      >
        <div className="flex flex-col gap-8">
          {GRUPOS_DE_COLOR.map((grupo) => (
            <div key={grupo.nombre} className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutro-800">{grupo.nombre}</h3>
                <p className="mt-0.5 text-xs text-neutro-500">{grupo.nota}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {grupo.tonos.map((tono) => (
                  <MuestraDeColor
                    key={tono.token}
                    token={tono.token}
                    clase={tono.clase}
                    valor={valoresDeColor[tono.token]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Tipografía"
        descripcion="Inter, cargada desde @fontsource-variable/inter. Siete tamaños, cada uno con su interlineado."
      >
        <ul className="flex flex-col gap-4">
          {ESCALA_TIPOGRAFICA.map((nivel) => (
            <li
              key={nivel.token}
              className="flex flex-col gap-1 border-b border-neutro-100 pb-4 last:border-b-0 last:pb-0"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-neutro-500">{nivel.token}</span>
                <span className="text-xs text-neutro-400">{nivel.uso}</span>
              </span>
              <span className={`font-medium text-neutro-900 ${nivel.clase}`}>
                Órdenes de lavado
              </span>
            </li>
          ))}
        </ul>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Botones"
        descripcion="Cuatro variantes, tres tamaños y los estados cargando y deshabilitado."
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
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Campos de texto"
        descripcion="Etiqueta asociada por htmlFor, con ayuda y error anunciados por aria-describedby."
      >
        <div className="grid gap-5 sm:grid-cols-2">
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
        descripcion="La moneda y las fechas se formatean en un solo lugar, siempre en la zona horaria de Bogotá."
      >
        <Tabla
          columnas={COLUMNAS_DE_FORMATO}
          filas={EJEMPLOS_DE_FORMATO}
          descripcion="Ejemplos de las funciones de formato con su resultado"
        />
      </SeccionDelCatalogo>
    </div>
  );
}

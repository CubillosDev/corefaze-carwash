import ilustracionAdministrador from '@/assets/images/ilustracion-administrador.svg';
import { Boton } from '@/components/ui/Boton';
import { Dato } from '@/components/ui/Dato';
import { IconoJornadas } from '@/components/ui/iconos/IconoJornadas';
import { Insignia } from '@/components/ui/Insignia';
import { ESTADOS_JORNADA } from '@/constants/dominio';
import { QrJornada } from '@/features/jornadas/components/QrJornada';
import { useQrJornada } from '@/features/jornadas/hooks/useQrJornada';
import { formatoFecha, formatoHora } from '@/utils/formatoFecha';
import { saludoSegunHora } from '@/utils/saludo';

/** Circunferencia del anillo (r = 52 en un lienzo de 112). */
const CIRCUNFERENCIA = 326.7;

/**
 * Panel "Jornada" del tablero: saluda a la persona y dice si hay jornada
 * abierta. Cerrada, muestra el QR para abrirla desde la app móvil (se renueva
 * cada 30 s y el anillo del avatar lleva la cuenta) y la opción de abrirla
 * desde aquí; abierta, sus datos y el botón para cerrarla.
 *
 * @param {object} props
 * @param {object|null} props.jornada La jornada abierta, si la hay.
 * @param {string} props.nombre Nombre de quien inició sesión.
 * @param {boolean} props.puedeGestionar
 * @param {boolean} props.enviando
 * @param {() => void} props.alAbrir
 * @param {() => void} props.alCerrar
 * @param {() => void} props.alAbrirseDesdeElCelular Estable (useCallback): la app
 *   móvil abrió la jornada con el QR.
 * @param {Date} [props.ahora] Para el saludo; se puede fijar en pruebas.
 */
export function PanelJornada({
  jornada,
  nombre,
  puedeGestionar,
  enviando,
  alAbrir,
  alCerrar,
  alAbrirseDesdeElCelular,
  ahora = new Date(),
}) {
  const abierta = jornada?.estado === ESTADOS_JORNADA.ABIERTA;
  const primerNombre = String(nombre ?? '').trim().split(/\s+/)[0];
  const codigo = useQrJornada({ activo: !abierta && puedeGestionar, alDetectarApertura: alAbrirseDesdeElCelular });
  const vigencia = codigo.qr?.vigenciaSegundos ?? 0;
  const cuentaRegresiva = !abierta && vigencia > 0;
  const desplazamiento = abierta ? 0 : cuentaRegresiva ? CIRCUNFERENCIA * (1 - codigo.segundos / vigencia) : CIRCUNFERENCIA;

  return (
    <aside
      aria-label="Jornada"
      className="flex w-full min-w-0 shrink-0 flex-col items-center rounded-tarjeta border border-neutro-200 bg-white px-4.5 pt-3.5 pb-4 text-center escritorio:w-66 escritorio:justify-center amplio:w-75 ajustado:overflow-y-auto"
    >
      <div className="flex shrink-0 items-center justify-between self-stretch">
        <h2 className="text-titulo-tarjeta">Jornada</h2>
        <Insignia tono={abierta ? 'exito' : 'neutro'}>{abierta ? 'Abierta' : 'Cerrada'}</Insignia>
      </div>

      <div className="relative mt-1 size-22 shrink-0">
        <svg viewBox="0 0 112 112" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="56" cy="56" r="52" fill="none" strokeWidth="3" className="stroke-neutro-150" />
          <circle
            cx="56"
            cy="56"
            r="52"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={desplazamiento.toFixed(1)}
            className={`transition-[stroke-dashoffset,stroke] ${cuentaRegresiva ? 'duration-1000 ease-linear' : 'duration-300'} ${
              abierta ? 'stroke-exito-solido' : 'stroke-primario'
            }`}
          />
        </svg>
        <span className="absolute inset-1.75 overflow-hidden rounded-full bg-primario-100">
          <img src={ilustracionAdministrador} alt="" className="block size-full" />
        </span>
        <span
          aria-hidden="true"
          className={`absolute top-1.5 -right-1 inline-flex h-5.5 items-center rounded-full border-2 border-white px-1.75 text-micro font-bold text-white tabular-nums ${
            abierta ? 'bg-exito-solido' : 'bg-primario'
          }`}
        >
          {abierta ? 'ON' : cuentaRegresiva ? `${codigo.segundos}s` : 'OFF'}
        </span>
      </div>

      <p className="mt-2.5 shrink-0 text-saludo">
        {saludoSegunHora(ahora)}
        {primerNombre ? `, ${primerNombre}` : ''}
      </p>
      <p className="mt-0.75 shrink-0 text-detalle leading-apoyo text-pretty text-neutro-600">
        {abierta
          ? 'Tu jornada está abierta. Ya puedes registrar órdenes.'
          : puedeGestionar
            ? 'Escanea el código con la app móvil para abrir la jornada.'
            : 'No hay jornada abierta. Pide a soporte o a un administrador que la abra.'}
      </p>

      {abierta ? (
        <div className="mt-4 flex shrink-0 flex-col gap-2 self-stretch text-left">
          <div className="flex items-center gap-2.5 rounded-menu bg-neutro-75 px-3 py-2.75">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-white text-primario shadow-tarjeta">
              <IconoJornadas className="size-3.75" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-control font-semibold">Jornada del {formatoFecha(jornada.fecha)}</span>
              <span className="block text-meta text-neutro-550">Abierta · {formatoHora(jornada.abiertaEn)}</span>
            </span>
            <span aria-hidden="true" className="size-2 rounded-full bg-exito-solido shadow-punto-activo" />
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <Dato etiqueta="Apertura">{formatoHora(jornada.abiertaEn)}</Dato>
            <Dato etiqueta="Servicios">{jornada.unidades ?? 0}</Dato>
          </dl>
          {puedeGestionar ? (
            <Boton variante="secundario" className="mt-1.5 w-full" disabled={enviando} onClick={alCerrar}>
              Cerrar jornada
            </Boton>
          ) : null}
        </div>
      ) : puedeGestionar ? (
        <QrJornada
          qr={codigo.qr}
          segundos={codigo.segundos}
          error={codigo.error}
          alReintentar={codigo.reintentar}
          enviando={enviando}
          alAbrirAqui={alAbrir}
        />
      ) : null}
    </aside>
  );
}

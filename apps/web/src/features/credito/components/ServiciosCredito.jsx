import { useState } from 'react';

import { Boton } from '@/components/ui/Boton';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { IconoVisto } from '@/components/ui/iconos/IconoVisto';
import { ESTADOS_ORDEN } from '@/constants/dominio';
import { etiquetaMedioPagoCredito, etiquetaEstadoOrden } from '@/constants/etiquetas';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';
import { plural } from '@/utils/plural';

const COLUMNAS = 'grid-cols-[18px_76px_96px_76px_minmax(0,1fr)_84px_118px]';

/** Estado de un servicio a crédito para la columna ESTADO del diseño. */
function estadoDe(orden) {
  if (orden.pago) {
    return { texto: `Pagado ${formatoFecha(orden.pago.pagadoEn.slice(0, 10))}`, clases: 'bg-exito-suave text-exito' };
  }
  if (orden.estado !== ESTADOS_ORDEN.ENTREGADA) {
    return { texto: etiquetaEstadoOrden(orden.estado), clases: 'bg-advertencia-suave text-advertencia' };
  }
  if (!orden.vale) {
    return { texto: 'Sin vale', clases: 'bg-neutro-100 text-neutro-650' };
  }
  return orden.vale.verificadoEn
    ? { texto: 'Vale recibido', clases: 'bg-primario-50 text-primario' }
    : { texto: 'Pendiente', clases: 'bg-neutro-100 text-neutro-650' };
}

const MENSAJES_VERIFICACION = {
  coincide: (resultado) =>
    `Vale ${resultado.vale.numero} coincide · ${formatoPlaca(resultado.vale.orden?.vehiculo?.placa)} · ${
      resultado.vale.orden?.servicio?.nombre
    } · ${formatoMoneda(resultado.vale.orden?.valor)}`,
  pagado: (resultado) => `El vale ${resultado.vale.numero} ya fue pagado.`,
  otra_empresa: (resultado) => `El vale ${resultado.vale.numero} pertenece a otra empresa.`,
  no_existe: (_resultado, numero) => `El vale ${numero} no está registrado. Revisa el número con la empresa.`,
};

/**
 * Servicios a crédito de la empresa (diseño): pestañas Pendientes y Pagados,
 * "Verificar vale" por número, la casilla de vale recibido por fila y el pie
 * con lo verificado y "Registrar pago". Solo se pagan servicios entregados
 * con el vale verificado; los demás siguen en el saldo.
 *
 * @param {object} props
 * @param {object[]} props.pendientes
 * @param {object[]} props.pagadas
 * @param {boolean} props.puedeVerificar
 * @param {boolean} props.puedePagar
 * @param {number|null} props.marcandoId Fila que se está guardando.
 * @param {(numero: string) => Promise<{ resultado: string, vale: object|null }|null>} props.alVerificar
 * @param {(orden: object, verificado: boolean) => void} props.alMarcar
 * @param {(orden: object) => void} props.alAgregarVale
 * @param {(ordenes: object[]) => void} props.alPagar
 */
export function ServiciosCredito({
  pendientes,
  pagadas,
  puedeVerificar,
  puedePagar,
  marcandoId,
  alVerificar,
  alMarcar,
  alAgregarVale,
  alPagar,
}) {
  const [pestana, setPestana] = useState('pendientes');
  const [numero, setNumero] = useState('');
  const [mensaje, setMensaje] = useState(null);

  const esPendientes = pestana === 'pendientes';
  const filas = esPendientes ? pendientes : pagadas;
  const verificadas = pendientes.filter(
    (orden) => orden.estado === ESTADOS_ORDEN.ENTREGADA && orden.vale?.verificadoEn,
  );
  const totalVerificado = verificadas.reduce((suma, orden) => suma + orden.valor, 0);

  async function verificar(evento) {
    evento.preventDefault();
    const limpio = numero.trim().toUpperCase();
    if (limpio === '') {
      return;
    }
    const resultado = await alVerificar(limpio);
    if (resultado) {
      setMensaje({
        bueno: resultado.resultado === 'coincide',
        texto: MENSAJES_VERIFICACION[resultado.resultado](resultado, limpio),
      });
      setNumero('');
    }
  }

  return (
    <section aria-label="Servicios a crédito" className="flex min-h-0 flex-col overflow-hidden rounded-tarjeta border border-neutro-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-neutro-150 px-4 py-3">
        <ControlSegmentado
          etiqueta="Servicios a crédito"
          tamano="compacto"
          valor={pestana}
          alCambiar={setPestana}
          opciones={[
            { valor: 'pendientes', texto: `Pendientes ${pendientes.length}` },
            { valor: 'pagadas', texto: `Pagados ${pagadas.length}` },
          ]}
        />
        {esPendientes && puedeVerificar ? (
          <form onSubmit={verificar} className="flex w-full gap-2 escritorio:w-auto">
            <label className="sr-only" htmlFor="verificar-vale">
              Número de vale
            </label>
            <input
              id="verificar-vale"
              value={numero}
              onChange={(evento) => {
                setNumero(evento.target.value.toUpperCase());
                setMensaje(null);
              }}
              placeholder="Verificar vale · ej. TA-1234"
              autoComplete="off"
              maxLength={30}
              className="h-8.5 min-w-0 flex-1 rounded-control border border-neutro-300 bg-white px-3 font-mono text-control font-semibold uppercase outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-neutro-400 focus-visible:border-primario focus-visible:shadow-foco-campo escritorio:w-56"
            />
            <Boton type="submit" variante="secundario" disabled={numero.trim().length < 3}>
              Verificar
            </Boton>
          </form>
        ) : null}
      </header>

      {mensaje ? (
        <p
          role="status"
          className={`flex items-center gap-2 border-b border-neutro-150 px-4 py-2.25 text-detalle font-semibold ${
            mensaje.bueno ? 'bg-primario-50 text-primario' : 'bg-error-suave text-error'
          }`}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {mensaje.texto}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-160">
          <div
            className={`sticky top-0 z-10 grid ${COLUMNAS} items-center gap-3 border-b border-neutro-150 bg-white px-4 py-2.25 text-encabezado-tabla whitespace-nowrap text-neutro-500 uppercase`}
          >
            <span />
            <span>Fecha</span>
            <span>Vale</span>
            <span>Placa</span>
            <span>Servicio</span>
            <span className="text-right">Valor</span>
            <span>Estado</span>
          </div>
          {filas.length === 0 ? (
            <p className="px-4 py-8 text-center text-detalle text-neutro-450">
              {esPendientes ? 'Esta empresa no tiene servicios pendientes.' : 'Aún no hay pagos registrados.'}
            </p>
          ) : (
            <ul>
              {filas.map((orden) => {
                const estado = estadoDe(orden);
                const marcable = esPendientes && puedeVerificar && orden.estado === ESTADOS_ORDEN.ENTREGADA && orden.vale;
                const verificado = Boolean(orden.vale?.verificadoEn);
                return (
                  <li
                    key={orden.id}
                    className={`grid ${COLUMNAS} h-11 items-center gap-3 border-b border-neutro-100 px-4 text-control`}
                  >
                    {marcable ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={verificado}
                        aria-label={`Vale ${orden.vale.numero} recibido`}
                        disabled={marcandoId === orden.id}
                        onClick={() => alMarcar(orden, !verificado)}
                        className={`inline-flex size-4.5 items-center justify-center rounded-[5px] border-[1.5px] text-white transition-colors duration-150 disabled:opacity-50 ${
                          verificado ? 'border-primario bg-primario' : 'border-neutro-350 bg-white'
                        }`}
                      >
                        {verificado ? <IconoVisto className="size-2.5" /> : null}
                      </button>
                    ) : (
                      <span />
                    )}
                    <span className="whitespace-nowrap text-neutro-600 tabular-nums">{formatoFecha(orden.fecha)}</span>
                    <span className="truncate font-mono text-meta font-semibold">
                      {orden.vale?.numero ??
                        (esPendientes && puedeVerificar && orden.estado === ESTADOS_ORDEN.ENTREGADA ? (
                          <button
                            type="button"
                            onClick={() => alAgregarVale(orden)}
                            className="font-sans text-meta font-semibold text-primario hover:text-primario-800"
                          >
                            Agregar vale
                          </button>
                        ) : (
                          '—'
                        ))}
                    </span>
                    <span className="font-mono text-meta whitespace-nowrap text-neutro-700">
                      {formatoPlaca(orden.vehiculo?.placa)}
                    </span>
                    <span className="truncate text-neutro-700">{orden.servicio?.nombre}</span>
                    <span className="text-right font-semibold tabular-nums">{formatoMoneda(orden.valor)}</span>
                    <span>
                      <span className={`rounded-full px-2.25 py-0.75 text-nota font-semibold whitespace-nowrap ${estado.clases}`}>
                        {orden.pago?.detalle?.medio ? etiquetaMedioPagoCredito(orden.pago.detalle.medio) : estado.texto}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {esPendientes ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutro-150 bg-neutro-25 px-4 py-3">
          <span className="text-detalle text-neutro-600">
            <span className="font-semibold text-neutro-900">{plural(verificadas.length, 'servicio', 'servicios')}</span>{' '}
            con vale recibido ·{' '}
            <span className="font-semibold text-neutro-900 tabular-nums">{formatoMoneda(totalVerificado)}</span>
          </span>
          {puedePagar ? (
            <Boton disabled={verificadas.length === 0} onClick={() => alPagar(verificadas)}>
              Registrar pago
            </Boton>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}

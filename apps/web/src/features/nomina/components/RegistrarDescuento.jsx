import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoMonto } from '@/components/ui/CampoMonto';
import { CampoSeleccion } from '@/components/ui/CampoSeleccion';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { ESTADOS_ACTIVIDAD } from '@/constants/dominio';
import { etiquetaTipoDescuento } from '@/constants/etiquetas';

const TIPOS = ['prestamo', 'jabon', 'multa'];

const AYUDAS = {
  prestamo: 'Se descuenta completo en el pago de esta quincena y no puede superar la comisión disponible.',
  jabon: 'Se descuenta en el pago de esta quincena.',
  multa: 'Se descuenta en el pago de esta quincena.',
};

/**
 * "Registrar préstamo" del diseño, ampliado a los descuentos del dominio
 * (ADR 0006): préstamo, jabón o multa, con la fecha de hoy. El préstamo se
 * descuenta en la misma quincena, sin cuotas.
 *
 * @param {object} props
 * @param {object[]} props.colaboradores
 * @param {number|null} props.colaboradorInicial
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(descuento: object) => void} props.alGuardar
 * @param {() => void} props.alCerrar
 */
export function RegistrarDescuento({ colaboradores, colaboradorInicial, enviando, error, alGuardar, alCerrar }) {
  const activos = colaboradores.filter((colaborador) => colaborador.estado === ESTADOS_ACTIVIDAD.ACTIVO);
  const [colaboradorId, setColaboradorId] = useState(colaboradorInicial ?? '');
  const [tipo, setTipo] = useState('prestamo');
  const [valor, setValor] = useState(null);
  const [observacion, setObservacion] = useState('');
  const listo = colaboradorId !== '' && valor !== null && valor > 0;

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Registrar descuento"
      descripcion="Con la fecha de hoy, en la quincena en curso."
      tamano="pequeno"
      pie={
        <>
          <Boton variante="secundario" tamano="grande" className="flex-1" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tamano="grande"
            className="flex-1"
            cargando={enviando}
            disabled={!listo}
            onClick={() =>
              alGuardar({ colaboradorId: Number(colaboradorId), tipo, valor, observacion: observacion.trim() || null })
            }
          >
            Registrar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <CampoSeleccion
          etiqueta="Colaborador"
          marcador="Elige el colaborador"
          opciones={activos.map((colaborador) => ({
            valor: colaborador.id,
            texto: `${colaborador.codigo} · ${colaborador.nombre}`,
          }))}
          value={colaboradorId}
          onChange={(evento) => setColaboradorId(evento.target.value)}
          requerido
        />
        <div>
          <p className="mb-1.5 text-meta font-semibold text-neutro-700">Tipo</p>
          <div role="group" aria-label="Tipo de descuento" className="grid grid-cols-3 gap-1.5">
            {TIPOS.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-pressed={tipo === opcion}
                onClick={() => setTipo(opcion)}
                className={`h-9.5 rounded-control border text-detalle font-semibold transition-colors duration-150 ${
                  tipo === opcion ? 'border-neutro-900 bg-neutro-900 text-white' : 'border-neutro-275 bg-white text-neutro-900 hover:bg-neutro-75'
                }`}
              >
                {etiquetaTipoDescuento(opcion)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-meta leading-apoyo text-neutro-600">{AYUDAS[tipo]}</p>
        </div>
        <CampoMonto etiqueta="Valor" valor={valor} alCambiar={setValor} requerido />
        <CampoTexto
          etiqueta="Observación"
          placeholder="Ej. Adelanto de quincena"
          maxLength={255}
          value={observacion}
          onChange={(evento) => setObservacion(evento.target.value)}
        />
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
      </div>
    </Modal>
  );
}

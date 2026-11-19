import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoMonto } from '@/components/ui/CampoMonto';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { ETIQUETAS_CATEGORIA_EGRESO } from '@/constants/etiquetas';

/**
 * "Registrar egreso" del diseño: categoría, monto y concepto. El egreso sale
 * del efectivo de la caja abierta y no se modifica después.
 *
 * @param {object} props
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(egreso: { categoria: string, concepto: string|null, valor: number }) => void} props.alGuardar
 * @param {() => void} props.alCerrar
 */
export function FormularioEgreso({ enviando, error, alGuardar, alCerrar }) {
  const [categoria, setCategoria] = useState('insumos');
  const [valor, setValor] = useState(null);
  const [concepto, setConcepto] = useState('');

  const listo = valor !== null && valor > 0 && !enviando;

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Registrar egreso"
      descripcion="Se descuenta del efectivo en caja."
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
            onClick={() => alGuardar({ categoria, valor, concepto: concepto.trim() || null })}
          >
            Registrar egreso
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div role="group" aria-label="Categoría del egreso" className="grid grid-cols-2 gap-1.5">
          {Object.entries(ETIQUETAS_CATEGORIA_EGRESO).map(([valorCategoria, texto]) => (
            <button
              key={valorCategoria}
              type="button"
              aria-pressed={categoria === valorCategoria}
              onClick={() => setCategoria(valorCategoria)}
              className={`h-8.5 rounded-control border text-detalle font-semibold transition-colors duration-150 ${
                categoria === valorCategoria
                  ? 'border-primario bg-primario-25 text-primario'
                  : 'border-neutro-275 bg-white text-neutro-700 hover:bg-neutro-75'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        <CampoMonto etiqueta="Monto" valor={valor} alCambiar={setValor} requerido />
        <CampoTexto
          etiqueta="Concepto"
          placeholder="Ej. Compra de shampoo"
          maxLength={255}
          value={concepto}
          onChange={(evento) => setConcepto(evento.target.value)}
        />
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
      </div>
    </Modal>
  );
}

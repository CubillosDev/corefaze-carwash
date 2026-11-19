import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';

const enteroOCero = (texto) => {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos === '' ? 0 : Number(digitos);
};

function validar(valores) {
  const errores = {};
  if (valores.nombre.trim().length < 3) {
    errores.nombre = 'Escribe el nombre del insumo (mínimo 3 letras).';
  }
  if (valores.categoria.trim().length < 2) {
    errores.categoria = 'Escribe la categoría.';
  }
  if (valores.unidad.trim().length < 1) {
    errores.unidad = 'Escribe la unidad, por ejemplo litros.';
  }
  return errores;
}

/**
 * Crear o editar un insumo. Al crear se puede dar el stock inicial, que entra
 * como primer movimiento; después el stock solo cambia con − y +.
 *
 * @param {object} props
 * @param {import('@/features/inventario/api/inventario.api').Insumo} [props.insumo]
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(datos: object) => void} props.alGuardar
 * @param {() => void} props.alCerrar
 */
export function FormularioInsumo({ insumo, enviando, error, alGuardar, alCerrar }) {
  const nuevo = !insumo;
  const [valores, setValores] = useState({
    nombre: insumo?.nombre ?? '',
    categoria: insumo?.categoria ?? '',
    unidad: insumo?.unidad ?? '',
    stockMinimo: String(insumo?.stockMinimo ?? ''),
    stockInicial: '',
  });
  const [errores, setErrores] = useState({});
  const cambiar = (campo) => (evento) => setValores((anteriores) => ({ ...anteriores, [campo]: evento.target.value }));

  function guardar() {
    const encontrados = validar(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      return;
    }
    alGuardar({
      nombre: valores.nombre.trim(),
      categoria: valores.categoria.trim(),
      unidad: valores.unidad.trim(),
      stockMinimo: enteroOCero(valores.stockMinimo),
      ...(nuevo ? { stockInicial: enteroOCero(valores.stockInicial) } : {}),
    });
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={nuevo ? 'Nuevo insumo' : 'Editar insumo'}
      tamano="pequeno"
      pie={
        <>
          <Boton variante="secundario" tamano="grande" className="flex-1" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton tamano="grande" className="flex-1" cargando={enviando} onClick={guardar}>
            {nuevo ? 'Crear insumo' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <CampoTexto
          etiqueta="Nombre"
          placeholder="Ej. Shampoo pH neutro"
          value={valores.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
          maxLength={100}
          requerido
        />
        <div className="grid grid-cols-2 gap-2.5">
          <CampoTexto
            etiqueta="Categoría"
            placeholder="Ej. Lavado exterior"
            value={valores.categoria}
            onChange={cambiar('categoria')}
            error={errores.categoria}
            maxLength={50}
            requerido
          />
          <CampoTexto
            etiqueta="Unidad"
            placeholder="Ej. litros"
            value={valores.unidad}
            onChange={cambiar('unidad')}
            error={errores.unidad}
            maxLength={30}
            requerido
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <CampoTexto
            etiqueta="Stock mínimo"
            inputMode="numeric"
            placeholder="0"
            value={valores.stockMinimo}
            onChange={cambiar('stockMinimo')}
            ayuda="Por debajo avisa stock bajo."
          />
          {nuevo ? (
            <CampoTexto
              etiqueta="Stock inicial"
              inputMode="numeric"
              placeholder="0"
              value={valores.stockInicial}
              onChange={cambiar('stockInicial')}
              ayuda="Lo que hay hoy."
            />
          ) : null}
        </div>
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
      </div>
    </Modal>
  );
}

import { useId, useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { DESCRIPCIONES_ROL, ROLES_ASIGNABLES, esRolPendiente, etiquetaDeRol } from '@/constants/permisos';
import { asignarRol } from '@/features/usuarios/api/usuarios.api';

/**
 * Aprobar una cuenta pendiente o cambiar el rol de una cuenta: una tarjeta por
 * rol con lo que permite. La API valida las reglas (nadie se quita a sí mismo
 * el rol de superadministrador ni deja el sistema sin uno activo).
 *
 * @param {object} props
 * @param {import('@/features/usuarios/api/usuarios.api').Usuario} props.usuario
 * @param {() => void} props.alCerrar
 * @param {(usuario: import('@/features/usuarios/api/usuarios.api').Usuario) => void} props.alGuardar
 */
export function AsignarRol({ usuario, alCerrar, alGuardar }) {
  const idTitulo = useId();
  const pendiente = esRolPendiente(usuario.rol);
  const [rol, setRol] = useState(pendiente ? null : usuario.rol);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const sinCambio = rol === null || rol === usuario.rol;

  async function guardar() {
    setEnviando(true);
    setError('');
    try {
      alGuardar(await asignarRol(usuario.id, rol));
    } catch (errorDeApi) {
      setError(errorDeApi.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={pendiente ? `Aprobar a ${usuario.nombre}` : `Rol de ${usuario.nombre}`}
      descripcion={usuario.email}
      pie={
        <>
          <Boton variante="secundario" tamano="grande" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton tamano="grande" cargando={enviando} disabled={sinCambio} onClick={guardar}>
            {pendiente ? 'Aprobar con este rol' : 'Guardar rol'}
          </Boton>
        </>
      }
    >
      <span id={idTitulo} className="text-meta font-semibold text-neutro-700">
        {pendiente ? 'Elige el rol con el que entrará al panel' : 'Rol'}
      </span>
      <div role="radiogroup" aria-labelledby={idTitulo} className="mt-2 flex flex-col gap-2">
        {ROLES_ASIGNABLES.map((opcion) => {
          const elegido = opcion === rol;
          return (
            <button
              key={opcion}
              type="button"
              role="radio"
              aria-checked={elegido}
              onClick={() => setRol(opcion)}
              className={`flex items-start gap-3 rounded-tarjeta border px-3.5 py-3 text-left transition-colors duration-150 ${
                elegido ? 'border-primario bg-primario-50' : 'border-neutro-275 bg-white hover:border-neutro-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  elegido ? 'border-primario' : 'border-neutro-325'
                }`}
              >
                {elegido ? <span className="size-2 rounded-full bg-primario" /> : null}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-control font-semibold ${elegido ? 'text-primario-800' : 'text-neutro-900'}`}>
                  {etiquetaDeRol(opcion)}
                </span>
                <span className="text-detalle leading-apoyo text-neutro-600">{DESCRIPCIONES_ROL[opcion]}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <Alerta tipo="error" className="mt-3.5">
          {error}
        </Alerta>
      ) : null}
    </Modal>
  );
}

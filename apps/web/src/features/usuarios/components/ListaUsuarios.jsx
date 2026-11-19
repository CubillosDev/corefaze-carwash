import { Avatar } from '@/components/ui/Avatar';
import { Boton } from '@/components/ui/Boton';
import { Insignia } from '@/components/ui/Insignia';
import { esRolPendiente, etiquetaDeRol, tonoDeRol } from '@/constants/permisos';
import { formatoFecha } from '@/utils/formatoFecha';

/**
 * Cuentas en pantalla angosta: una tarjeta apilada por cuenta, con las mismas
 * acciones que la tabla de escritorio.
 *
 * @param {object} props
 * @param {import('@/features/usuarios/api/usuarios.api').Usuario[]} props.usuarios
 * @param {number|undefined} props.idPropio Cuenta con la sesión abierta: no se gestiona a sí misma.
 * @param {boolean} props.puedeGestionar
 * @param {(usuario: object) => void} props.alEditarRol
 * @param {(usuario: object) => void} props.alCambiarEstado
 * @param {string} props.mensajeVacio
 */
export function ListaUsuarios({ usuarios, idPropio, puedeGestionar, alEditarRol, alCambiarEstado, mensajeVacio }) {
  if (usuarios.length === 0) {
    return <p className="px-5 py-10 text-center text-detalle text-neutro-450">{mensajeVacio}</p>;
  }

  return (
    <ul aria-label="Cuentas del panel">
      {usuarios.map((usuario) => {
        const propio = usuario.id === idPropio;
        return (
          <li key={usuario.id} className="flex flex-col gap-2.5 border-b border-neutro-100 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-2.5">
              <Avatar nombre={usuario.nombre} tamano="mediano" tono={usuario.activo ? 'primario' : 'neutro'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-control font-semibold">
                  {usuario.nombre}
                  {propio ? <span className="ml-1.5 text-meta font-medium text-neutro-500">(tú)</span> : null}
                </p>
                <p className="truncate text-detalle text-neutro-600">{usuario.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Insignia tono={tonoDeRol(usuario.rol)}>{etiquetaDeRol(usuario.rol)}</Insignia>
              <Insignia tono={usuario.activo ? 'exito' : 'neutro'}>{usuario.activo ? 'Activo' : 'Inactivo'}</Insignia>
              <span className="ml-auto text-meta text-neutro-450 tabular-nums">{formatoFecha(usuario.creadoEn)}</span>
            </div>
            {puedeGestionar && !propio ? (
              <div className="flex gap-2">
                <Boton variante="secundario" tamano="pequeno" className="flex-1" onClick={() => alEditarRol(usuario)}>
                  {esRolPendiente(usuario.rol) ? 'Aprobar' : 'Cambiar rol'}
                </Boton>
                <Boton variante="secundario" tamano="pequeno" className="flex-1" onClick={() => alCambiarEstado(usuario)}>
                  {usuario.activo ? 'Desactivar' : 'Activar'}
                </Boton>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

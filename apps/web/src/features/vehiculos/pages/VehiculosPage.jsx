import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { IconoCargando } from '@/components/ui/iconos/IconoCargando';
import {
  actualizarVehiculo,
  crearVehiculo,
  eliminarVehiculo,
} from '@/features/vehiculos/api/vehiculos.api';
import { ConfirmarEliminarVehiculo } from '@/features/vehiculos/components/ConfirmarEliminarVehiculo';
import { FormularioVehiculo } from '@/features/vehiculos/components/FormularioVehiculo';
import { HistorialVehiculo } from '@/features/vehiculos/components/HistorialVehiculo';
import { TablaVehiculos } from '@/features/vehiculos/components/TablaVehiculos';
import { useVehiculos } from '@/features/vehiculos/hooks/useVehiculos';
import { normalizarPlaca } from '@/features/vehiculos/validators/vehiculo.schema';
import { formatoPlaca } from '@/utils/formatoPlaca';

/**
 * Vehículos: listado, búsqueda por placa, registro, edición, eliminación y
 * historial de lavados. La página solo compone; los datos viven en los hooks y
 * las llamadas HTTP en api/.
 */
export function VehiculosPage() {
  const datos = useVehiculos();
  // Una sola ventana a la vez: { tipo: 'formulario'|'eliminar'|'historial', vehiculo }
  const [ventana, setVentana] = useState(null);
  const [aviso, setAviso] = useState('');

  const cerrarVentana = () => setVentana(null);
  const hayBusqueda = normalizarPlaca(datos.busqueda) !== '';

  async function guardar(valores) {
    const editando = ventana.vehiculo;
    if (editando) {
      datos.reemplazar(await actualizarVehiculo(editando.id, valores));
    } else {
      datos.agregar(await crearVehiculo(valores));
    }
    setAviso(
      `Vehículo ${formatoPlaca(valores.placa)} ${editando ? 'actualizado' : 'registrado'} correctamente.`,
    );
    cerrarVentana();
  }

  async function eliminar() {
    const { vehiculo } = ventana;
    await eliminarVehiculo(vehiculo.id);
    datos.quitar(vehiculo.id);
    setAviso(`Vehículo ${formatoPlaca(vehiculo.placa)} eliminado.`);
    cerrarVentana();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 escritorio:flex-row escritorio:items-end escritorio:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo text-neutro-900">Vehículos</h1>
          <p className="text-detalle text-neutro-600">
            Busca un vehículo por su placa, registra uno nuevo o revisa su historial de lavados.
          </p>
        </div>
        <Boton onClick={() => setVentana({ tipo: 'formulario', vehiculo: null })}>
          Nuevo vehículo
        </Boton>
      </header>

      {aviso ? (
        <Alerta tipo="exito" alCerrar={() => setAviso('')}>
          {aviso}
        </Alerta>
      ) : null}

      <CampoTexto
        etiqueta="Buscar por placa"
        type="search"
        autoComplete="off"
        placeholder="Ejemplo: ABC123"
        value={datos.busqueda}
        onChange={(evento) => datos.buscar(evento.target.value)}
        className="escritorio:max-w-xs"
      />

      {datos.situacion === 'cargando' ? (
        <p role="status" className="flex items-center gap-2 py-10 text-neutro-600">
          <IconoCargando />
          Cargando vehículos…
        </p>
      ) : null}

      {datos.situacion === 'error' ? (
        <div className="flex flex-col items-start gap-3">
          <Alerta tipo="error" titulo="No pudimos cargar los vehículos" className="w-full">
            {datos.error}
          </Alerta>
          <Boton variante="secundario" onClick={datos.recargar}>
            Reintentar
          </Boton>
        </div>
      ) : null}

      {datos.situacion === 'listo' ? (
        <>
          <p aria-live="polite" className="text-detalle text-neutro-600">
            {hayBusqueda
              ? `${datos.coincidencias.length} de ${datos.vehiculos.length} vehículos`
              : `${datos.vehiculos.length} ${datos.vehiculos.length === 1 ? 'vehículo' : 'vehículos'}`}
          </p>
          <TablaVehiculos
            vehiculos={datos.coincidencias}
            nombreDeCliente={datos.nombreDeCliente}
            alVerHistorial={(vehiculo) => setVentana({ tipo: 'historial', vehiculo })}
            alEditar={(vehiculo) => setVentana({ tipo: 'formulario', vehiculo })}
            alEliminar={(vehiculo) => setVentana({ tipo: 'eliminar', vehiculo })}
            mensajeVacio={
              hayBusqueda
                ? 'Ningún vehículo coincide con esa placa.'
                : 'Todavía no hay vehículos registrados. Usa «Nuevo vehículo» para agregar el primero.'
            }
          />
        </>
      ) : null}

      {ventana?.tipo === 'formulario' ? (
        <FormularioVehiculo
          vehiculo={ventana.vehiculo}
          clientes={datos.clientes}
          alGuardar={guardar}
          alCerrar={cerrarVentana}
        />
      ) : null}

      {ventana?.tipo === 'eliminar' ? (
        <ConfirmarEliminarVehiculo
          vehiculo={ventana.vehiculo}
          alConfirmar={eliminar}
          alCerrar={cerrarVentana}
        />
      ) : null}

      {ventana?.tipo === 'historial' ? (
        <HistorialVehiculo vehiculo={ventana.vehiculo} alCerrar={cerrarVentana} />
      ) : null}
    </div>
  );
}

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoCredito } from '@/components/ui/iconos/IconoCredito';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { MEDIOS_PAGO, TIPOS_CLIENTE } from '@/constants/dominio';
import { rolPuedeGestionar, rolPuedeVerificarVales } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { crearCliente } from '@/features/clientes';
import {
  actualizarCondiciones,
  marcarVale,
  registrarPagoCredito,
  registrarVale,
  verificarVale,
} from '@/features/credito/api/credito.api';
import { AgregarVale } from '@/features/credito/components/AgregarVale';
import { DetalleEmpresa } from '@/features/credito/components/DetalleEmpresa';
import { EstadoCuenta } from '@/features/credito/components/EstadoCuenta';
import { FormularioEmpresa } from '@/features/credito/components/FormularioEmpresa';
import { ListaEmpresas } from '@/features/credito/components/ListaEmpresas';
import { RegistrarPago } from '@/features/credito/components/RegistrarPago';
import { ServiciosCredito } from '@/features/credito/components/ServiciosCredito';
import { useCredito } from '@/features/credito/hooks/useCredito';
import { FormularioOrden } from '@/features/ordenes-lavado';
import { useAviso } from '@/hooks/useAviso';
import { useImpresion } from '@/hooks/useImpresion';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

const MENSAJE_POR_DEFECTO = 'No pudimos completar la operación. Inténtalo de nuevo.';

/**
 * Crédito empresarial del diseño: empresas con su saldo, cupo y corte; los
 * servicios a crédito de la elegida con la verificación de vales y el
 * registro de pagos; nueva empresa, condiciones, cargar un servicio a
 * crédito y el estado de cuenta. Los saldos los calcula el servidor.
 */
export function CreditoPage() {
  const { usuario } = useSesion();
  const credito = useCredito();
  const { aviso, mostrarAviso } = useAviso();
  const { aImprimir, imprimir } = useImpresion();
  const [ventana, setVentana] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [marcandoId, setMarcandoId] = useState(null);

  const puedeGestionar = rolPuedeGestionar(usuario?.rol, RUTAS.CREDITO);
  const puedeVerificar = rolPuedeVerificarVales(usuario?.rol);
  const puedeCargarServicio = rolPuedeGestionar(usuario?.rol, RUTAS.ORDENES_LAVADO);

  const empresas = credito.empresas.datos ?? [];
  const { elegida } = credito;
  const pendientes = credito.servicios.datos?.pendientes ?? [];
  const pagadas = credito.servicios.datos?.pagadas ?? [];
  const saldoTotal = empresas.reduce((suma, empresa) => suma + empresa.saldoPendiente, 0);
  const porPagar = empresas.reduce((suma, empresa) => suma + empresa.cantidadOrdenesPagables, 0);

  function abrir(nombre, datos = null) {
    setError('');
    setVentana({ nombre, datos });
  }

  async function ejecutar(accion, mensaje) {
    setEnviando(true);
    setError('');
    try {
      const resultado = await accion();
      credito.refrescar();
      setVentana(null);
      if (mensaje) {
        mostrarAviso(mensaje);
      }
      return resultado;
    } catch (fallo) {
      setError(fallo.message || MENSAJE_POR_DEFECTO);
      return null;
    } finally {
      setEnviando(false);
    }
  }

  async function verificar(numero) {
    try {
      const resultado = await verificarVale(elegida.id, numero);
      credito.refrescar();
      return resultado;
    } catch (fallo) {
      mostrarAviso(fallo.message || MENSAJE_POR_DEFECTO, 'error');
      return null;
    }
  }

  async function marcar(orden, verificado) {
    setMarcandoId(orden.id);
    try {
      await marcarVale(orden.id, verificado);
      credito.refrescar();
    } catch (fallo) {
      mostrarAviso(fallo.message || MENSAJE_POR_DEFECTO, 'error');
    } finally {
      setMarcandoId(null);
    }
  }

  async function crearEmpresa(datos) {
    const cliente = await ejecutar(async () => {
      const creado = await crearCliente({
        nombre: datos.nombre,
        documento: datos.documento,
        telefono: datos.telefono,
        tipo: TIPOS_CLIENTE.EMPRESA,
        creditoHabilitado: true,
      });
      await actualizarCondiciones(creado.id, {
        cupoCredito: datos.cupoCredito,
        diaCorte: datos.diaCorte,
        contacto: datos.contacto,
      });
      return creado;
    }, 'Empresa creada con crédito habilitado');
    if (cliente) {
      credito.elegir(cliente.id);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EncabezadoPagina
        titulo="Crédito empresarial"
        descripcion={`${plural(empresas.length, 'empresa', 'empresas')} · ${formatoMoneda(saldoTotal)} por cobrar en ${plural(porPagar, 'servicio entregado', 'servicios entregados')}`}
        acciones={
          <>
            {puedeGestionar ? (
              <Boton variante="secundario" onClick={() => abrir('empresa')}>
                Nueva empresa
              </Boton>
            ) : null}
            {puedeCargarServicio && elegida ? (
              <Boton className="pl-2.75 shadow-boton-primario" onClick={() => abrir('servicio')}>
                <IconoMas className="size-3.75" />
                Cargar servicio
              </Boton>
            ) : null}
          </>
        }
      />

      {credito.empresas.situacion === 'cargando' ? <EstadoCarga texto="Cargando el crédito…" className="mt-6" /> : null}
      {credito.empresas.situacion === 'error' ? (
        <EstadoError mensaje={credito.empresas.error} alReintentar={credito.empresas.recargar} className="mt-4.5" />
      ) : null}

      {credito.empresas.situacion === 'listo' && empresas.length === 0 ? (
        <Tarjeta relleno="ninguno" className="mt-4.5">
          <EstadoVacio
            icono={<IconoCredito className="size-5" />}
            titulo="Aún no hay empresas con crédito"
            descripcion="Crea una empresa para cargarle servicios a crédito."
          />
        </Tarjeta>
      ) : null}

      {credito.empresas.situacion === 'listo' && elegida ? (
        <div className="mt-4.5 flex flex-col gap-3 amplio:min-h-0 amplio:flex-1 amplio:flex-row">
          <ListaEmpresas empresas={empresas} elegidaId={elegida.id} alElegir={credito.elegir} />
          <div className="flex min-w-0 flex-1 flex-col gap-3 amplio:min-h-0">
            <DetalleEmpresa
              empresa={elegida}
              pendientes={pendientes}
              puedeGestionar={puedeGestionar}
              alEditarCondiciones={() => abrir('condiciones')}
              alImprimir={() => imprimir(elegida.id)}
            />
            {credito.servicios.situacion === 'cargando' ? <EstadoCarga texto="Cargando servicios…" /> : null}
            {credito.servicios.situacion === 'error' ? (
              <EstadoError mensaje={credito.servicios.error} alReintentar={credito.servicios.recargar} />
            ) : null}
            {credito.servicios.situacion === 'listo' ? (
              <ServiciosCredito
                key={elegida.id}
                pendientes={pendientes}
                pagadas={pagadas}
                puedeVerificar={puedeVerificar}
                puedePagar={puedeGestionar}
                marcandoId={marcandoId}
                alVerificar={verificar}
                alMarcar={marcar}
                alAgregarVale={(orden) => abrir('vale', orden)}
                alPagar={(ordenes) => abrir('pago', ordenes)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {ventana?.nombre === 'empresa' || ventana?.nombre === 'condiciones' ? (
        <FormularioEmpresa
          empresa={ventana.nombre === 'condiciones' ? elegida : undefined}
          enviando={enviando}
          error={error}
          alCerrar={() => setVentana(null)}
          alGuardar={(datos) =>
            ventana.nombre === 'empresa'
              ? crearEmpresa(datos)
              : ejecutar(
                  () =>
                    actualizarCondiciones(elegida.id, {
                      cupoCredito: datos.cupoCredito,
                      diaCorte: datos.diaCorte,
                      contacto: datos.contacto,
                    }),
                  'Condiciones actualizadas',
                )
          }
        />
      ) : null}

      {ventana?.nombre === 'pago' ? (
        <RegistrarPago
          empresa={elegida}
          ordenes={ventana.datos}
          pendientesSinVale={pendientes.length - ventana.datos.length}
          enviando={enviando}
          error={error}
          alCerrar={() => setVentana(null)}
          alConfirmar={(medio) =>
            ejecutar(
              () =>
                registrarPagoCredito({
                  clienteId: elegida.id,
                  ordenIds: ventana.datos.map((orden) => orden.id),
                  medio,
                }),
              'Pago registrado',
            )
          }
        />
      ) : null}

      {ventana?.nombre === 'vale' ? (
        <AgregarVale
          orden={ventana.datos}
          enviando={enviando}
          error={error}
          alCerrar={() => setVentana(null)}
          alGuardar={(numero) => ejecutar(() => registrarVale(ventana.datos.id, numero), 'Vale registrado')}
        />
      ) : null}

      {ventana?.nombre === 'servicio' ? (
        <FormularioOrden
          valoresIniciales={{ medioPago: MEDIOS_PAGO.CREDITO, clienteId: String(elegida.id) }}
          alCerrar={() => setVentana(null)}
          alCrear={() => {
            setVentana(null);
            credito.refrescar();
            mostrarAviso('Servicio cargado a crédito');
          }}
        />
      ) : null}

      {aImprimir && elegida ? <EstadoCuenta empresa={elegida} pendientes={pendientes} /> : null}

      <Aviso aviso={aviso} />
    </div>
  );
}

import { useState } from 'react';

import {
  abrirCaja,
  cerrarCaja,
  obtenerDatosNegocio,
  obtenerEstadoCaja,
  reabrirCaja,
  registrarCobro,
  registrarEgreso,
} from '@/features/caja/api/caja.api';
import { listarEmpresasCredito } from '@/features/credito';
import { useCarga } from '@/hooks/useCarga';

async function cargarCaja(signal) {
  const [estado, empresas, negocio] = await Promise.all([
    obtenerEstadoCaja({}, { signal }),
    listarEmpresasCredito({ signal }),
    obtenerDatosNegocio({ signal }),
  ]);
  return {
    ...estado,
    empresas: empresas.filter((empresa) => empresa.creditoHabilitado && empresa.estado === 'activo'),
    negocio,
  };
}

const MENSAJE_POR_DEFECTO = 'No pudimos completar la operación. Inténtalo de nuevo.';

/**
 * Datos y acciones de la caja: el estado de la caja de la jornada (con los
 * totales del servidor), las empresas con crédito y los datos del negocio,
 * y abrir, cobrar, registrar egresos, cerrar y reabrir. Cada acción vuelve a
 * cargar la caja para que los totales sean siempre los del servidor.
 */
export function useCaja() {
  const carga = useCarga(cargarCaja);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function ejecutar(accion) {
    setEnviando(true);
    setError('');
    try {
      const resultado = await accion();
      carga.refrescar();
      return resultado;
    } catch (fallo) {
      setError(fallo.message || MENSAJE_POR_DEFECTO);
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return {
    ...carga,
    enviando,
    error,
    limpiarError: () => setError(''),
    abrir: (baseInicial) => ejecutar(() => abrirCaja(baseInicial)),
    cobrar: (cobro) => ejecutar(() => registrarCobro(cobro)),
    registrarEgreso: (egreso) => ejecutar(() => registrarEgreso(egreso)),
    cerrar: (efectivoContado) => ejecutar(() => cerrarCaja(efectivoContado)),
    reabrir: (id) => ejecutar(() => reabrirCaja(id)),
  };
}

import { useCallback, useEffect, useState } from 'react';

import { ESTADOS_JORNADA } from '@/constants/dominio';
import { generarQrJornada, listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { fechaEnBogota } from '@/utils/formatoFecha';

/** Cada cuántos segundos se pregunta si el celular ya abrió la jornada. */
const SEGUNDOS_ENTRE_CONSULTAS = 4;

const INICIAL = { qr: null, segundos: 0, error: '' };

/**
 * Código QR para abrir la jornada desde la app móvil, como en el diseño: se
 * renueva solo al vencer (30 s), lleva la cuenta regresiva y, mientras está
 * en pantalla, pregunta cada pocos segundos si la jornada ya se abrió para
 * avisar con `alDetectarApertura`.
 *
 * @param {object} opciones
 * @param {boolean} opciones.activo Solo con la jornada cerrada y quien puede abrirla.
 * @param {() => void} opciones.alDetectarApertura Debe ser estable (useCallback).
 * @returns {{
 *   qr: { contenido: string, expiraEn: string, vigenciaSegundos: number }|null,
 *   segundos: number,
 *   error: string,
 *   reintentar: () => void,
 * }}
 */
export function useQrJornada({ activo, alDetectarApertura }) {
  const [estado, setEstado] = useState(INICIAL);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!activo) {
      return undefined;
    }
    let vigente = true;
    let expira = 0;
    let pidiendo = false;
    let fallo = false;
    let tic = 0;

    async function renovar() {
      pidiendo = true;
      try {
        const qr = await generarQrJornada();
        if (vigente) {
          expira = Date.parse(qr.expiraEn);
          setEstado({ qr, segundos: qr.vigenciaSegundos, error: '' });
        }
      } catch (error) {
        fallo = true;
        if (vigente) {
          setEstado({ qr: null, segundos: 0, error: error.message });
        }
      } finally {
        pidiendo = false;
      }
    }

    async function revisarApertura() {
      try {
        const jornadas = await listarJornadas({ desde: fechaEnBogota() });
        if (vigente && jornadas.some((jornada) => jornada.estado === ESTADOS_JORNADA.ABIERTA)) {
          alDetectarApertura();
        }
      } catch {
        // Sin conexión: se vuelve a preguntar en la siguiente vuelta.
      }
    }

    renovar();
    const reloj = setInterval(() => {
      tic += 1;
      if (pidiendo || fallo) {
        return;
      }
      const segundos = Math.max(0, Math.ceil((expira - Date.now()) / 1000));
      setEstado((anterior) => (anterior.segundos === segundos ? anterior : { ...anterior, segundos }));
      if (segundos === 0) {
        renovar();
      }
      if (tic % SEGUNDOS_ENTRE_CONSULTAS === 0) {
        revisarApertura();
      }
    }, 1000);

    return () => {
      vigente = false;
      clearInterval(reloj);
    };
  }, [activo, intento, alDetectarApertura]);

  const reintentar = useCallback(() => {
    setEstado(INICIAL);
    setIntento((valor) => valor + 1);
  }, []);

  return activo ? { ...estado, reintentar } : { ...INICIAL, reintentar };
}

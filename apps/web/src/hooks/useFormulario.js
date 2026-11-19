import { useState } from 'react';

/**
 * Estado de un formulario que se envía a la API: valores, errores de formato
 * (del validador del feature), errores por campo y mensaje que devuelve la
 * API, y si se está enviando.
 *
 * @template V, D, R
 * @param {object} opciones
 * @param {V} opciones.inicial
 * @param {(valores: V) => { valido: boolean, errores: Record<string, string>, datos: D }} opciones.validar
 * @param {(datos: D) => Promise<R>} opciones.enviar Llamada a la API.
 * @param {(resultado: R) => void} opciones.alGuardar
 */
export function useFormulario({ inicial, validar, enviar, alGuardar }) {
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [errorDeApi, setErrorDeApi] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo, valor) => {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  async function enviarFormulario(evento) {
    evento?.preventDefault();
    const resultado = validar(valores);
    setErrores(resultado.errores);
    setErrorDeApi('');
    if (!resultado.valido) {
      return;
    }

    setEnviando(true);
    try {
      alGuardar(await enviar(resultado.datos));
    } catch (error) {
      setErrores(error.erroresPorCampo ?? {});
      setErrorDeApi(error.message);
      setEnviando(false);
    }
  }

  return { valores, errores, errorDeApi, enviando, cambiar, setValores, enviarFormulario };
}

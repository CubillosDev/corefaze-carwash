import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { LIMITES } from '@/constants/dominio';
import { formatoMoneda } from '@/utils/formatoMoneda';

const CUPOS = [500000, 1000000, 2000000, 3000000];
const CORTES = [
  { valor: 5, texto: 'Día 5' },
  { valor: 15, texto: 'Día 15' },
  { valor: 20, texto: 'Día 20' },
  { valor: 31, texto: 'Fin de mes' },
];

const claseOpcion = (activa) =>
  `h-9.5 rounded-control border text-detalle font-semibold transition-colors duration-150 ${
    activa ? 'border-neutro-900 bg-neutro-900 text-white' : 'border-neutro-275 bg-white text-neutro-900 hover:bg-neutro-75'
  }`;

function validar(valores, nueva) {
  const errores = {};
  if (nueva) {
    if (valores.nombre.trim().length < LIMITES.nombre.min) {
      errores.nombre = 'Escribe la razón social.';
    }
    const documento = valores.documento.replace(/\D/g, '');
    if (documento.length < LIMITES.documento.min || documento.length > LIMITES.documento.max) {
      errores.documento = `El NIT tiene de ${LIMITES.documento.min} a ${LIMITES.documento.max} dígitos.`;
    }
    if (!/^[0-9]{10}$/.test(valores.telefono.trim())) {
      errores.telefono = 'El teléfono tiene 10 dígitos.';
    }
  }
  if (valores.contacto.trim() !== '' && valores.contacto.trim().length < 3) {
    errores.contacto = 'Escribe el nombre del contacto.';
  }
  return errores;
}

/**
 * "Nueva empresa" del diseño: razón social, NIT, contacto, cupo y día de
 * corte. El dominio pide además el teléfono del cliente. Con `empresa`
 * edita solo las condiciones (cupo, corte y contacto) de una que ya existe.
 *
 * @param {object} props
 * @param {object} [props.empresa]
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(datos: object) => void} props.alGuardar
 * @param {() => void} props.alCerrar
 */
export function FormularioEmpresa({ empresa, enviando, error, alGuardar, alCerrar }) {
  const nueva = !empresa;
  const [valores, setValores] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    contacto: empresa?.contacto ?? '',
    cupoCredito: empresa?.cupoCredito ?? 1000000,
    diaCorte: empresa?.diaCorte ?? 31,
  });
  const [errores, setErrores] = useState({});

  const cambiar = (campo) => (evento) => setValores((anteriores) => ({ ...anteriores, [campo]: evento.target.value }));
  const elegir = (campo, valor) => setValores((anteriores) => ({ ...anteriores, [campo]: valor }));

  function guardar() {
    const encontrados = validar(valores, nueva);
    setErrores(encontrados);
    if (Object.keys(encontrados).length === 0) {
      alGuardar({
        nombre: valores.nombre.trim(),
        documento: valores.documento.replace(/\D/g, ''),
        telefono: valores.telefono.trim(),
        contacto: valores.contacto.trim() || null,
        cupoCredito: valores.cupoCredito,
        diaCorte: valores.diaCorte,
      });
    }
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={nueva ? 'Nueva empresa' : 'Condiciones de crédito'}
      descripcion={nueva ? 'Queda con crédito habilitado.' : empresa.nombre}
      tamano="pequeno"
      pie={
        <>
          <Boton variante="secundario" tamano="grande" className="flex-1" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton tamano="grande" className="flex-1" cargando={enviando} onClick={guardar}>
            {nueva ? 'Crear empresa' : 'Guardar condiciones'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {nueva ? (
          <>
            <CampoTexto
              etiqueta="Razón social"
              placeholder="Ej. Distribuidora El Poblado S.A.S."
              value={valores.nombre}
              onChange={cambiar('nombre')}
              error={errores.nombre}
              requerido
            />
            <div className="grid grid-cols-2 gap-2.5">
              <CampoTexto
                etiqueta="NIT"
                placeholder="900123456"
                inputMode="numeric"
                value={valores.documento}
                onChange={cambiar('documento')}
                error={errores.documento}
                requerido
              />
              <CampoTexto
                etiqueta="Teléfono"
                placeholder="3001234567"
                inputMode="numeric"
                maxLength={10}
                value={valores.telefono}
                onChange={cambiar('telefono')}
                error={errores.telefono}
                requerido
              />
            </div>
          </>
        ) : null}
        <CampoTexto
          etiqueta="Contacto"
          placeholder="Nombre de quien autoriza los servicios"
          value={valores.contacto}
          onChange={cambiar('contacto')}
          error={errores.contacto}
        />
        <div>
          <p className="mb-1.5 text-meta font-semibold text-neutro-700">Cupo de crédito</p>
          <div role="group" aria-label="Cupo de crédito" className="grid grid-cols-4 gap-1.5">
            {CUPOS.map((cupo) => (
              <button
                key={cupo}
                type="button"
                aria-pressed={valores.cupoCredito === cupo}
                onClick={() => elegir('cupoCredito', cupo)}
                className={claseOpcion(valores.cupoCredito === cupo)}
              >
                {cupo >= 1000000 ? `$${cupo / 1000000} M` : `$${cupo / 1000} k`}
              </button>
            ))}
          </div>
          {!CUPOS.includes(valores.cupoCredito) && valores.cupoCredito ? (
            <p className="mt-1.5 text-meta text-neutro-600">Cupo actual: {formatoMoneda(valores.cupoCredito)}</p>
          ) : null}
        </div>
        <div>
          <p className="mb-1.5 text-meta font-semibold text-neutro-700">Día de corte</p>
          <div role="group" aria-label="Día de corte" className="grid grid-cols-4 gap-1.5">
            {CORTES.map((corte) => (
              <button
                key={corte.valor}
                type="button"
                aria-pressed={valores.diaCorte === corte.valor}
                onClick={() => elegir('diaCorte', corte.valor)}
                className={claseOpcion(valores.diaCorte === corte.valor)}
              >
                {corte.texto}
              </button>
            ))}
          </div>
        </div>
        {error ? <Alerta tipo="error">{error}</Alerta> : null}
      </div>
    </Modal>
  );
}

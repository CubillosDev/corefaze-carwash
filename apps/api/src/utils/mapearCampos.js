const seleccionarCampos = (objeto, claves) => {
  const resultado = {};
  claves.forEach((clave) => {
    if (Object.prototype.hasOwnProperty.call(objeto, clave)) {
      resultado[clave] = objeto[clave];
    }
  });
  return resultado;
};

const combinarCampos = (actual, cambios) => {
  const combinado = { ...actual };
  Object.keys(cambios).forEach((clave) => {
    if (cambios[clave] !== undefined) {
      combinado[clave] = cambios[clave];
    }
  });
  return combinado;
};

module.exports = { seleccionarCampos, combinarCampos };
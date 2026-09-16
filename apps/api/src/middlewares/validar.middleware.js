const { validationResult, matchedData } = require("express-validator");

const validar = (req, res, next) => {
  const resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    const errores = resultado.array().map((error) => ({ campo: error.path, mensaje: error.msg }));
    return res.status(400).json({ mensaje: "Datos invalidos", errores });
  }

  req.datosValidados = matchedData(req, { locations: ["body", "params", "query"] });
  return next();
};

module.exports = validar;
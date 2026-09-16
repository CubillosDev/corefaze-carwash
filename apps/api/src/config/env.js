require("dotenv").config();

const OBLIGATORIAS = ["PORT"];

const faltantes = OBLIGATORIAS.filter((variable) => !process.env[variable]);

if (faltantes.length > 0) {
  console.error(
    `Faltan variables de entorno obligatorias: ${faltantes.join(", ")}. ` +
      "Revisa tu archivo .env (usa .env.example como referencia)."
  );
  process.exit(1);
}

module.exports = {
  PORT: Number(process.env.PORT),
  NODE_ENV: process.env.NODE_ENV || "development",
};
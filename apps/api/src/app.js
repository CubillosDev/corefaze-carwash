const express = require("express");
const swaggerUi = require("swagger-ui-express");

const especificacionOpenApi = require("./docs/swagger");

const clientesRoutes = require("./routes/clientes.routes");
const vehiculosRoutes = require("./routes/vehiculos.routes");
const colaboradoresRoutes = require("./routes/colaboradores.routes");
const serviciosRoutes = require("./routes/servicios.routes");
const ordenesLavadoRoutes = require("./routes/ordenesLavado.routes");

const { manejarErrores, rutaNoEncontrada } = require("./middlewares/errores.middleware");

const app = express();

app.use(express.json());

app.get("/openapi.json", (req, res) => res.json(especificacionOpenApi));
app.use("/apidocs", swaggerUi.serve, swaggerUi.setup(especificacionOpenApi));

app.use("/api/clientes", clientesRoutes);
app.use("/api/vehiculos", vehiculosRoutes);
app.use("/api/colaboradores", colaboradoresRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/ordenes-lavado", ordenesLavadoRoutes);

app.get("/", (req, res) => res.json({ mensaje: "Car Wash API", documentacion: "/apidocs" }));

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
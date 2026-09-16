const app = require("./app");
const { PORT } = require("./config/env");

app.listen(PORT, () => {
  console.log(`Car Wash API escuchando en http://localhost:${PORT}`);
  console.log(`Documentacion Swagger en http://localhost:${PORT}/apidocs`);
});
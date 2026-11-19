# Datos de demostración

Scripts para cargar y quitar datos **ficticios** en un entorno local o de demostración. No cambian el
código de la API. Nunca los corras contra producción.

| Archivo | Para qué |
|---|---|
| `seed-demo.js` | Carga los datos de demostración. Ver el detalle en "Qué carga". |
| `borrar-demo.sql` | Borra solo lo que creó `seed-demo.js` y desactiva a los usuarios de demostración. |

## Qué carga

- 150 clientes, de los cuales 10 son empresas con crédito.
- 220 vehículos, de los cuales 40 son motos.
- 30 días de jornadas cerradas con sus órdenes.
- La jornada de hoy abierta, con 32 órdenes.
- La caja de hoy abierta con base de $ 150.000, dos egresos y parte de lo terminado ya cobrado. Lo que
  quedó en el patio de días anteriores se termina y se cobra hoy.
- Crédito: cupo, día de corte y contacto de cada empresa; vales en casi todos sus servicios
  entregados (verificados los de más de una semana) y pagos de lo verificado en cuatro empresas.
- 12 insumos con su movimiento inicial; dos quedan por debajo del mínimo.
- 5 descuentos de nómina en la quincena en curso.

## Antes de cargar

1. Supabase local con las migraciones aplicadas: `npx supabase start` y `npx supabase db reset`.
2. La API corriendo: `npm run dev:api`.
3. Un usuario superadmin con correo `@corefaze.demo`. Regístralo con `POST /api/auth/registro` y
   luego asígnale el rol. Ese dominio es la marca que usa `borrar-demo.sql` para encontrar los datos.
4. Un archivo de variables **fuera del repo** con estas variables:

| Variable | Valor |
|---|---|
| `DEMO_API_URL` | URL base de la API, por ejemplo `http://localhost:3000/api` |
| `DEMO_API_KEY` | La `API_KEY_WEB` de la API |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Correo y contraseña del superadmin de demostración |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Las que entrega `npx supabase status -o env` |

## Cargar

```bash
cd apps/api
node --env-file=<ruta-al-archivo> scripts/seed-demo.js
```

- **Es idempotente:** si lo corres otra vez, no duplica clientes (por correo), vehículos (por placa),
  jornadas (por fecha), órdenes de hoy, cobros de hoy, vales, pagos, insumos (por nombre) ni
  descuentos. Usa una semilla fija, así que siempre genera los mismos datos.
- **Qué entra por la API:** los clientes, los vehículos, la jornada de hoy y sus órdenes, la caja,
  el crédito, el inventario y los descuentos. Así el servidor aplica las reglas R1–R10 y calcula el
  valor.
- **Qué entra directo a la base:** las jornadas pasadas, porque la API solo abre la jornada del día.
  El valor de sus órdenes sale de `tarifas_servicio`.
- Si encuentra una jornada abierta de otro día, la cierra; si su caja seguía abierta, antes la cierra
  cuadrada (solo puede haber una caja abierta).
- **Córrelo al empezar el día de la demostración.** Las órdenes de hoy quedan con la hora en que corre
  el script (`creado_en` no se modifica), y la curva de ingresos del tablero las muestra a esa hora.
- **Marcas de los datos:** correos `@corefaze.demo` y observaciones que empiezan por `[DEMO]`.
- Carga menos de 1.000 órdenes porque la API todavía no pagina y PostgREST corta las consultas en
  1.000 filas.

## Borrar

```bash
docker exec -i supabase_db_corefaze-carwash psql -U postgres -d postgres < apps/api/scripts/borrar-demo.sql
```

Todo corre en una sola transacción:

1. Borra, en este orden, los cobros, egresos y cajas de las jornadas de demostración; los vales y
   detalles de pago; las órdenes `[DEMO]`; los pagos de crédito de las empresas de demostración; los
   códigos QR que generaron sus usuarios; los descuentos `[DEMO]` y los insumos con un movimiento
   `[DEMO]`. Esas tablas no dejan borrar por diseño: cada trigger `*_sin_eliminar` se desactiva y
   se vuelve a activar dentro de la misma transacción.
2. Borra las jornadas que abrieron los usuarios de demostración y quedaron sin órdenes.
3. Borra los vehículos y clientes `@corefaze.demo` que no tengan dependencias.
4. Reabre la jornada que había cerrado la carga.
5. Desactiva a los usuarios de demostración. No los borra.

La auditoría no se modifica. Si alguien liquidó una quincena con datos de demostración, la
liquidación se conserva (es inmutable).

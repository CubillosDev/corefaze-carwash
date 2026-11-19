# 0007 — Módulos del panel: caja, crédito con vales, inventario, QR de jornada y reportes

**Estado:** Aceptado (decisión de producto del 2026-11-19).

## Contexto

El panel web mostraba "Disponible próximamente" en Crédito, Usuarios y Reportes, y no tenía Caja, Nómina ni Inventario, que sí están en el diseño (`docs/diseno/`). El dueño del producto pidió que todo funcione y que se siga el diseño. Esta decisión cubre lo que faltaba en la base de datos. La API y el web van en sus propias ramas.

## Decisiones

### Caja

- Una caja por jornada (`cajas.jornada_id` único) y solo una abierta a la vez (`idx_cajas_una_abierta`). Se abre con una base en efectivo (`abrir_caja()`), sobre la jornada abierta.
- **El cobro es la entrega.** `registrar_cobro()` acepta solo órdenes `terminada` y las pasa a `entregada`. Es la misma transición de `transicionesOrden`, sin saltos (por eso no se cobra desde "En patio", aunque el diseño lo muestre). En la misma transacción fija el medio de pago real, que en el registro de la orden era el previsto, y deja el cobro en `cobros_caja`.
- A crédito exige la empresa (activa y con crédito, R8) y el número de vale. En efectivo puede guardar lo recibido y el cambio.
- **Sin descuento ni propina.** El valor sigue siendo el de la tarifa, que fija el servidor (R4).
- `cerrar_caja()` hace el arqueo: esperado = base + cobros en efectivo − egresos, contra lo contado; `diferencia` es una columna generada. `reabrir_caja()` limpia el arqueo, y el anterior queda en la auditoría.
- Egresos y cobros son inmutables, como `pagos_credito`.
- `ordenes_lavado.entregada_en` la fija un trigger al pasar a `entregada`. `authenticated` no la puede escribir, porque los permisos de columna de esa tabla son explícitos (ADR 0005).

### Crédito: cupo, corte y vales (amplía el ADR 0005)

El ADR 0005 dejó el crédito sin vales, cupo ni corte. El diseño sí los trae, y se decidió seguirlo:

- `clientes.cupo_credito`, `dia_corte` y `contacto`, solo para empresas. El cupo es un tope de referencia: superarlo avisa, no bloquea.
- `vales_credito`: un vale por orden a crédito, con número único. Al crearlo, la orden debe ser a crédito de esa empresa. Después solo cambia su verificación, y nunca si la orden ya se pagó.
- `registrar_pago_credito_con_medio()` exige que todas las órdenes tengan el vale verificado. Luego paga con `registrar_pago_credito()`, que conserva todas las validaciones del ADR 0005 (pago completo, sin abonos), y guarda el medio (transferencia, cheque o efectivo) en `detalles_pago_credito`.

### Inventario

`insumos` (stock y mínimo) y `movimientos_inventario` (inmutables). El stock solo cambia con `registrar_movimiento_inventario()` y nunca queda en negativo. Un insumo no se borra: se desactiva.

### QR de la jornada

`tokens_jornada` guarda el SHA-256 de un token de un solo uso con vencimiento. La API lo genera para el panel y lo canjea cuando la app móvil lo lee con la sesión de quien abre la jornada. Ningún rol de la aplicación lee la tabla.

### Reportes y resumen de nómina

Las sumas se hacen en SQL, con funciones de solo lectura que ejecuta solo `service_role`, para no depender del límite de 1.000 filas de PostgREST. `resumen_nomina_periodo()` calcula exactamente lo que daría `liquidar_quincena()` (mismo universo, `comision_colaborador_periodo()` y `descuentos_colaborador_periodo()`), sin escribir nada.

## Consecuencias

- Entregar una orden desde el tablero (`PATCH /estado`) sigue siendo posible, pero no deja cobro en la caja. El panel envía las órdenes terminadas a Caja para cobrarlas.
- `modulos_panel_test.sql` cubre las reglas, y `estructura_test.sql` incluye las 8 tablas nuevas.
- Una orden a crédito que se entregue sin pasar por Caja no tiene vale, y por la regla del diseño no se puede pagar hasta que se le registre uno verificado.

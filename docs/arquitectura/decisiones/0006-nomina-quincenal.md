# 0006 — Nómina quincenal: préstamos y liquidación (SCRUM-159)

**Estado:** Aceptado.

## Contexto

CarWash paga a sus colaboradores por quincena (1–15 y 16–último día del mes). Cada orden ya congela el `porcentaje_comision` del colaborador que la atendió (R4, Fase 1); esta decisión agrega lo que faltaba: sumar esas comisiones por periodo, permitir que un colaborador pida un préstamo contra su comisión en curso, y cerrar ("liquidar") la quincena con un pago único.

## Decisión

### Las 7 reglas, en SQL

1. **Quincena**: `public.limites_quincena(fecha)` (tipo `rango_fechas`, `inicio`/`fin`) — `IMMUTABLE` porque un `CHECK` constraint la exige (`liquidaciones_nomina_periodo_check`: `periodo_inicio`/`periodo_fin` deben ser *exactamente* los límites que devuelve la función para `periodo_inicio`).
2. **Comisión** = suma de `comision_orden(valor, porcentaje_comision)` de las órdenes NO canceladas del periodo. `comision_orden()` es la **regla única de redondeo**: por orden individual, entero en pesos, `round()` estándar de Postgres sobre `numeric` (mitad hacia arriba) — nunca se suma primero y se redondea al final, para que la suma de comisiones individuales (`liquidacion_colaboradores.comision`) siempre cuadre con el total (`liquidaciones_nomina.total_comision`). Ambas reglas viven en `comision_colaborador_periodo()`, la única fuente del cálculo — la usan `registrar_prestamo()`, `liquidar_quincena()` y la regla de cancelar (abajo), nunca se duplica.
3. **Neto** = `greatest(comisión − préstamos, 0)`.
4. **Préstamo** ≤ `min(comisión acumulada − préstamos ya pedidos en la quincena, tope_prestamo_colaborador si es > 0)`. `registrar_prestamo()` bloquea las filas de préstamos existentes del colaborador/quincena antes de calcular el disponible, para serializar préstamos concurrentes. No pasa saldo a la siguiente quincena (es un chequeo por quincena, no acumulativo entre periodos). Solo colaboradores `activo`.
5. **Liquidar**: `liquidar_quincena(p_inicio, p_fin, p_usuario_id, p_hoy default current_date)` exige periodo válido, `p_hoy >= p_fin` (zona horaria: el parámetro lo decide quien llama — la API, en `America/Bogota` — la función nunca usa `now()` directamente, por eso es parametrizable y comprobable con fechas pasadas), ninguna orden abierta en el periodo, y rechaza una segunda liquidación del mismo periodo vía el `UNIQUE (periodo_inicio, periodo_fin)`. Calcula el detalle por colaborador y los totales en **una sola sentencia** (CTEs de escritura encadenados: inserta el encabezado y, en la misma sentencia, el detalle que lo referencia) y marca `ordenes_lavado.liquidacion_id`/`prestamos_colaborador.liquidacion_id`.
6. **Tras liquidar, ninguna orden del periodo se cancela** (R12). Defensa en profundidad — ver más abajo, hoy inalcanzable en la práctica.
7. **Cancelar una orden que rompería la cobertura de préstamos se bloquea** (R13) — esta sí es alcanzable: vive en `proteger_orden_lavado()`, se dispara al cancelar una orden **abierta** (`registrada`/`en_proceso`), resta la comisión de la orden que se cancela de la comisión total de su quincena, y la compara contra los préstamos del colaborador en esa quincena que aún no se liquidaron (`liquidacion_id is null`).

### `proteger_orden_lavado()`, extendido otra vez

Ya traía (desde `agregar_pagos_credito.sql`, SCRUM-158) el caso especial de `pago_credito_id`. Esta migración lo extiende (mismo `create or replace`, conservando TODO lo anterior) para que **también** `liquidacion_id` pueda pasar de `null` a un valor sin que lo bloquee la regla de "orden cerrada" — necesario porque `liquidar_quincena()` marca órdenes `entregada` y `cancelada` por igual.

### `authenticated` tampoco toca `liquidacion_id`

Mismo mecanismo que `pago_credito_id` (ver ADR 0005): se revoca `INSERT`/`UPDATE` de tabla completa sobre `ordenes_lavado` y se vuelve a conceder por columnas explícitas, ahora excluyendo ambas columnas.

### Hallazgo real: `registrar_auditoria()` exige una columna `id`

El pedido original especificaba `liquidacion_colaboradores` con llave primaria compuesta `(liquidacion_id, colaborador_id)`. Al probarlo, `registrar_auditoria()` (existente, `activar_auditoria.sql`, no se edita) siempre lee `to_jsonb(new/old) ->> 'id'` para `auditoria.registro_id` (`NOT NULL`) — con una PK compuesta sin columna `id`, eso da `null` y la inserción en `auditoria` revienta. Se agregó una columna `id bigint generated always as identity` como PK real, y el par natural `(liquidacion_id, colaborador_id)` quedó como `UNIQUE` — conserva la invariante pedida (una fila por colaborador por liquidación) sin romper la auditoría genérica.

### `prestamos_colaborador` no es 100% inmutable (decisión propia, no pedida así)

A diferencia de `liquidaciones_nomina`/`liquidacion_colaboradores` (inmutables también para `service_role`, tal como se pidió), `prestamos_colaborador` necesita que `liquidar_quincena()` le marque `liquidacion_id` después de creado. Se agregó `proteger_prestamo_colaborador()` (mismo patrón que `proteger_orden_lavado`): permite **solo** que `liquidacion_id` pase de `null` a un valor; cualquier otro cambio (incluido el `valor` del préstamo) se rechaza. `DELETE` sigue bloqueado con `impedir_eliminacion()`, consistente con el resto del esquema ("nunca se borra").

### Funciones de solo lectura con `GRANT` a `authenticated` (excepción razonada al estándar)

El estándar de esta tarea pide `revoke execute ... from public, anon, authenticated` para toda función nueva. `limites_quincena()`, `comision_orden()` y `comision_colaborador_periodo()` son la única excepción: `proteger_orden_lavado()` las invoca desde dentro de un trigger que corre con los privilegios de quien dispara el `UPDATE` sobre `ordenes_lavado` — y, por las políticas RLS de `agregar_politicas_rls_por_rol.sql`, eso puede ser `authenticated` directamente (un `superadmin`/`administrador`/`soporte` cancelando una orden). Si esas tres funciones no tuvieran `GRANT` para `authenticated`, cualquier cancelación directa (fuera de la API) fallaría con "permission denied for function" en vez de evaluar la regla de negocio real. Como son de solo lectura y no exponen nada que esos roles no pudieran ya calcular consultando las tablas directamente, se les da `GRANT` a `authenticated` además de `service_role` — las RPC de escritura (`registrar_prestamo`, `liquidar_quincena`) siguen el estándar estricto (solo `service_role`).

## Fuera de alcance

- Un endpoint HTTP para estas funciones — este PR es solo de base de datos.
- Un reporte/vista de "nómina pendiente de liquidar" — se puede construir desde `apps/api` con el contrato ya existente.

## Consecuencias

- `proteger_orden_lavado()` ya lleva dos extensiones (`pago_credito_id`, `liquidacion_id`); cualquier columna futura de "solo vía RPC, incluso en una orden cerrada" debe seguir el mismo patrón (`to_jsonb(old) - columnas_permitidas = to_jsonb(new) - columnas_permitidas`), no inventar uno nuevo.
- `nomina_test.sql` cubre las 7 reglas, incluida la única regla realmente alcanzable hoy (R13), la inmutabilidad diferenciada entre las tres tablas, y los privilegios de cada función.

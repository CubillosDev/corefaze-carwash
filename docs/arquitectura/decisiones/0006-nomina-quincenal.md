# 0006 — Nómina quincenal: descuentos y liquidación (SCRUM-159)

**Estado:** Aceptado.

## Contexto

CarWash paga a sus colaboradores por quincena (1–15 y 16–último día del mes). Cada orden ya congela el `porcentaje_comision` del colaborador que la atendió (R4, Fase 1); esta decisión agrega lo que faltaba: sumar esas comisiones por periodo, permitir que un colaborador tenga descuentos contra su comisión en curso, y cerrar ("liquidar") la quincena con un pago único.

La primera versión de este PR solo restaba préstamos. Una revisión posterior comparó el resultado contra la planilla real (hoja T1) y encontró la fórmula completa:

```
NETO = TOTAL − PRÉSTAMOS − JABÓN − CAFÉ 1 − CAFÉ 2 − ABONOS − CXC − FONDO − MULTAS
```

Esta decisión se reescribió para reflejar esa fórmula. Decisión de negocio explícita: **una sola tabla de descuentos con una columna `tipo`**, no una tabla por categoría — agregar café/abono/fondo más adelante es ampliar un `CHECK`, no crear una tabla ni una migración de estructura nueva.

## Decisión

### Las reglas, en SQL

1. **Quincena**: `public.limites_quincena(fecha)` (tipo `rango_fechas`, `inicio`/`fin`) — `IMMUTABLE` porque un `CHECK` constraint la exige (`liquidaciones_nomina_periodo_check`).
2. **Comisión** = suma de `comision_orden(valor, porcentaje_comision)` de las órdenes NO canceladas del periodo. `comision_orden()` es la **regla única de redondeo**: por orden individual, entero en pesos, `round()` estándar de Postgres (mitad hacia arriba) — nunca se suma primero y se redondea al final. Vive en `comision_colaborador_periodo()`, la única fuente del cálculo.
3. **Descuentos**: una sola tabla, `descuentos_colaborador`, con columna `tipo` (`CHECK in ('prestamo', 'jabon', 'multa', 'cxc')` — ver "Fuera de alcance" para ampliarlo). `descuentos_colaborador_periodo(p_colaborador_id, p_inicio, p_fin, p_tipo default null)` es la única fuente del cálculo: `p_tipo` null suma TODOS los tipos (lo que usa `liquidar_quincena()` para el total de descuentos); un tipo puntual (p. ej. `'prestamo'`) suma solo ese (lo que usa el límite de préstamo y R13/R14, que **solo** protegen préstamos).
4. **Solo `'prestamo'` tiene límite**: `valor <= min(comisión acumulada − TODOS los descuentos ya registrados en la quincena, tope_prestamo_colaborador si es > 0)`. Jabón, multa y cxc se registran **sin ese límite** — por diseño pueden superar la comisión; lo que falte lo absorbe `saldo_pendiente` (regla 6). Solo colaboradores `activo`. `registrar_descuento(p_colaborador_id, p_tipo, p_valor, p_fecha, p_usuario_id, p_observacion default null)` reemplaza a `registrar_prestamo()` (ya no existe): un solo punto de entrada para los 4 tipos.
5. **Liquidar**: `liquidar_quincena(p_inicio, p_fin, p_usuario_id, p_hoy default (now() at time zone 'America/Bogota')::date)` exige periodo válido, `p_hoy >= p_fin`, **que no exista ninguna liquidación de un periodo posterior** (regla 7), ninguna orden abierta en el periodo, y rechaza una segunda liquidación del mismo periodo vía `UNIQUE (periodo_inicio, periodo_fin)`.
6. **Neto y saldo_pendiente**: `neto = greatest(comisión − descuentos, 0)`; `saldo_pendiente = greatest(descuentos − comisión, 0)`. Invariante: `neto = comisión − descuentos + saldo_pendiente` (exactamente una de las dos partes es cero). El detalle por colaborador se calcula sobre la **unión** de quienes tienen órdenes O descuentos en el periodo — un colaborador con jabón pero sin ninguna orden en la quincena igual aparece, con `servicios = producido = comisión = 0`.
7. **El saldo_pendiente se convierte automáticamente en un descuento `cxc` de la quincena SIGUIENTE** (`fecha = periodo_fin + 1`, que es exactamente el primer día de la quincena que sigue), en la **misma sentencia** que crea la liquidación — nunca se pierde un peso. Como ese `cxc` cae en el periodo siguiente, **no se puede liquidar una quincena anterior a una ya liquidada**: el `cxc` que generaría caería en un periodo que ya está cerrado y no hay ninguna liquidación futura que lo recoja. La cascada no se detiene sola: si la quincena siguiente tampoco tiene comisión suficiente, su propio `saldo_pendiente` (que ya incluye el `cxc` arrastrado) se vuelve a convertir en otro `cxc` para la quincena después de esa — hasta que la comisión alcance a cubrirlo.
8. **Tras liquidar, ninguna orden del periodo se cancela** (R12) **ni se reasigna a otro colaborador** (R12b, hallazgo de revisión — ver más abajo).
9. **Cancelar o reasignar una orden abierta que rompería la cobertura de préstamos se bloquea** (R13/R14) — viven en `proteger_orden_lavado()`, SOLO consideran descuentos tipo `'prestamo'` (jabón/multa/cxc no protegen nada aquí, por diseño pueden superar la comisión).

### Hallazgo de revisión: reasignar una orden `terminada` después de liquidar (R12b)

La primera versión solo bloqueaba **cancelar** una orden ya liquidada (R12); reasignar su colaborador no tenía ninguna protección. Una orden `terminada` no es "abierta" (`registrada`/`en_proceso`) ni está en la lista de "cerrada" que bloquea toda modificación (`entregada`/`cancelada`) — así que, tras liquidar, una orden `terminada` podía reasignarse a otro colaborador sin que nada lo impidiera, dejando la liquidación ya **congelada** describiendo un colaborador que ya no es quien aparece en la orden.

Arreglo: en `proteger_orden_lavado()`, como el PRIMER chequeo de la función (antes incluso del caso especial de `pago_credito_id`/`liquidacion_id`):

```sql
if new.colaborador_id <> old.colaborador_id and old.liquidacion_id is not null then
  raise exception 'Una orden de un periodo de nómina ya liquidado no se puede reasignar a otro colaborador'
    using errcode = 'check_violation';
end if;
```

Sin importar el `estado` de la orden. No hay conflicto con el caso especial de `pago_credito_id`/`liquidacion_id`: ese caso nunca toca `colaborador_id`.

### Bug de zona horaria: `current_date` es UTC, el negocio es `America/Bogota`

`p_hoy` ya NO usa `current_date` como default. Supabase corre en UTC; Bogotá es UTC-5. A las 7 p. m. hora Bogotá del día 15, ya son las 00:00 UTC del día 16 — `current_date` (UTC) devuelve el 16 aunque en Bogotá todavía sea el 15 por 5 horas más. Peor: a las 7 p. m. hora Bogotá del día **14**, ya son las 00:00 UTC del **15** — `current_date` (UTC) devolvería el 15 (igual al `periodo_fin` de la primera quincena), permitiendo liquidar hasta 5 horas **antes** de que el día de negocio 15 en Bogotá siquiera empezara.

Nuevo default: `(now() at time zone 'America/Bogota')::date`. Verificado con la conversión directa (sin depender de `now()` real en la prueba): `(timestamptz '2026-01-16 00:30:00+00' at time zone 'America/Bogota')::date = '2026-01-15'` — a esa hora UTC (19:30 en Bogotá del día 15), la fecha de negocio sigue siendo el 15, no el 16. `nomina_test.sql` también comprueba, vía `pg_get_function_arguments()`, que el texto del default menciona `America/Bogota` (no es solo que el resultado final cuadre por casualidad).

Se revisó el resto de esta migración y la de `pagos_credito` por otros usos de `current_date`/`now()` que dependieran de la fecha de negocio: no hay ninguno más. Los `default now()` en `creado_en`/`liquidado_en`/`pagado_en` son solo marcas de "cuándo pasó esto" (timestamptz, se muestran ya convertidas por el cliente), no comparaciones de fecha de negocio — no necesitan este tratamiento.

### `proteger_orden_lavado()`, extendido otra vez

Ya traía (desde `agregar_pagos_credito.sql`, SCRUM-158) el caso especial de `pago_credito_id`. Esta migración lo extiende (mismo `create or replace`, conservando TODO lo anterior) para que **también** `liquidacion_id` pueda pasar de `null` a un valor sin que lo bloquee la regla de "orden cerrada" — necesario porque `liquidar_quincena()` marca órdenes `entregada`, `cancelada` y `terminada` por igual.

### `authenticated` tampoco toca `liquidacion_id`

Mismo mecanismo que `pago_credito_id` (ver ADR 0005): se revoca `INSERT`/`UPDATE` de tabla completa sobre `ordenes_lavado` y se vuelve a conceder por columnas explícitas, ahora excluyendo ambas columnas.

### Hallazgo real: `registrar_auditoria()` exige una columna `id`

El pedido original especificaba `liquidacion_colaboradores` con llave primaria compuesta `(liquidacion_id, colaborador_id)`. Al probarlo, `registrar_auditoria()` (existente, `activar_auditoria.sql`, no se edita) siempre lee `to_jsonb(new/old) ->> 'id'` para `auditoria.registro_id` (`NOT NULL`) — con una PK compuesta sin columna `id`, eso da `null` y la inserción en `auditoria` revienta. Se agregó una columna `id bigint generated always as identity` como PK real, y el par natural `(liquidacion_id, colaborador_id)` quedó como `UNIQUE`.

### `descuentos_colaborador` no es 100% inmutable (decisión propia, no pedida así)

A diferencia de `liquidaciones_nomina`/`liquidacion_colaboradores` (inmutables también para `service_role`), `descuentos_colaborador` necesita que `liquidar_quincena()` le marque `liquidacion_id` después de creado. `proteger_descuento_colaborador()` (mismo patrón que `proteger_orden_lavado`): permite **solo** que `liquidacion_id` pase de `null` a un valor; cualquier otro cambio se rechaza. `DELETE` sigue bloqueado con `impedir_eliminacion()`.

### Funciones de solo lectura con `GRANT` a `authenticated` (excepción razonada al estándar)

El estándar de esta tarea pide `revoke execute ... from public, anon, authenticated` para toda función nueva. `limites_quincena()`, `comision_orden()`, `comision_colaborador_periodo()`, `descuentos_colaborador_periodo()` y `validar_cobertura_prestamos_colaborador()` son la excepción: `proteger_orden_lavado()` las invoca desde dentro de un trigger que corre con los privilegios de quien dispara el `UPDATE` sobre `ordenes_lavado` — y, por las políticas RLS de `agregar_politicas_rls_por_rol.sql`, eso puede ser `authenticated` directamente. Si esas funciones no tuvieran `GRANT` para `authenticated`, cualquier cancelación/reasignación directa (fuera de la API) fallaría con "permission denied for function" en vez de evaluar la regla de negocio real. Como son de solo lectura, se les da `GRANT` a `authenticated` además de `service_role` — las RPC de escritura (`registrar_descuento`, `liquidar_quincena`) siguen el estándar estricto (solo `service_role`). `clave_bloqueo_quincena()` NO lleva esta excepción: solo la invocan las dos RPC de escritura, ya `service_role`-only.

### Candados de aviso (`pg_advisory_xact_lock`) entre `registrar_descuento()` y `liquidar_quincena()`

Ambas funciones toman el mismo candado — `pg_advisory_xact_lock(public.clave_bloqueo_quincena(periodo_inicio))` — **antes** de verificar si la quincena ya fue liquidada. Sin el candado, ambas transacciones podrían leer "no liquidada todavía" al mismo tiempo y proceder juntas, abriendo una ventana de carrera.

### El ejemplo de la planilla real (colaborador 402)

`nomina_test.sql` reproduce el caso exacto que detectó la revisión: comisión 811.040, préstamo 120.000, jabón 153.500, multa 10.000 → `811040 − 120000 − 153500 − 10000 = 527540`, `saldo_pendiente = 0` (la comisión cubre todo). Junto a un segundo caso (colaborador 409: comisión 50.000, préstamo 30.000, jabón 40.000) donde los descuentos SÍ superan la comisión — `neto = 0`, `saldo_pendiente = 20.000`, y ese saldo se verifica entrando como descuento `cxc` de la quincena siguiente, con la invariante `neto = comisión − descuentos + saldo_pendiente` comprobada sobre los valores reales de la fila, no hardcodeada.

## Fuera de alcance

- Ampliar el `CHECK` de `tipo` a café (1 y 2), abono y fondo — la fórmula real de la planilla los incluye, pero no se pudieron validar contra datos reales en esta revisión. Es una migración **nueva** (no se edita `descuentos_colaborador_tipo_check`), de una sola línea: `alter table descuentos_colaborador drop constraint descuentos_colaborador_tipo_check, add constraint descuentos_colaborador_tipo_check check (tipo in (...)));`. El desglose por tipo ya es consultable (`descuentos_colaborador` por `liquidacion_id`); no hace falta ninguna columna nueva en `liquidacion_colaboradores`.
- Un endpoint HTTP para estas funciones — este PR es solo de base de datos.
- Un reporte/vista de "nómina pendiente de liquidar" — se puede construir desde `apps/api` con el contrato ya existente.

## Consecuencias

- `proteger_orden_lavado()` ya lleva dos extensiones del carve-out (`pago_credito_id`, `liquidacion_id`) y ahora también R12b como su primer chequeo; cualquier columna futura de "solo vía RPC, incluso en una orden cerrada" debe seguir el mismo patrón del carve-out, no inventar uno nuevo.
- Cualquier nueva regla de "esto le quita comisión al colaborador anterior" (cancelar, reasignar, y lo que venga después) debe reusar `validar_cobertura_prestamos_colaborador()`, y sigue filtrando SOLO por `tipo = 'prestamo'` — nunca se debe ampliar esa validación a los demás tipos de descuento sin una decisión de negocio explícita (jabón/multa/cxc pueden superar la comisión por diseño).
- Cualquier cálculo de "cuánto debe este colaborador en este periodo" (de cualquier tipo o de un tipo puntual) debe reusar `descuentos_colaborador_periodo()`, nunca reimplementar la suma.
- `nomina_test.sql` cubre las reglas completas: el caso real de la planilla, descuentos que superan la comisión y su `cxc` en cascada, un colaborador con descuentos pero sin órdenes, el límite de préstamo considerando otros descuentos ya registrados, jabón/multa sin límite, R13/R14 ignorando todo lo que no sea préstamo, la reasignación bloqueada tras liquidar (R12b), que no se puede liquidar un periodo anterior a uno ya liquidado, la zona horaria del default de `p_hoy`, la inmutabilidad diferenciada entre las tres tablas, y los privilegios de cada función.

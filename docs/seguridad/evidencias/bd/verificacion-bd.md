# Verificación de la base de datos (Supabase local)

Consultas de solo lectura del README 11 (Verificaciones 01, 04 y 07), adaptadas a Corefaze. Fecha: 2026-11-23.

## V01 · RLS habilitado en cada tabla de public

```
tabla | rls_habilitado | rls_forzado
auditoria | t | f
cajas | t | f
clientes | t | f
cobros_caja | t | f
colaboradores | t | f
descuentos_colaborador | t | f
detalles_pago_credito | t | f
egresos_caja | t | f
insumos | t | f
jornadas | t | f
liquidacion_colaboradores | t | f
liquidaciones_nomina | t | f
movimientos_inventario | t | f
ordenes_lavado | t | f
pagos_credito | t | f
parametros_negocio | t | f
reaperturas_jornada | t | f
servicios | t | f
tarifas_servicio | t | f
tokens_jornada | t | f
usuarios | t | f
vales_credito | t | f
vehiculos | t | f
```

## V07a · Políticas RLS por tabla

```
tabla | politicas | comandos
auditoria | 1 | SELECT
cajas | 1 | SELECT
clientes | 4 | DELETE,INSERT,SELECT,UPDATE
cobros_caja | 1 | SELECT
colaboradores | 4 | DELETE,INSERT,SELECT,UPDATE
descuentos_colaborador | 1 | SELECT
detalles_pago_credito | 1 | SELECT
egresos_caja | 1 | SELECT
insumos | 1 | SELECT
jornadas | 3 | INSERT,SELECT,UPDATE
liquidacion_colaboradores | 1 | SELECT
liquidaciones_nomina | 1 | SELECT
movimientos_inventario | 1 | SELECT
ordenes_lavado | 3 | INSERT,SELECT,UPDATE
pagos_credito | 1 | SELECT
parametros_negocio | 2 | SELECT,UPDATE
reaperturas_jornada | 2 | INSERT,SELECT
servicios | 4 | DELETE,INSERT,SELECT,UPDATE
tarifas_servicio | 4 | DELETE,INSERT,SELECT,UPDATE
usuarios | 2 | SELECT,UPDATE
vales_credito | 1 | SELECT
vehiculos | 4 | DELETE,INSERT,SELECT,UPDATE
```

## V07b · Ninguna política universal (USING true) para anon

```
tablename | policyname | roles | qual
```

## V07c · Roles de la Data API y BYPASSRLS

```
rolname | rolcanlogin | rolbypassrls
anon | f | f
authenticated | f | f
authenticator | t | f
postgres | t | t
service_role | f | t
```

## V07d · Privilegios de anon y authenticated sobre tablas de public

```
grantee | tablas | privilegios
authenticated | 21 | DELETE,INSERT,SELECT,UPDATE
```

## V07e · Funciones de public que anon puede ejecutar

```
proname
```

## Auditoría y borrado

```
tabla | disparador_auditoria | impide_borrar
realtime.subscription | 0 | 0
storage.buckets | 0 | 0
storage.objects | 0 | 0
usuarios | 1 | 0
colaboradores | 1 | 0
servicios | 1 | 0
tarifas_servicio | 1 | 0
clientes | 1 | 0
vehiculos | 1 | 0
jornadas | 1 | 0
reaperturas_jornada | 1 | 0
ordenes_lavado | 1 | 1
parametros_negocio | 1 | 0
auditoria | 2 | 0
pagos_credito | 1 | 0
liquidaciones_nomina | 1 | 0
descuentos_colaborador | 1 | 0
liquidacion_colaboradores | 1 | 0
vales_credito | 1 | 0
detalles_pago_credito | 1 | 0
cajas | 1 | 0
egresos_caja | 1 | 0
cobros_caja | 1 | 0
insumos | 1 | 0
movimientos_inventario | 1 | 0
tokens_jornada | 1 | 0
```

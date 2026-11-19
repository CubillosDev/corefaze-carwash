# Corefaze CarWash · App móvil de recepción

App Flutter para registrar los vehículos que llegan al lavadero desde el celular. Sigue el diseño
"Recepción Móvil" y trabaja contra la API de Corefaze (`apps/api`), con las mismas reglas del panel
web.

## Qué hace

1. **Ingreso** con correo y contraseña. Las cuentas pendientes ven un aviso. La sesión se guarda en
   el almacén cifrado del sistema (Keystore en Android); en el navegador vive solo en memoria.
2. **Recepción**: estado de la jornada, la acción de registrar un ingreso y lo que entró hoy.
3. **Abrir la jornada** leyendo con la cámara el QR que muestra el panel en Inicio
   (`POST /api/jornadas/qr/canje`). Si no hay cámara, se abre sin código.
4. **Placa**: se escribe sobre la placa amarilla y se valida (carro `ABC123`, moto `ABC12D`).
5. **Consulta** en Corefaze: vehículo, dueño, historial (visitas, último servicio, servicio habitual)
   y catálogo.
6. **Nuevo ingreso**: vehículo y dueño (si la placa es nueva), tipo, servicio por número, colaborador,
   pago previsto y estado de recepción (avisos y nota).
7. **Confirmación** con el turno y el valor que calculó el servidor.

## Reglas que respeta

- La app nunca envía el valor ni el estado de la orden: el servidor calcula el valor (R4) y toda
  orden nace registrada.
- Solo ofrece colaboradores activos (R2) y servicios activos con tarifa para el tipo de vehículo (R3).
- El lavado de motor (servicios 5 a 8) exige la autorización del cliente (R7).
- El crédito solo aparece si el dueño es una empresa activa con crédito (R8).
- El turno es único por fecha (R5): si otro equipo lo tomó a la vez, pide el siguiente.
- Soporte consulta, pero no registra clientes ni vehículos nuevos.

## Diferencias con el diseño (decididas con el equipo)

| En el diseño | En la app | Por qué |
|---|---|---|
| Escanear la placa con la cámara | La placa se escribe | El OCR está fuera del alcance |
| Consultar el RUNT | Búsqueda en la base de Corefaze | El RUNT no tiene una API pública |
| Varios servicios por ingreso | Un servicio por orden | Una orden tiene un solo servicio |
| Fotos del estado de recepción | Avisos y nota en las observaciones | No hay dónde guardar fotos |
| Sede en la cabecera | Estado de la jornada | Un solo lavadero |
| Sin medio de pago | "Pago previsto" (se confirma en caja) | La API lo exige al registrar |
| Sin ingreso ni QR | Ingreso y apertura con QR | Sin ellos la app no se conecta al sistema |

## Configuración

La URL de la API y su llave entran al compilar. Copia el ejemplo **fuera del control de versiones**
(`config/*.json` está en `.gitignore`):

```bash
cp config/desarrollo.example.json config/desarrollo.json
```

| Variable | Valor |
|---|---|
| `API_URL` | Emulador de Android: `http://10.0.2.2:3100/api`. Celular en la misma red: `http://<IP del PC>:3100/api` |
| `API_KEY` | La `API_KEY_MOVIL` de la API (identifica a la app; no es un secreto de servidor) |

En el navegador, la API debe permitir el origen de la app (`ALLOWED_ORIGIN`).

## Correr

```bash
flutter pub get
flutter run --dart-define-from-file=config/desarrollo.json            # Android o Chrome
flutter build apk --debug --dart-define-from-file=config/desarrollo.json
flutter build web --no-web-resources-cdn --dart-define-from-file=config/desarrollo.json
```

- Las variantes debug y profile de Android permiten HTTP para la API local. La de publicación
  exige HTTPS.
- `--no-web-resources-cdn` empaqueta CanvasKit en el build: nada se descarga de un CDN.

## Calidad

```bash
flutter analyze
flutter test                                   # unidad, widgets y el recorrido completo
flutter test integration_test -d DISPOSITIVO   # el mismo recorrido en un dispositivo
```

Las pruebas usan una API falsa en memoria (`test/apoyo/api_falsa.dart`). `test/core/constants/dominio_test.dart`
verifica que las reglas copiadas coincidan con `packages/contratos/dominio.json`.

## Estructura

```
lib/
  app/        app, dependencias, navegación y tema (única fuente de colores, radios y textos)
  core/       configuración, constantes del dominio, cliente HTTP, utilidades y widgets comunes
  features/   autenticacion, jornadas, ordenes_lavado, vehiculos, clientes, servicios, colaboradores
              cada uno con data/ (modelos y repositorios) y presentation/ (controladores y pantallas)
```

Las fuentes DM Sans y JetBrains Mono van dentro de la app (licencia OFL en `assets/fonts/`).

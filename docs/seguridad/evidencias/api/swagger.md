# Esquemas de seguridad en Swagger (R11-25)

| Esquema | Tipo | Dónde viaja |
|---|---|---|
| ApiKeyAuth | apiKey | header: X-API-Key |
| BearerAuth | http (bearer) | Authorization |

Seguridad global: ApiKeyAuth

| Operaciones documentadas | Con BearerAuth | Con ApiKeyAuth | Sin credencial |
|---|---|---|---|
| 73 | 69 | 72 | 1 (GET /api/salud) |

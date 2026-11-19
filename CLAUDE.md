# Reglas permanentes del repositorio

## Git

- Autor y committer de cada commit: `olarthedev <olarthedev@gmail.com>`. Nunca `Co-Authored-By` ni mención
  alguna a una herramienta de IA, ni en el mensaje de un commit ni en el título o la descripción de un PR.
- Conventional Commits, con scope (`feat(api): ...`, `fix(web): ...`, `docs(bd): ...`).
- Ramas: `<tipo>/CW_<COMPONENTE>_<Integrante>_<Tarea>` (por ejemplo
  `feature/CW_WEB_DUrbano_UsuariosAdministracion`).
- Los PR van a `develop`. El merge, tanto de un PR a `develop` como de `develop` a `main`, siempre es
  "Create a merge commit" — nunca squash ni rebase.

## Supabase remoto

- Nunca se toca el proyecto Supabase remoto desde aquí: nada de `supabase login`, `link`, `db push`,
  `db reset --linked`, `db pull`, `migration repair` ni `db dump --linked`. Esas operaciones las hace solo
  el titular del proyecto, desde su propia máquina. Checklist de recreación:
  [`docs/despliegue/README.md`](docs/despliegue/README.md#proyecto-supabase-titular-y-recreación).
- Al cerrar una fase de trabajo sobre `supabase/`, se entrega la lista exacta de migraciones nuevas, en
  orden (mismo nombre de archivo que en `supabase/migrations/`).
- Nunca se edita una migración ya aplicada: todo cambio es una migración nueva, con una fecha posterior.
  Tampoco se le cambia la fecha a una migración existente ni se reordena.
- Toda función nueva: `revoke execute on function ... from public, anon, authenticated;` y
  `grant execute on function ... to service_role;` (también a `authenticated`, pero solo si una política
  RLS la invoca directamente — ver `supabase/README.md`, sección "Privilegios EXECUTE de funciones").

## Gate antes de reportar cualquier entrega

Se corre lo que aplique según qué se tocó, y se reporta la salida real y completa — nunca se da un gate por
pasado sin haberlo corrido:

```bash
npx supabase db reset && npx supabase test db && npx supabase db lint   # si se tocó supabase/
npm run format && npm run lint && npm test --workspace apps/api        # si se tocó apps/api
npm run lint && npm test --workspace apps/web                          # si se tocó apps/web
```

`apps/web` todavía no tiene script `format` (sin Prettier configurado ahí) — no se inventa el comando,
se reporta la salida de `lint`/`test` tal cual hasta que ese script exista.

## Otras reglas

- Nunca secretos (llaves, contraseñas, tokens) en el repositorio.
- Ante una regla de negocio ambigua, se pregunta antes de decidir; las reglas de dominio vigentes están en
  los ADR 0005 a 0007 (`docs/arquitectura/decisiones/`).

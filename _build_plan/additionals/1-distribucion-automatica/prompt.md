# Adicional 1 — Distribución automática de equipos

## Contexto

- Lee `@_build_plan/prd.html` para el contexto completo del proyecto.
- Lee las bitácoras de los hitos (`@_build_plan/milestones/*/milestone-log.md`) para saber qué ya
  existe. Lo que toca este adicional lo construyó el **hito 3**.
- El armado de equipos vive en `app/models/team_builder.rb` y las pantallas en
  `app/javascript/pages/sabados/`, con los helpers compartidos en
  `app/javascript/pages/sabados/teams.ts`.

## El encargo, en palabras del usuario

> «Sería mejor que en base a los jugadores que se seleccionan para armar los equipos, dependiendo
> de la cantidad te podría armar las opciones de distribución mejor balanceado con el sistema Elo
> por N equipos. Si hay 1 de más se tiene que hacer lo más balanceado según el sistema. E.g. hay
> 21 jugadores: Equipos: 2, 3, 4, … N. Y al momento de abrir una opción te hace la mejor
> distribución. E.g. Equipos: 3 - 7 por equipo. Confirmas la cantidad de equipos y ahí podrías
> hacer cambios o regenerar la distribución n veces respetando el sistema para que quede
> balanceado.»

## Tu tarea

1. Con los asistentes ya palomeados, mostrar las opciones viables de reparto —de 2 hasta el tope
   actual de 6 equipos, que lo marca `Team::COLORS` / `TEAM_COLORS`— cada una con su tamaño por
   equipo, incluyendo el caso con resto («21 jugadores en 4 equipos: 6, 5, 5, 5»). Reusar el
   `teamSizes(attendees, teamCount)` que ya existe en `teams.ts`.
2. Al elegir una opción, generar la mejor distribución que logre el balanceador para ese número de
   equipos. El balance ya se mide con `balance()` en `teams.ts` y el reparto lo hace `TeamBuilder`.
   No inventar un segundo sistema de balanceo en paralelo al que ya existe.
3. Tras confirmar el número de equipos, el administrador debe poder seguir moviendo jugadores a
   mano (como hoy) y además regenerar la distribución las veces que quiera, obteniendo repartos
   distintos pero igual de balanceados — no el mismo resultado determinista una y otra vez.

## Está listo cuando

El flujo funciona de punta a punta en el navegador, `mise exec -- bin/rails test` pasa al 100%
(con prueba propia del balanceador: número exacto, con resto, y el tope de 6 equipos),
`npm run check` pasa, `mise exec -- bin/rubocop` pasa sin ofensas, y hay capturas en
`tmp/screenshots/` del selector de opciones y de una distribución generada, en claro y oscuro.

## Notas de entorno

Ruby 3.3.6 vía mise y el shell no lo activa solo: antepón `mise exec --` a `bin/rails` y
`bin/rubocop`. Para verificar en el navegador **nunca el puerto 3000** (es del usuario): la
configuración `draftsabado-verify` de `.claude/launch.json` levanta en 4000/4036.

# Adicional 1 — Distribución automática de equipos · bitácora

## Qué hay de nuevo en la app

- **La app te dice cómo se reparten los que llegaron.** Debajo del palomeo ya no hay botones de
  «2 equipos / 3 equipos» a ciegas: hay una lista de opciones de reparto, y cada una dice cómo
  quedaría. «3 equipos — 6, 5, 5». «4 equipos — 4 por equipo».
- **Solo aparecen las opciones que de verdad se pueden jugar.** Con 16 palomeados salen de 2 a 6
  equipos; con 7, solo 2 y 3. Si no alcanza ni para dos equipos, la app lo dice en vez de dejarte
  un botón que no funciona.
- **El caso del que sobra ya se ve antes de generar.** Cuando el número no se reparte parejo, la
  opción lo muestra tal cual va a quedar («6, 5, 5») en lugar de avisarte después.
- **Un toque en la opción arma los equipos.** Ya no hay que elegir primero y después apretar
  «Generar equipos»: tocas «4 equipos» y la app arma la mejor distribución que logra para cuatro.
- **Sigue marcada la opción recomendada** según cuántos llegaron, pero las demás están ahí para
  tomarlas.
- **Regenerar ahora sí da un reparto distinto.** Antes, con un grupo parejo, podía devolver una y
  otra vez exactamente el mismo acomodo. Ahora cambia de verdad, y queda igual de parejo.
- Mover e intercambiar a mano, deshacer, editar asistencia y confirmar funcionan igual que antes.

## Qué se construyó

Sin migraciones, sin rutas nuevas y sin tocar el controlador: el reparto ya lo sabía hacer
`TeamBuilder` desde el hito 3 para cualquier número de equipos. Lo que faltaba era ofrecerlo.

**`app/javascript/pages/sabados/teams.ts`**
- `sizeLabel(sizes)` — nuevo, junto a `teamSizes()`: devuelve `"7 por equipo"` cuando todos los
  equipos miden igual, o `"6, 5, 5, 5"` cuando alguien sobra. Es la única pieza nueva de texto;
  la aritmética sigue siendo la de `teamSizes()`.

**`app/javascript/pages/sabados/Show.tsx`**
- Las opciones se calculan en el render:
  `team_counts.filter((count) => checked.length >= count * 2).map((count) => ({ count, sizes: teamSizes(checked.length, count) }))`.
  El tope sale de la prop `team_counts` (`Matchday::TEAM_COUNTS`, que es `2..Team::COLORS.size`),
  así que si mañana hay un séptimo color, aparece una séptima opción sola.
- El `<fieldset>` «Equipos» se volvió **«Distribución»**, se movió **debajo** de la lista de
  palomeo (que es por donde va bajando el pulgar) y cada opción es un botón con el número de
  equipos, su reparto y el badge «Sugerido» en la recomendada.
- `onGenerate` ahora recibe el número de equipos: tocar una opción **es** generar. Se fueron el
  estado `teamCount`, el botón «Generar equipos», la barra fija de abajo de esa pantalla y el
  aviso «No se reparte parejo: quedan 8, 7, 7» (ahora cada opción ya lo dice). «Cancelar», cuando
  se está editando la asistencia de una jornada ya armada, quedó como botón normal al final.
- «Regenerar» llama al mismo `generate(matchday.team_count)`.

**`app/models/team_builder.rb`** — un operador:
```ruby
candidate <= best   # antes: candidate < best
```
Los 2000 intentos de intercambio aceptaban solo los que **bajaban** el costo, así que el
algoritmo se clavaba en el primer acomodo óptimo que encontrara y, con un grupo parejo, siempre
era el mismo. Aceptando también los que empatan, sigue sin empeorar nunca pero se pasea entre los
repartos que son igual de parejos — que es justo lo que «Regenerar» promete.

**`test/models/team_builder_test.rb`** — tres pruebas nuevas:
- 21 jugadores en **cada** `Matchday::TEAM_COUNTS` (de 2 a 6): tamaños exactos y diferencia de
  promedios por debajo de 0.6.
- 21 jugadores en 4 equipos salen 6, 5, 5, 5.
- Regenerar 5 veces el mismo grupo no devuelve siempre el mismo reparto, y los cinco quedan
  parejos.

## Decisiones tomadas que no estaban en el PRD

1. **El balanceo se quedó completo en `TeamBuilder`.** El frontend solo pide y muestra: calcula
   tamaños con `teamSizes()` para pintar las opciones, pero quién va con quién lo decide el
   servidor. Era el riesgo obvio del encargo —acabar con dos balanceadores que no coinciden— y se
   evitó.
2. **Tocar una opción genera, en vez de previsualizar las cinco.** Previsualizar todas pedía
   correr el balanceador una vez por opción en cada render. El costo de esta decisión: ver el
   reparto de otra opción es un viaje al servidor por opción. En la cancha se elige una.
3. **Los tamaños que muestra la opción son el conjunto, no el orden por color.** «6, 5, 5» dice
   que un equipo lleva seis, pero no cuál: el que se queda con el de más depende del reparto.
4. **Se quitó el aviso «No se reparte parejo»** porque ahora cada opción enseña su reparto antes
   de generar, y repetirlo después sobra.
5. **El mínimo sigue siendo `team_count * 2`** (hito 3, decisión 11). Ahora además es lo que
   decide qué opciones se ven, en vez de dejar botones que el servidor iba a rechazar.
6. **La sugerencia no cambió:** `Matchday::PLAYERS_PER_TEAM` (6) sigue dando el número
   recomendado y sigue siendo solo eso, una sugerencia.
7. **La sección «Hitos» del PRD no se tocó.** Es el plan original y vale como registro histórico;
   los cambios se aplicaron a la portada, las tarjetas de funciones y el modelo de datos, que son
   lo que describe la app de hoy.

## Lo que la siguiente sesión necesita saber

- **El tope de equipos es `Team::COLORS`**, encadenado: `Matchday::TEAM_COUNTS` sale de ahí, el
  controlador valida contra él, la prop `team_counts` lo lleva a la pantalla y las opciones salen
  de la prop. Agregar un color alcanza; no hay números sueltos que sincronizar. Lo que sí hay que
  tocar al agregarlo es `TEAM_COLORS` en `teams.ts`, que es el espejo manual de la lista de Ruby.
- **`TeamBuilder#overall` / `#physical` siguen siendo el único punto por donde entra la
  puntuación** (hoy `Scoreboard` + `player.elo`). El resto del algoritmo —porteros, serpiente,
  intercambios, costo— no sabe de dónde salen los números.
- **`improve` ahora acepta empates.** Si alguien endurece el costo o le mete más pesos, hay que
  cuidar que siga habiendo una meseta de repartos equivalentes: es lo que hace que «Regenerar»
  cambie. La prueba «regenerating gives a different split» lo vigila.
- **Los ajustes manuales siguen viviendo en el celular hasta «Confirmar equipos»** (hito 3,
  decisión 1). Tocar una opción recarga desde el servidor, así que descarta movimientos sin
  confirmar — igual que «Regenerar» desde el hito 3.
- **Capturar un resultado sigue bloqueando volver a armar** (`reject_if_scored`): hay que borrar
  el resultado antes de cambiar de opción de reparto.

## Desviaciones del PRD

- **El PRD decía «2 o 3 equipos»** en la portada, en las tarjetas de funciones y en el modelo de
  datos. Ya eran de 2 a 6 desde un cambio anterior a este adicional; se actualizó el texto para
  que diga lo que la app hace, incluyendo que el tope son los colores de playera.
- **«Elegir el número de equipos» se volvió «elegir un reparto».** El PRD pedía elegir el número
  «con sugerencia según cuántos llegaron»; ahora la sugerencia sigue ahí pero la decisión se toma
  viendo cómo queda cada opción, que es lo que el usuario pidió.
- **«Marcador en goles con 3 equipos»**, en lo que queda fuera de alcance, ahora dice «con 3 o más
  equipos».

## Verificación

- `mise exec -- bin/rails test` → **107 corridas, 380 aserciones, 0 fallas** (incluye el smoke de
  SSR).
- `npm run check` y `mise exec -- bin/rubocop` → limpios (90 archivos, 0 ofensas).
- Recorrido en el navegador en `http://localhost:4000` (**nunca el 3000**), con una jornada de
  prueba creada y **borrada** al terminar, y los 16 jugadores del plantel de desarrollo:
  - Con 0 palomeados: «Se necesitan al menos 4 jugadores para armar equipos», sin opciones.
  - Con los 16: salieron las cinco opciones —2 (8 por equipo), 3 (6, 5, 5), 4 (4 por equipo),
    5 (4, 3, 3, 3, 3) y 6 (3, 3, 3, 3, 2, 2)— con «Sugerido» en la de 2.
  - Tocar «3 equipos» armó **6/5/5**, con portero en cada uno y el semáforo en verde «Parejo».
  - **Regenerar** devolvió un acomodo distinto con el mismo semáforo.
  - Mover un jugador a otro equipo tocándolo y tocando el encabezado siguió funcionando, con los
    tamaños y promedios actualizados al instante.
  - Sin errores en la consola del navegador.
- Capturas en `tmp/screenshots/`: `opciones-distribucion-claro.jpg`,
  `opciones-distribucion-oscuro.jpg`, `distribucion-3-equipos-claro.jpg`,
  `distribucion-3-equipos-oscuro.jpg`.

> Notas de entorno, heredadas de los hitos: el proyecto corre con Ruby 3.3.6 (`.ruby-version`)
> pero el shell no lo activa → todo con `mise exec -- …`. El servidor de verificación se levantó
> con la configuración `draftsabado-verify` de `.claude/launch.json` (4000/4036) y se apagó al
> terminar.

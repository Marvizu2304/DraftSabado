# Hito 4 — Resultados y evolución · bitácora

## Qué hay de nuevo en la app

- **Anotar cómo quedó el partido.** Abajo de los equipos hay una tarjeta «Resultado». Con 2
  equipos capturas el marcador en goles; con 3, cuántos partidos ganó cada uno. Un toque y queda
  guardado.
- **Las puntuaciones se recalibran solas.** Al guardar el resultado, la puntuación de cada quien
  se mueve: ganar sube, perder baja, y el empate casi no mueve. Es automático; nadie tiene que
  calificar de nuevo.
- **Ganarle al equipo fuerte vale más.** Si tu equipo era el favorito y ganas, subes poquito; si
  eras el flojo y ganas, subes bastante más. Y al revés: perder contra el equipo flojo cuesta más
  caro que perder contra el fuerte.
- **El movimiento por partido es chico.** Un 7-1 mueve exactamente lo mismo que un 3-2: una
  goleada suelta no descalabra a nadie, y hacen falta varios sábados para que el número cambie
  de verdad.
- **Ves quién subió y quién bajó.** Debajo del resultado aparece la lista de los que jugaron con
  su cambio al lado, en verde o en rojo: «Beto +0.04 · Memo −0.01».
- **Corregir el resultado recalcula todo.** Te equivocaste de marcador: lo cambias y las
  puntuaciones se vuelven a calcular desde cero, como si el número correcto hubiera estado ahí
  desde el principio. Borrarlo también deja todo como estaba.
- **El resultado protege los equipos.** Con un resultado capturado ya no se puede regenerar ni
  volver a palomear sin borrarlo primero, para que no quede un marcador de equipos que ya no
  existen.
- **Dos números por separado.** La ficha muestra la puntuación que le puso el grupo y, en su
  propio renglón, el ajuste que traen los resultados reales («+0.14»). Para repartir equipos, la
  app usa la mezcla de los dos.
- **El reparto del siguiente sábado ya lo toma en cuenta.** Quien viene ganando cuenta como un
  poco mejor de lo que dicen sus calificaciones, y quien viene perdiendo, un poco menos.
- **Gráfica de evolución en la ficha.** Cada jugador tiene su línea sábado a sábado, con botones
  para ver los últimos 3 meses, los últimos 6 o todo.
- **Pantalla «Evolución» para comparar.** Cuarto renglón del menú: eliges hasta 6 jugadores con
  casillas y sus líneas salen juntas en la misma gráfica, cada uno con su color.
- **Dónde ha jugado cada quien.** La ficha dice en qué posiciones ha jugado de verdad: «Defensa 3»,
  «Portero 11 · Medio 2».
- **El marcador se ve en la lista de sábados.** Cada jornada jugada muestra su resultado
  («⚫ 3 · ⚪ 1 · 🟠 0») y un badge «Jugado».
- **Fuerza del ajuste, en los ajustes del grupo.** Un deslizador decide cuánto mueve un partido
  parejo (0.10 puntos por omisión). Al moverlo, todos los sábados pasados se vuelven a calcular
  con la nueva fuerza.
- **Quien no es administrador puede ver, no tocar.** Ve el resultado, los movimientos y todas las
  gráficas, pero no captura ni borra nada.

## Qué se construyó

**Base de datos** — cinco migraciones:
- `20261017120001_add_results_to_teams.rb` — `teams.goals` (2 equipos) y `teams.wins`
  (3 equipos), ambas nulas hasta que se captura el resultado.
- `20261017120002_add_elo_to_players.rb` — `players.elo`, el ajuste **en la misma escala de 1 a
  10**, default 0.
- `20261017120003_add_elo_strength_to_group_settings.rb` — `elo_strength`, centésimas de punto
  por partido parejo (default 10 = 0.10). Es la «fuerza del ajuste» que el PRD pedía desde el
  hito 2.
- `20261017120004_create_score_snapshots.rb` — `score_snapshots`: `player_id`, `matchday_id`,
  `overall`, `elo`, índice único del par. Es el «historial de puntuación».
- `20261017120005_widen_elo_precision.rb` — `elo` pasó a `decimal(5,3)`: con dos decimales se
  perdía la mitad de lo que mueve un sábado.

**Modelos**
- **`app/models/elo_ladder.rb`** — objeto Ruby plano, como `Scoreboard` y `TeamBuilder`: el único
  lugar con la aritmética del Elo.
  - Fuerza de un equipo = promedio de `overall + elo` de sus jugadores (sin calificaciones, 5.0).
  - Esperado = promedio de los enfrentamientos uno a uno,
    `1 / (1 + 10 ** ((rival − propio) / SPREAD))` con `SPREAD = 2.0` sobre la escala de 1 a 10,
    normalizado para que los esperados sumen 1. Así la cuenta funciona igual con 2 que con 3
    equipos.
  - Real: con 2 equipos los goles dan `1 / 0.5 / 0`; con 3, la proporción de partidos ganados.
  - `delta = K * (real − esperado)`, con `K = GroupSetting#elo_k`.
  - **`EloLadder.recalculate!`** borra las fotos huérfanas, pone a todos en 0 y vuelve a correr
    todas las jornadas con resultado en orden de fecha, acumulando. Es lo que hace que corregir,
    borrar o cambiar la fuerza del ajuste salgan gratis: no hay estado incremental que deshacer.
- `app/models/score_snapshot.rb` — la foto, con `#value` (`overall + elo`), que es lo que dibujan
  las gráficas, y el scope `chronological`.
- `Matchday` — `has_many :score_snapshots`, scope `with_result` y `#result?`.
- `Team` — `goals` / `wins` validados como enteros no negativos.
- `GroupSetting` — `elo_strength` validado en 2..30 y `#elo_k` (`elo_strength / 100.0`).
- **`TeamBuilder#overall`** — la única línea del reparto que cambió:
  `(scoreboard.overall(player) || MIDPOINT) + player.elo`. Porteros, serpiente, intercambios y
  costo quedaron igual, tal como anticipó la bitácora del hito 3.

**Controladores y rutas**
- `MatchdaysController#update_result` (`PATCH /sabados/:id/resultado`, helper
  `update_result_matchday_path`), detrás de `require_admin`. Campos vacíos borran el resultado:
  es una sola acción para capturar, corregir y borrar. Siempre llama a `EloLadder.recalculate!`
  dentro de la transacción y **redirige**.
- `before_action :reject_if_scored, only: %i[generate confirm]` — con resultado capturado no se
  puede volver a armar; la alerta dice que hay que borrarlo primero.
- `#show` manda además `matchday.result` (color → goles o partidos ganados), `changes`
  (`player_id` → cuánto se movió ese sábado, calculado contra la foto del sábado anterior) y el
  `elo` de cada jugador del plantel. `#index` manda el resultado de cada jornada.
- `PlayersController#detail` — `elo`, `series` (las fotos del jugador) y `position_history`
  (`team_memberships.group(:position).count`).
- `EvolutionController#index` + `get "evolucion"` — el plantel activo con su serie.
- `SettingsController` — `elo_strength` en los props y en `update`; si cambió, repasa los
  resultados.
- `public/robots.txt` — `Disallow: /evolucion`.

**Sistema de diseño** — `app/frontend/components/ui/line-chart.tsx`, primitivo nuevo: SVG inline,
sin librería. Una o varias series de `{ x: fecha ISO, y: número }`, espaciadas por posición y no
por distancia en el calendario; eje Y que enmarca los datos con margen (nunca arranca en cero, si
no un movimiento de medio punto no se vería); leyenda automática desde la segunda serie; `<title>`
por punto; seis tonos categóricos que aguantan claro y oscuro. Documentado en
`sections/elements/LineChartSection.tsx` y enlazado desde `DesignSystem.tsx` y `SidebarNav.tsx`.

**Frontend**
- `app/javascript/pages/evolucion/range.ts` — los rangos (3 meses / 6 meses / todo) y la
  conversión a puntos de la gráfica, compartidos por la ficha y la vista de grupo.
- `app/javascript/pages/evolucion/Index.tsx` — la pantalla nueva.
- `app/javascript/pages/sabados/Show.tsx` — el componente `Result`: los campos por equipo,
  «Guardar resultado», «Borrar resultado» y la lista «Cómo se movieron». Con resultado capturado
  se esconden Regenerar, Deshacer, Editar asistencia y Confirmar, y queda el botón de WhatsApp.
- `app/javascript/pages/sabados/teams.ts` — `hasResult` y `resultText`.
- `app/javascript/pages/sabados/Index.tsx` — el marcador en su propio renglón y el badge «Jugado».
- `app/javascript/pages/plantel/Show.tsx` — el renglón del ajuste, la gráfica con su rango y
  «Dónde ha jugado».
- `app/frontend/components/MainNav.tsx` — cuarto renglón «Evolución» (ícono `TrendingUp`).
- `app/javascript/pages/Settings.tsx` — segunda tarjeta: fuerza del ajuste.

**Pruebas** — `test/models/elo_ladder_test.rb` (12 casos: ganarle al fuerte vale más que ganarle
al flojo; el partido parejo mueve exactamente la fuerza del ajuste; la goleada mueve lo mismo que
el 3-2; el empate parejo no mueve a nadie; empatarle al fuerte sí; 3 equipos ordenados por
partidos ganados; una jornada sin resultado no mueve nada; el repaso deja una foto por jugador
activo; corregir deja el Elo como si el nuevo resultado hubiera sido el único; borrarlo deja todo
en cero y sin fotos; dos sábados se acumulan y el segundo vale menos; el `overall` de una foto
vieja no se reescribe), 5 casos nuevos en `matchdays_controller_test.rb`, 2 en
`players_controller_test.rb`, 2 en `settings_controller_test.rb`, 1 en `team_builder_test.rb`
(el reparto usa la mezcla) y `test/controllers/evolution_controller_test.rb` (3 casos).

## Decisiones que no estaban en el PRD

1. **El Elo vive en la escala de 1 a 10, no en 1500.** El PRD lo llama «el ajuste que viene de los
   resultados reales»; se guarda ya convertido (`+0.14`, `−0.09`) en vez de un rating estilo
   ajedrez. **Confirmado con el usuario.** Ventaja: la mezcla con la puntuación es una suma, sin
   constante de conversión que calibrar, y el número se lee solo.
2. **La goleada no mueve más**, solo gana / empata / pierde. **Confirmado con el usuario.** Es lo
   que mejor cumple «el movimiento por partido es chico». Los goles igual se guardan y se
   muestran: si algún día el grupo quiere premiar la diferencia, el dato ya está en `teams.goals`.
3. **`SPREAD = 2.0`** (dos puntos de diferencia entre equipos ≈ 10 a 1) y **`K` por omisión 0.10**.
   El PRD no da números. `SPREAD` vive en `EloLadder`; `K` es ajustable desde la pantalla de
   ajustes, de 0.02 a 0.30 de dos en dos.
4. **Nada de Elo es incremental: todo se recalcula desde cero.** Es la decisión de diseño más
   importante del hito. Cuesta 26 jugadores × número de sábados, o sea nada, y a cambio corregir,
   borrar, reordenar o cambiar la fuerza del ajuste son todos el mismo camino.
5. **La foto es de todo el plantel activo, no solo de quienes llegaron.** Así la gráfica de grupo
   tiene un punto por sábado para todos y las líneas se pueden comparar. Quien no jugó aparece con
   el mismo valor que traía.
6. **El `overall` de una foto no se vuelve a escribir.** Era lo que ese jugador valía ese día; las
   calificaciones de hoy no pueden decir nada al respecto. El `elo` de la foto sí se reescribe en
   cada repaso, porque es resultado de la cuenta.
7. **Capturar el resultado congela los equipos.** `generate` y `confirm` se rechazan mientras haya
   resultado, como lo pidió la bitácora del hito 3 (si no, el marcador quedaría huérfano). Para
   desbloquear se borra el resultado, con el mismo formulario.
8. **No se agregó un tercer estado a `Matchday`.** «Tiene resultado» se deriva de las columnas de
   `teams` (`Matchday#result?` / `scope :with_result`). Un estado más habría que mantenerlo en
   sincronía con esas columnas sin ganar nada.
9. **La lista de «cuánto se movió» se calcula, no se guarda:** es la foto de esta jornada menos la
   del sábado anterior con resultado. Un dato menos que guardar y que corregir.
10. **La gráfica dibuja `overall + elo`**, un solo trazo: lo que el jugador valía ese día. Dos
    líneas (calificaciones y ajuste) habrían chocado con «gráficas separadas por técnica y físico»,
    que el PRD deja fuera. Los dos números por separado se ven en la ficha, como pide el PRD.
11. **La gráfica es un SVG propio, no una librería.** **Confirmado con el usuario.** Una línea con
    puntos y tres etiquetas por eje no justifica 60 kB de dependencia, y así hereda los tokens del
    sistema de diseño en claro y oscuro.
12. **Máximo 6 jugadores a la vez en la vista de grupo**: son los tonos que la gráfica distingue.
13. **El rango de tiempo se mide desde el último sábado con datos, no desde hoy.** Así la misma
    información dibuja siempre la misma gráfica y el render del servidor coincide con el del
    navegador (SSR).
14. **La fuerza del ajuste es de 0.02 en 0.02**, igual que los pesos del grupo van de 5 en 5:
    nadie necesita 0.13, y con el pulgar un paso fino es imposible de acertar.

## Lo que el siguiente hito necesita saber

- **`EloLadder.recalculate!` es el único punto de entrada.** Cualquier cosa que cambie un
  resultado, una pertenencia a equipo o la fuerza del ajuste tiene que llamarlo. Acepta
  `scoreboard:` para las pruebas.
- **El `overall` de las fotos solo se escribe la primera vez.** Si alguna vez hay que recapturarlo
  (por ejemplo si se agregan calificaciones con fecha), hay que borrar las fotos de esa jornada.
- **Las fotos son de jugadores activos.** Si un jugador se da de baja deja de recibir fotos nuevas;
  las viejas se quedan, y sus gráficas siguen.
- **El reparto ya usa la mezcla.** El punto a tocar sigue siendo `TeamBuilder#overall`.
- **Lo que el PRD deja fuera de este hito** y podría pedirse después: goles por jugador, tarjetas,
  minutos, tabla de posiciones, rachas, MVP, exportar las gráficas y predicciones de resultado.
- **`<LineChart>` ya está en el sistema de diseño** (`/admin/design-system#line-chart`): reúsalo
  para cualquier número que se siga en el tiempo.
- Toda mutación llamada desde el router de Inertia **debe redirigir**. El único `head :ok` del
  proyecto sigue siendo `RatingsController#upsert`.
- Al agregar pantallas de sesión hay que agregar su línea `Disallow:` en `public/robots.txt`.

## Desviaciones del PRD

- **El Elo no es un rating estilo 1500**, sino un ajuste en la escala de 1 a 10 (punto 1).
- **La diferencia de goles no influye** en cuánto se mueve el Elo (punto 2); el PRD solo pedía que
  el movimiento fuera chico.
- **La foto de puntuación no guarda la «puntuación general» como columna de `Jugador`** — ese
  campo del modelo de datos del PRD se sigue calculando, como se decidió en el hito 2. Lo que se
  guarda es la foto por jornada, que es justamente lo que el PRD pide para las gráficas.
- **Los promedios de equipo siguen sin guardarse** (herencia del hito 3). Un sábado viejo muestra
  sus promedios con las calificaciones de hoy; lo que sí quedó congelado por sábado es la
  puntuación de cada jugador, que es lo que dibujan las gráficas.

## Verificación

- `mise exec -- bin/rails test` → **100 corridas, 340 aserciones, 0 fallas** (eran 75 al terminar
  el hito 3). Se corrió cinco veces, incluyendo una con `public/vite-test` y la caché de Vite
  borradas para forzar la reconstrucción del paquete de SSR. Una corrida intermedia, hecha mientras
  el servidor de verificación todavía se estaba apagando, marcó 2 errores que no se volvieron a
  reproducir en ninguna de las cinco corridas limpias posteriores.
- `npm run check` y `mise exec -- bin/rubocop` → limpios (89 archivos).
- Recorrido completo en el navegador en `http://localhost:4000` (**nunca el 3000**), a 375 px y en
  escritorio, claro y oscuro, con 12 jugadores de prueba calificados por 3 cuentas y dos sábados
  previos ya jugados:
  - El criterio «Está listo cuando» del PRD: se cerraron **tres jornadas** con resultado. En la
    tercera se palomearon 12, se eligieron **3 equipos** (semáforo verde, diferencia 0.3), se
    confirmaron y se capturó **⚫ 3 · ⚪ 1 · 🟠 0**. «Cómo se movieron» salió exactamente en el
    orden correcto: Negros **+0.04**, Blancos **−0.01**, Naranjas **−0.04**.
  - La ficha de un jugador mostró su gráfica **sábado a sábado** (26 sep → 3 oct → 16 oct, de 5.05
    a 5.14), el renglón «Ajuste por resultados **+0.14**» aparte de su puntuación, y «Dónde ha
    jugado: Defensa 3».
  - La pantalla **Evolución** comparó cuatro jugadores a la vez, con leyenda y los tres rangos.
  - Mover la **fuerza del ajuste** de 0.10 a 0.26 recalculó los tres sábados al instante (los
    ajustes quedaron 2.6 veces más grandes); se regresó a 0.10 y volvieron a su valor.
  - Con resultado capturado **desaparecen** Regenerar, Deshacer, Editar asistencia y Confirmar, y
    queda el aviso de que hay que borrar el resultado primero.
  - Como cuenta **sin** permisos de administrador: el resultado y los movimientos se ven, sin
    campos ni botones; las gráficas y la pantalla Evolución, completas.
  - La sección **Line chart** de `/admin/design-system` se revisó en oscuro, con sus tres
    variantes (una serie, tres series y vacío).
  - Sin errores en la consola del navegador.
- Capturas en `tmp/screenshots/` (`hito4-*`).
- Toda la información de verificación (12 jugadores «Ver …», dos jornadas, calificaciones y tres
  cuentas de prueba) se **borró** al terminar: la base de desarrollo quedó como estaba.

> Notas de entorno, heredadas de los hitos anteriores: el proyecto corre con Ruby 3.3.6
> (`.ruby-version`) pero el shell resuelve 4.0.5 → todo con `mise exec -- …`. El servidor de
> verificación se levantó con
> `PORT=4000 VITE_RUBY_PORT=4036 PIDFILE=tmp/pids/server-4000.pid mise exec -- bin/dev`
> y se apagó al terminar.

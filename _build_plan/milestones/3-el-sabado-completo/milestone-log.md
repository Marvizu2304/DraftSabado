# Hito 3 — El sábado completo · bitácora

## Qué hay de nuevo en la app

- **La app abre en los sábados.** Al entrar ya no caes en el plantel: caes en la lista de
  jornadas, que es la pantalla que vas a usar parado en la cancha. Plantel y Calificar bajaron
  un renglón en el menú.
- **Botón «Nuevo sábado».** Un toque y queda abierta la jornada del día. Si ya la abriste, el
  mismo botón te lleva a ella en vez de crear otra.
- **Palomeo con el pulgar.** Una fila alta por jugador, con casilla grande, su posición y su
  puntuación. Arriba, un número gordo que te dice cuántos llevas palomeados.
- **2 o 3 equipos.** Eliges con dos botones grandes. Si llegaron 18 o más, la app te dice que lo
  normal son 3; y si el número no se reparte parejo, te avisa cómo va a quedar («quedan 8, 7, 7»).
- **Generar equipos.** Un toque y quedan armados, equilibrando al mismo tiempo la puntuación, el
  físico y las posiciones.
- **Portero garantizado en cada equipo.** Primero los porteros de oficio; si no llegaron,
  quienes ya hayan atajado en sábados anteriores; y si tampoco, la app manda al arco al de menor
  puntuación y lo dice en la tarjeta («Fulano va al arco sin ser portero de oficio»).
- **Semáforo de qué tan parejo quedó.** Verde «Parejo», amarillo «Aceptable» o rojo «Disparejo»,
  con la diferencia exacta de puntos entre el equipo más fuerte y el más flojo.
- **Mover e intercambiar a mano, sin esperar.** Tocas a un jugador y se marca; tocas a otro y se
  intercambian; tocas el encabezado de otro equipo y se mueve ahí. La diferencia y el semáforo se
  actualizan al instante, sin recargar nada.
- **Cambiar la posición del día.** Con un jugador marcado, abajo aparece un selector para decir
  dónde jugó de verdad ese sábado.
- **Deshacer.** Te arrepientes de un movimiento y regresas, cuantas veces quieras.
- **Regenerar.** Si el reparto no convenció, otro toque y sale uno distinto.
- **Editar asistencia.** Llegó alguien tarde: vuelves al palomeo sin perder la jornada.
- **Confirmar equipos.** Guarda el acomodo final y marca la jornada como confirmada.
- **Compartir por WhatsApp.** Un botón abre WhatsApp con el texto ya escrito: equipo por equipo,
  solo nombres y posiciones, listo para pegar en el grupo.
- **Consultar sábados anteriores.** La lista guarda cada jornada con su fecha, cuántos llegaron y
  en cuántos equipos quedaron.
- **Quien no es administrador puede ver, no tocar.** Ve los equipos y puede compartirlos por
  WhatsApp, pero no palomea, no genera, no mueve ni confirma.

## Qué se construyó

**Base de datos** — cuatro tablas nuevas:
- `db/migrate/20261017000001_create_matchdays.rb` — `matchdays`: `played_on` (date, índice
  **único**), `team_count` (default 2), `status` (default `"building"`).
- `db/migrate/20261017000002_create_attendances.rb` — `attendances`: `matchday_id`, `player_id`,
  índice único del par. Esto es el palomeo.
- `db/migrate/20261017000003_create_teams.rb` — `teams`: `matchday_id`, `color`, índice único del
  par.
- `db/migrate/20261017000004_create_team_memberships.rb` — `team_memberships`: `team_id`,
  `player_id`, `position` (la posición **del día**), índice único del par.

**Modelos**
- `app/models/matchday.rb` — `STATUSES = %w[building played]`, `TEAM_COUNTS = [2, 3]`,
  `THREE_TEAM_THRESHOLD = 18`, `has_many :attendances / :players (through) / :teams`,
  scope `ordered` y `self.suggested_team_count(n)`.
- `app/models/attendance.rb`, `app/models/team.rb` (`COLORS = %w[black white orange]`),
  `app/models/team_membership.rb` (valida `position` contra `Player::POSITIONS`).
- `app/models/player.rb` — le crecieron `has_many :attendances` y `has_many :team_memberships`.
- **`app/models/team_builder.rb`** — objeto Ruby plano, como `Scoreboard`. El único lugar con el
  algoritmo de reparto. En tres pasos:
  1. **Porteros.** De oficio (`position == "goalkeeper"`) de mayor a menor puntuación; si faltan,
     quienes tengan `TeamMembership` previa con `position: "goalkeeper"`, de más veces a menos; si
     aún faltan, los de menor puntuación que queden.
  2. **Reparto inicial** en serpiente por puntuación general descendente, que deja los tamaños lo
     más parejos posible (22 entre 3 → 8, 7, 7).
  3. **Mejora:** 2000 intentos de intercambio al azar entre equipos (los porteros quedan fijos),
     aceptando el que baje el costo
     `3.0·rango(prom. general) + 2.0·rango(prom. físico) + 0.5·desbalance de posiciones`.
     El azar es a propósito: es lo que hace que «Regenerar» dé un reparto distinto.

**Controlador y rutas** — `app/controllers/matchdays_controller.rb`, con
`before_action :require_admin, only: %i[create generate confirm]`.
`config/routes.rb`: `resources :matchdays, path: "sabados", only: %i[index show create]` con los
miembros `post :generate, path: "generar"` y `patch :confirm, path: "confirmar"`.
- `index` / `show` los ve cualquier cuenta; `show` manda el plantel activo con su `overall` y
  `physical` (del `Scoreboard` memoizado por petición), los asistentes, los equipos y `can_edit`.
- `create` usa `find_or_create_by!(played_on: Date.current)`: el índice único lo hace idempotente.
- `generate` reemplaza asistencias, borra y recrea equipos con `TeamBuilder`. Rechaza menos de
  `team_count * 2` jugadores.
- `confirm` reemplaza las pertenencias con lo que manda el celular y pone `status: "played"`;
  antes verifica que los jugadores enviados sean **exactamente** los asistentes, sin repetidos.
- Las cuatro mutaciones **redirigen**: las llama el router de Inertia.

**Frontend** — todo en `app/javascript/pages/sabados/`:
- `teams.ts` — único lugar con los colores (`black` → «Negros» ⚫, `white` → «Blancos» ⚪,
  `orange` → «Naranjas» 🟠), los tipos, los promedios, el semáforo, el reparto de tamaños, la
  fecha en español y el texto de WhatsApp.
- `Index.tsx` — lista de jornadas con fecha, badge de estado y «Nuevo sábado» solo para admin.
- `Show.tsx` — la pantalla del sábado, con dos fases (`Attendance` y `Teams`) y una barra fija
  abajo que cambia según haya o no un jugador marcado.

**Sistema de diseño** — `<Badge>` ganó el tono `danger` (`badge-danger` en `design-system.css`,
la variante en `badge.tsx`, el ejemplo en `BadgesSection.tsx`). Los tokens `--color-danger-*` ya
existían pero el badge no los exponía; el rojo del semáforo los necesitaba.

**Cambios en lo que ya existía**
- `app/frontend/components/MainNav.tsx` — nuevo primer renglón «Sábados» (ícono `CalendarDays`),
  que se queda con el `match` de `"/"`; `brandHref` apunta a `/sabados`.
- La portada es Sábados: `players_path` → `matchdays_path` en `PagesController#home`,
  `RegistrationsController` y `Authentication#after_authentication_url`, con sus dos aserciones
  de prueba.
- `public/robots.txt` — `Disallow: /sabados` y, de paso, `Disallow: /calificar`, que faltaba
  desde el hito 2. Sitemap y `llms.txt` no se tocaron: nada de esto es público.

**Pruebas** — `test/models/team_builder_test.rb` (7 casos: portero de oficio por equipo; relevo
al que ya atajó antes; el de menor puntuación cuando no hay ni uno ni otro; el portero suplente
sale a jugar de defensa; 22 entre 3 dan 8/7/7; la diferencia de promedios queda bajo 0.3; funciona
sin ninguna calificación) y `test/controllers/matchdays_controller_test.rb` (10 casos).
Fixture nueva: `test/fixtures/matchdays.yml`.

## Decisiones que no estaban en el PRD

1. **Los ajustes manuales viven en el celular hasta «Confirmar equipos».** Mover, intercambiar,
   cambiar posición y deshacer son estado de React; solo `Generar` y `Confirmar` van al servidor.
   Es lo que permite que la diferencia se actualice *al instante*, como pide el PRD, sin un viaje
   de red por cada movimiento parado en la cancha con mala señal. El costo: si cierras el
   navegador después de generar y antes de confirmar, se pierde el acomodo (no el palomeo, que sí
   se guardó al generar). **Decisión confirmada con el usuario.**
2. **Los equipos son colores fijos** — Negros, Blancos, Naranjas — no letras ni nombres editables.
   Es lo que se grita en la cancha. El PRD decía «nombre o color»; se eligió color.
   **Confirmado con el usuario.**
3. **Umbrales del semáforo: 0.3 y 0.6** sobre la escala de 1 a 10. **Confirmados con el usuario.**
   Viven en `teams.ts` (`EVEN`, `ACCEPTABLE`); si el grupo los quiere más duros o más flojos, es
   cambiar dos números ahí, o moverlos a los ajustes del grupo.
4. **Los sábados son la portada.** `after_authentication_url` y `PagesController#home` ahora
   mandan a `/sabados`. **Confirmado con el usuario.**
5. **Los promedios del equipo no se guardan: se calculan.** El PRD los lista como campos de
   `Equipo`. Igual que las puntuaciones del hito 2, salen de `Scoreboard` en el servidor y se
   recalculan en el cliente al mover jugadores — que es justamente lo que hace que la diferencia
   cambie al instante. **Ojo para el hito 4:** esto significa que un sábado viejo muestra sus
   promedios con las calificaciones y los pesos de *hoy*, no los de ese día. Congelarlos es
   trabajo del «historial de puntuación» del hito 4.
6. **`goals` y `wins` no se crearon en `teams`.** Son del hito 4; crearlas vacías ahora solo
   invitaba a usarlas antes de tiempo (mismo criterio que los hitos 1 y 2).
7. **Un portero de oficio que no va al arco ese día juega de defensa.** Si llegan 4 porteros y
   hay 3 equipos, el cuarto arranca con posición del día `defender`, no `goalkeeper`, para que no
   cuente como portero al equilibrar posiciones. Se puede cambiar a mano.
8. **Sin calificaciones, el reparto sale al azar y la app lo dice.** `Scoreboard#overall` devuelve
   `nil` cuando *nadie* en el plantel tiene calificaciones; `TeamBuilder` lo trata como 5.0 y el
   palomeo muestra un aviso. Nunca bloquea un sábado, que es lo que importa parado en la cancha.
9. **Una jornada por día**, por el índice único sobre `played_on`. Dos toques a «Nuevo sábado» no
   crean dos jornadas.
10. **Confirmar no congela la jornada.** El administrador puede seguir moviendo, regenerando o
    editando la asistencia después de confirmar, y volver a confirmar. Es lo que permite corregir
    un error sin ruta extra. **Esto le importa al hito 4** (ver abajo).
11. **El mínimo para generar son `team_count * 2` jugadores** (4 con dos equipos, 6 con tres).
    El PRD no fija un mínimo; un equipo de uno no es un equipo.
12. **Se sugieren 3 equipos a partir de 18 jugadores** (`Matchday::THREE_TEAM_THRESHOLD`). El PRD
    pide «sugerencia según cuántos llegaron» sin dar el número. Es una sugerencia, no una regla:
    los dos botones siguen disponibles.
13. **Mover e intercambiar se hacen tocando, no arrastrando.** Tocas a uno y se marca, tocas al
    otro y se intercambian. Arrastrar en un celular con una mano, de pie, es peor — y no requiere
    ninguna librería nueva.
14. **El texto de WhatsApp se arma en el cliente** y se abre con `https://wa.me/?text=…`. Sin
    integración, sin cuenta de desarrollador, tal como lo anticipa el PRD.

## Lo que el hito 4 necesita saber

- **`Equipo` todavía no tiene dónde guardar el resultado.** El hito 4 tiene que agregar `goals`
  (2 equipos) y `wins` (3 equipos) a `teams`, y una tabla de historial de puntuación.
  `Matchday#status` ya vale `"played"` cuando los equipos se confirmaron; si el hito 4 necesita
  distinguir «confirmado» de «con resultado capturado», conviene un tercer estado o una columna
  aparte, porque hoy confirmar ya pone `played`.
- **Confirmar no bloquea nada** (punto 10). Si el hito 4 guarda un resultado y después el
  administrador regenera, las pertenencias se borran y el resultado queda huérfano. Lo razonable
  es que `generate` y `confirm` se rechacen cuando la jornada ya tiene resultado.
- **La «fuerza del ajuste» (la K del Elo) sigue sin existir** en `GroupSetting`, como dejó dicho
  el hito 2. Es una migración de una columna.
- **El historial de posiciones jugadas ya existe**: `TeamMembership.where(player_id:, position:)`
  agrupado. `TeamBuilder#goalkeeping_history` ya lo consulta para el portero de emergencia; la
  ficha del jugador («portero 3 · defensa 11 · medio 2») sale de la misma tabla.
- **El reparto usa hoy solo `Scoreboard`.** Cuando exista el Elo, el punto a tocar es
  `TeamBuilder#overall` / `#physical` — nada más. Todo lo demás (porteros, serpiente,
  intercambios, costo) se queda igual.
- **Los promedios de equipos pasados se recalculan con los números de hoy** (punto 5). Si el
  hito 4 quiere que un sábado viejo muestre lo que valía ese día, la foto de puntuación tiene que
  guardarse al cerrar la jornada y las tarjetas tienen que leerla.
- **La barra fija de abajo** en `Show.tsx` es donde van los controles del momento. Si el hito 4
  agrega «capturar resultado», ese es su lugar natural.
- Toda mutación llamada desde el router de Inertia **debe redirigir**. El único `head :ok` del
  proyecto sigue siendo `RatingsController#upsert`.
- Al agregar pantallas de sesión hay que agregar su línea `Disallow:` en `public/robots.txt`.

## Desviaciones del PRD

- **Los promedios del equipo no son columnas** (punto 5 de arriba).
- **`goles` y `partidos ganados` no se crearon** en `Equipo` (punto 6); son del hito 4.
- **Confirmar la jornada no la cierra** (punto 10): el PRD habla de los estados «armando» y
  «jugado», pero no dice que «jugado» sea irreversible, y poder corregir un acomodo ya confirmado
  vale más en la cancha que la rigidez.

## Verificación

- `mise exec -- bin/rails test` → **75 corridas, 262 aserciones, 0 fallas** (incluye el smoke de
  SSR). Se corrió tres veces seguidas para descartar intermitencias.
- `npm run check` y `mise exec -- bin/rubocop` → limpios.
- Recorrido completo en el navegador en `http://localhost:4000` (**nunca el 3000**), a 375 px,
  con cuentas de verificación creadas y **borradas** al terminar, y 22 jugadores de prueba
  calificados por 3 cuentas:
  - El criterio «Está listo cuando» del PRD, de punta a punta: se palomearon **22** jugadores
    (contador en vivo), se eligieron **3 equipos**, apareció el aviso «No se reparte parejo:
    quedan 8, 7, 7», se generó → **8/7/7** con los tres promedios en **6.4** y el semáforo en
    **verde «Parejo», diferencia 0.0**.
  - Cada equipo quedó con exactamente un portero, los tres de oficio; el cuarto portero que llegó
    salió a jugar de **Defensa**, como está diseñado.
  - Se intercambiaron dos jugadores tocando uno y luego el otro: Negros pasó de 6.4 a 6.0 y el
    semáforo saltó a **rojo «Disparejo», diferencia 0.8**, al instante y sin recargar.
    **Deshacer** devolvió el 6.4 y el verde.
  - Se movió un jugador de Negros a Blancos tocando el encabezado del equipo: 8/7/7 → 7/8/7 y el
    promedio se actualizó solo.
  - **Confirmar** guardó el acomodo manual (se verificó tras recargar), puso el badge en
    «Confirmado» y destapó el botón de WhatsApp.
  - El texto de WhatsApp salió correcto: fecha, los tres equipos con su emoji de color, y solo
    nombres y posiciones — 22 renglones, sin puntuaciones ni datos de más.
  - Como cuenta **sin** permisos de administrador: los equipos se ven completos y se pueden
    compartir, pero no hay «Nuevo sábado», ni palomeo, ni Regenerar, ni Deshacer, ni Confirmar.
  - Sin errores en la consola del navegador.
- Capturas en `tmp/screenshots/` (`hito3-*`), a 375 px y en escritorio, en claro y en oscuro.

> Notas de entorno, heredadas de los hitos 1 y 2: el proyecto corre con Ruby 3.3.6
> (`.ruby-version`) pero el shell resuelve 4.0.5 → todo con `mise exec -- …`. El servidor de
> verificación se levantó con
> `PORT=4000 VITE_RUBY_PORT=4036 PIDFILE=tmp/pids/server-4000.pid mise exec -- bin/dev`
> y se apagó al terminar.

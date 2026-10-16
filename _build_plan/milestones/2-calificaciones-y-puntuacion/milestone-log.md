# Hito 2 — Calificaciones y puntuación · bitácora

## Qué hay de nuevo en la app

- **Pantalla "Calificar".** Hay un segundo renglón en el menú: ahí aparecen todos tus compañeros,
  cada uno con dos barritas del 1 al 10 — una para la técnica y otra para el físico.
- **Se guarda solo.** No hay botón de guardar: mueves la barra, sueltas, y medio segundo después
  aparece un "Guardado ✓" en esa tarjeta. Si se cae la red te avisa en la tarjeta.
- **Contador de pendientes.** Arriba te dice "Te faltan 7 de 25", para que sepas cuánto te queda
  sin tener que ir contando.
- **Nadie se califica a sí mismo** ni aparece en su propia lista, y los que ya se dieron de baja
  tampoco salen.
- **Nadie ve quién puso qué.** Ni el administrador. Lo único que sale a la luz es el promedio y
  cuántas personas calificaron a cada quien; de quién vino cada número no viaja al navegador.
- **El plantel ya tiene números.** Cada jugador trae su puntuación general al lado del nombre, y
  la lista queda ordenada del mejor calificado al que menos.
- **La ficha abre con los números.** Puntuación general, técnica, físico y "calificado por N
  personas", arriba de la edad y la posición.
- **Promedio recortado.** De tres calificaciones para arriba se tira la más alta y la más baja,
  para que un amigo muy generoso o un enemigo muy duro no muevan a nadie. Con una o dos se
  promedia normal, y a quien nadie ha calificado se le da el promedio del grupo para que no
  arranque en cero.
- **Ajustes del grupo.** La pantalla de ajustes, que antes estaba vacía, ahora tiene una barra
  para decidir cuánto pesa la técnica y cuánto el físico (60/40 de entrada). Al soltarla, todas
  las puntuaciones del plantel se recalculan de inmediato.
- **Solo el administrador mueve los pesos.** Los demás ven los dos porcentajes, pero sin barra.
- **Si tu cuenta no está ligada a un jugador**, la pantalla de calificar te explica que le pidas
  al administrador que la ligue, en vez de dejarte viendo una lista vacía.

## Qué se construyó

**Base de datos**
- `db/migrate/20261016000002_create_ratings.rb` — tabla `ratings`: `rater_id` (→ `users`),
  `player_id` (→ `players`), `technique` y `physical` (enteros, no nulos), con índice **único**
  sobre `[rater_id, player_id]`.
- `db/migrate/20261016000003_create_group_settings.rb` — tabla `group_settings` con una sola
  columna de contenido, `technique_weight` (entero, default `60`).

**Modelos**
- `app/models/rating.rb` — `belongs_to :rater, class_name: "User"`, `belongs_to :player`,
  ambos ejes validados dentro de `1..10`, unicidad del par, y la validación propia
  `not_rating_self` (si `player.user_id == rater_id`, no pasa).
- `app/models/group_setting.rb` — `GroupSetting.current` (`first || create!`), validación
  `0..100`, y `physical_weight` **calculado** como `100 - technique_weight`.
- `app/models/scoreboard.rb` — objeto Ruby plano (no Active Record). Es el **único** lugar con la
  aritmética del PRD. Carga todas las calificaciones en una consulta, las agrupa por jugador, y
  expone `technique`, `physical`, `overall` y `ratings_count`. Recorta de 3 para arriba,
  promedia simple con 1 o 2, y cae al promedio del grupo cuando no hay ninguna.
- `app/models/player.rb` — le creció `has_many :ratings, dependent: :destroy`.

**Controladores y rutas**
- `app/controllers/ratings_controller.rb` — `index` (pantalla "Calificar") y `upsert` (el
  autoguardado). `index` solo manda las calificaciones **del usuario actual**; si la cuenta no
  tiene jugador ligado, manda `linked: false` y ninguna lista. `upsert` es la excepción prevista:
  lo llama un `fetch()` crudo, no el router de Inertia, así que responde `head :ok` /
  `head :unprocessable_entity`.
- `app/controllers/settings_controller.rb` — `show` manda `technique_weight` y `can_edit`;
  `update` va detrás de `before_action :require_admin, only: :update` y **redirige** (es una
  mutación del router de Inertia).
- `app/controllers/players_controller.rb` — `summary` y `detail` ahora se arman con un
  `Scoreboard` memoizado por petición: `summary` gana `overall`, `detail` además `technique`,
  `physical` y `ratings_count`.
- `config/routes.rb` — `get/patch "calificar"` (helper `ratings_path`) y `patch "settings"`.

**Sistema de diseño**
- `app/frontend/components/ui/slider.tsx` — primitivo nuevo. Es un `<input type="range">` nativo
  teñido con `accent-[var(--color-accent)]`, con una prop `muted` que lo pinta en gris para el
  estado "todavía sin valor".
- `app/frontend/components/design-system/sections/elements/SliderSection.tsx`, enlazada desde
  `DesignSystem.tsx` y `SidebarNav.tsx`. Ya se ve en `/admin/design-system`.

**Frontend**
- `app/javascript/pages/calificar/Index.tsx` — la pantalla nueva: tarjeta por jugador, dos
  deslizadores, autoguardado con rebote de 400 ms y token CSRF, indicador por tarjeta y contador
  de pendientes.
- `app/javascript/pages/Settings.tsx` — se reescribió entera (antes era el placeholder de la
  plantilla): deslizador de 0 a 100 con paso de 5, los dos porcentajes en vivo, y texto plano en
  lugar del control cuando no eres administrador.
- `app/javascript/pages/plantel/Index.tsx` — la puntuación a la derecha de cada fila y la lista
  ordenada por puntuación de mayor a menor (los sin número, al final; empate se rompe por nombre).
- `app/javascript/pages/plantel/Show.tsx` — cuatro renglones nuevos arriba de la ficha.
- `app/javascript/pages/plantel/positions.ts` — los tipos `Player` y `PlayerDetail` crecieron.
- `app/frontend/components/MainNav.tsx` — segundo ítem: "Calificar" (`/calificar`, ícono `Star`).

**Pruebas** — `test/models/scoreboard_test.rb` (8 casos: el recorte con 3, 4 y 5; el promedio
simple con 1 y 2; el promedio del grupo; el grupo entero sin calificaciones; las bajas fuera del
promedio del grupo; la mezcla con 60/40 y con 50/50), `test/models/rating_test.rb`,
`test/controllers/ratings_controller_test.rb`, `test/controllers/settings_controller_test.rb`,
más dos casos nuevos en `test/controllers/players_controller_test.rb`. Fixtures
`test/fixtures/ratings.yml` y `test/fixtures/group_settings.yml`. En `test/test_helper.rb` se
agregaron dos ayudas para pruebas de integración: `inertia_props` (lee los props del atributo
`data-page` de la respuesta) y un `log_in_as` compartido.

## Decisiones que no estaban en el PRD

1. **Las puntuaciones no se guardan: se calculan.** El modelo de datos del PRD lista `técnica
   promedio`, `físico promedio` y `puntuación general` como campos de `Jugador`. No se crearon.
   Con 26 jugadores, recalcular desde las calificaciones en cada petición es instantáneo, nunca
   deja un número viejo, y hace que mover los pesos recalcule todo sin tocar la base ni invalidar
   ninguna caché. **El hito 4 sí va a necesitar guardar** — el `elo` es un valor que se acumula,
   no se deriva, y el "historial de puntuación" es justamente una foto guardada de estos números.
2. **El peso del físico no existe como dato.** Solo se guarda `technique_weight`; el otro es
   `100 - technique_weight`. Así la regla "siempre suman 100%" no se puede romper ni por error.
3. **La "fuerza del ajuste" (la K del Elo) no se creó**, aunque el PRD la pone dentro de los
   ajustes del grupo. Es del hito 4; crearla vacía ahora solo invitaba a usarla antes de tiempo.
   Agregarla es una migración de una columna sobre `group_settings`.
4. **Los ajustes del grupo viven en `/settings`**, la pantalla que la plantilla traía vacía, en
   vez de abrir una ruta nueva o meterlos al panel de admin. Todos la ven; solo el administrador
   tiene el control. No se creó un ítem de navegación: se llega por el menú de la cuenta, como ya
   era.
5. **Quién califica es la cuenta (`rater_id` → `users`), no el jugador**, tal como lo dice el PRD.
   El jugador solo se usa para saber a quién **no** puede calificar.
6. **El deslizador arranca a la mitad y en gris.** "Sin calificar" tiene que verse distinto de
   "le puse 5": mientras no lo toques, la barra está en gris y a un lado dice "—". Nada se guarda
   hasta que los **dos** ejes de ese jugador tienen valor.
7. **El autoguardado va por `fetch()` crudo, no por el router de Inertia.** Un `router.patch` por
   cada movimiento de barra recargaría los props de la página entera 50 veces. La bitácora del
   hito 1 ya preveía esta excepción.
8. **El paso de los pesos es de 5 en 5**, no de 1 en 1. Nadie necesita 63/37, y con el pulgar un
   paso fino es imposible de acertar.
9. **La lista del plantel se ordena por puntuación**, no por nombre. Para repartir equipos, el
   orden útil es el de nivel; el buscador sigue ahí para encontrar a alguien por nombre.
10. **No se le puso buscador a la pantalla "Calificar".** Con 25 tarjetas y el contador arriba,
    el scroll alcanza. Si el usuario lo pide, es un filtro de cliente idéntico al del plantel.

## Lo que el hito 3 necesita saber

- **La puntuación para repartir equipos sale de `Scoreboard`**, no de una columna.
  `board = Scoreboard.new` una vez por petición y luego `board.overall(player)` /
  `board.physical(player)` por jugador. Nunca lo construyas dentro de un bucle: cada instancia
  hace sus dos consultas.
- `Scoreboard#overall` y `#physical` pueden devolver **`nil`** — pasa solo cuando *nadie* en todo
  el plantel tiene calificaciones. El generador de equipos tiene que decidir qué hacer en ese
  caso (lo razonable: avisar que falta calificar antes de repartir).
- **Los pesos del grupo son `GroupSetting.current`.** Si el hito 3 necesita otro número ajustable
  (por ejemplo cuánto pesa la posición al repartir), ahí es donde va, detrás de `require_admin`.
- **Las bajas ya están fuera** de las calificaciones y del promedio del grupo. Sigue usando
  `Player.active` para el palomeo.
- **El portero de oficio sale de `player.position == "goalkeeper"`.** El "historial de posiciones
  jugadas" que el PRD menciona para el portero de emergencia **todavía no existe**: nace con
  `PertenenciaAEquipo` en este hito 3.
- Toda mutación llamada desde el router de Inertia **debe redirigir**. El único `head :ok` del
  proyecto es `RatingsController#upsert`, y está ahí porque lo llama un `fetch()` crudo.
- `inertia_props` en `test/test_helper.rb` sirve para afirmar sobre los props de cualquier
  pantalla desde una prueba de integración; úsalo para las de la jornada.
- El primitivo `<Slider>` ya existe y está documentado; reúsalo si el hito 3 necesita otro control
  de rango.

## Desviaciones del PRD

- **Los campos de puntuación de `Jugador` siguen sin crearse** (punto 1 de arriba). El hito 4 va a
  tener que crear `elo` como columna de verdad y la tabla de historial; estos tres promedios
  probablemente se queden calculados.
- **`fuerza del ajuste` no se creó** dentro de los ajustes del grupo (punto 3).

## Verificación

- `mise exec -- bin/rails test` → **58 corridas, 199 aserciones, 0 fallas** (incluye el smoke de
  SSR, que se volvió a correr tras forzar `bin/vite build --ssr`).
- `npm run check` y `mise exec -- bin/rubocop` → limpios.
- Recorrido en el navegador en `http://localhost:4000` (nunca el 3000), con cuentas de
  verificación creadas y **borradas** al terminar:
  - Tres cuentas calificaron al mismo jugador con 4, 7 y 10 → su promedio salió **7.0** en el
    plantel, que es exactamente el recortado (se tiran el 4 y el 10).
  - Como administrador ligado a un jugador, la lista de "Calificar" lo excluyó a él y a la baja,
    el contador bajó de 5 a 4 al calificar, y apareció el "Guardado ✓".
  - Un jugador calificado 9 de técnica y 4 de físico salió en **7.0** con pesos 60/40 y en **6.5**
    tras mover los pesos a **50/50**; los no calificados pasaron de 7.0 a 6.8 en el mismo
    movimiento. Ese es el criterio "Está listo cuando" del PRD.
  - Como cuenta normal: `/settings` sin control, solo los dos porcentajes; `/calificar` con el
    aviso de cuenta no ligada.
  - Se revisó el `data-page` de `/plantel/:id`: **no contiene `rater` ni ningún correo de quien
    calificó**. Sin errores en la consola.
- Capturas en `tmp/screenshots/` (`hito2-*`), a 375 px y en escritorio, en claro y en oscuro.

> Notas de entorno, heredadas del hito 1: el proyecto corre con Ruby 3.3.6 (`.ruby-version`) pero
> el shell resuelve 4.0.5 → todo con `mise exec -- …`. Y como el usuario ya tenía su propio
> servidor en el 3000, el de verificación se levantó con
> `PORT=4000 VITE_RUBY_PORT=4036 PIDFILE=tmp/pids/server-4000.pid mise exec -- bin/dev`:
> sin el `PIDFILE` aparte, `bin/rails s` se niega a arrancar porque ve el `tmp/pids/server.pid`
> del otro.

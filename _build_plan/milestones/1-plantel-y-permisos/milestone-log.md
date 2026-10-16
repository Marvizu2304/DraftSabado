# Hito 1 — Plantel y permisos · bitácora

## Qué hay de nuevo en la app

- **Ya existe el plantel.** Al entrar a la app caes directo en la lista de jugadores del grupo, con su nombre, edad y posición.
- **Dar de alta jugadores.** El administrador agrega a cada quien con nombre, edad y posición preferida (portero, defensa, medio o delantero).
- **Buscador.** Escribes dos letras y la lista se filtra al instante; encontrar a alguien entre 26 toma un segundo.
- **Ficha de cada jugador.** Un toque sobre su nombre abre su ficha con sus datos, su estado y la cuenta que tiene ligada.
- **Editar y dar de baja.** Puedes corregir los datos de un jugador, y darlo de baja cuando ya no viene — no se borra, se guarda por si regresa, y se puede reactivar. Las bajas se esconden de la lista, con una casilla para volver a verlas.
- **Ligar un jugador con su cuenta.** El administrador indica qué correo corresponde a cada jugador, para que en el siguiente hito esa persona pueda calificar a los demás.
- **Dos niveles de permiso.** Cualquiera que entre ve el plantel y las fichas; solo el administrador ve los botones de alta, edición y baja (y si alguien intenta entrar por la URL directa, la app lo rebota).
- **Hecho para el celular.** Filas altas y cómodas para el pulgar, y todo se ve bien en pantalla chica y en escritorio, en claro y en oscuro.

## Qué se construyó

**Base de datos** — `db/migrate/20261016000001_create_players.rb`, tabla `players`:
`name` (string, obligatorio), `age` (integer, obligatorio), `position` (string, obligatorio),
`active` (boolean, default `true`), `user_id` (referencia opcional a `users`, con índice **único**).

**Modelos**
- `app/models/player.rb` — `POSITIONS = %w[goalkeeper defender midfielder forward]`, `belongs_to :user, optional: true`,
  `normalizes :name` (le quita espacios), validaciones (nombre presente, edad entera 10..99, posición en la lista,
  `user_id` único), y los scopes `active` y `ordered` (por nombre).
- `app/models/user.rb` — se le agregó `has_one :player, dependent: :nullify`.

**Controladores y rutas**
- `app/controllers/players_controller.rb` — `index`, `show`, `new`, `edit`, `create`, `update`.
  `before_action :require_admin, except: %i[index show]`. `create`/`update` **siempre redirigen**
  (nunca `head :ok` ni `render json:`), y en el camino de error usan `inertia: { errors: ... }`.
  Expone `linkable_users`: las cuentas sin jugador ligado más la que ya trae el jugador en edición.
- `app/controllers/concerns/authentication.rb` — `require_admin` se subió aquí desde
  `Admin::BaseController`, que ahora solo declara el `before_action`. Lo comparten el panel admin y el plantel.
- `config/routes.rb` — `resources :players, path: "plantel", except: :destroy`. Los helpers son
  `players_path`, `player_path(player)`, etc.; la URL que ve el usuario es `/plantel`.

**Frontend** (todo en `app/javascript/pages/plantel/`)
- `positions.ts` — único lugar con el mapa posición → etiqueta en español y los tipos `Player` / `PlayerDetail`.
- `Index.tsx` — lista, buscador y casilla "ver bajas" (ambos filtran en el cliente), botón "Nuevo jugador" solo para admin.
- `Show.tsx` — la ficha, con "Editar" y "Dar de baja" / "Reactivar" solo para admin.
- `Form.tsx` — una sola pantalla para alta y edición; la cuenta ligada y la casilla de activo solo aparecen al editar.
- `app/frontend/components/MainNav.tsx` — el ítem de navegación por omisión ahora es **Plantel** (`/plantel`, ícono `Users`).

**Pruebas** — `test/fixtures/players.yml`, `test/models/player_test.rb`,
`test/controllers/players_controller_test.rb`. Suite completa: 32 corridas, 0 fallas.

**Se borró** — `app/controllers/dashboard_controller.rb`, `app/javascript/pages/Dashboard.tsx` y la ruta `dashboard`.

## Decisiones que no estaban en el PRD

1. **El plantel es la portada.** No hay Dashboard: `after_authentication_url`, `PagesController#home` y
   `RegistrationsController` ahora mandan a `players_path`. Se eliminaron el controlador, la página y la ruta
   `dashboard` (y su línea en `robots.txt`), y las pruebas que usaban `dashboard_path` apuntan a `players_path`.
2. **URL en español, código en inglés.** La ruta es `/plantel` y los textos están en español, pero el modelo,
   el controlador y los valores de `position` están en inglés (`goalkeeper`, etc.). Mantener esa frontera
   evita mezclar idiomas en el código; la traducción vive en `positions.ts`.
   Las pantallas que ya traía la plantilla (login, registro, perfil, ajustes, admin) **siguen en inglés** —
   el usuario eligió traducir solo lo nuevo.
3. **La liga jugador ↔ cuenta la hace el administrador**, eligiendo un correo en la ficha. Nadie se liga solo.
   El selector solo ofrece cuentas libres, así que la regla de "una cuenta, un jugador" se cuida en la UI
   y, como respaldo, con el índice único y la validación.
4. **La baja es el mismo `update`** con `active: false` — sin ruta ni acción extra. El botón de la ficha y la
   casilla "Sigue en el grupo" del formulario pegan al mismo lugar.
5. **El buscador y el filtro de bajas corren en el cliente.** Con 26 filas no hace falta nada en el servidor:
   `index` manda el plantel completo (activos y bajas) y React filtra.
6. **Rango de edad 10..99.** El PRD no fija límites; se puso un rango amplio para atajar dedazos.
7. **La ficha todavía no muestra números.** Calificaciones, puntuación y gráficas son de los hitos 2 y 4;
   no se dejó ningún espacio en blanco reservado para ellas.
8. **Sin seeds.** La app arranca con el plantel vacío, por decisión del usuario.

## Lo que el hito 2 necesita saber

- `Player` **no tiene todavía** las columnas `técnica promedio`, `físico promedio`, `puntuación general` ni `elo`
  del PRD: hay que agregarlas (o calcularlas) en el hito 2. `Index.tsx` y `Show.tsx` reciben los props que
  arma `PlayersController#summary` / `#detail`; ahí es donde se agregan los números nuevos.
- Quién califica sale de `Current.user.player` (`User#player`). Una cuenta **sin** jugador ligado no es nadie
  dentro del plantel: el hito 2 tiene que decidir qué ve esa cuenta en la pantalla "Calificar"
  (lo razonable es pedirle al admin que la ligue).
- Para "nadie se califica a sí mismo", el filtro natural es `Player.active.where.not(id: Current.user.player&.id)`.
- Las bajas (`active: false`) deben quedar fuera de calificaciones y de futuros repartos: usa el scope `Player.active`.
- Los "Ajustes del grupo" (pesos de técnica y físico) todavía no existen; son del hito 2 y van tras `require_admin`,
  que ya vive en `app/controllers/concerns/authentication.rb`.
- Toda acción de mutación llamada desde el router de Inertia **debe redirigir**, nunca `head :ok` ni `render json:`.
  Excepción prevista en el hito 2: si las calificaciones se guardan solas con `fetch()` crudo (sin el router de
  Inertia), ahí sí cabe un `head :ok`.
- Al agregar pantallas públicas hay que tocar `config/sitemap.rb` y `public/llms.txt`; las de sesión solo
  necesitan su línea `Disallow:` en `public/robots.txt` (`/plantel` ya la tiene).

## Desviaciones del PRD

- **Se eliminó el Dashboard de la plantilla.** El PRD no lo pide, y el usuario decidió que el plantel fuera la
  portada; dejar las dos pantallas habría dejado una página muerta.
- **Las columnas de puntuación de `Jugador` no se crearon.** El PRD las lista en el modelo de datos, pero
  pertenecen a los hitos 2 y 4; crearlas vacías ahora solo habría invitado a usarlas antes de tiempo.

## Verificación

- `bin/rails test` → 32 corridas, 114 aserciones, 0 fallas (incluye el smoke de SSR).
- `npm run check` y `bin/rubocop` → limpios.
- Recorrido en el navegador en `http://localhost:4000` (nunca el 3000): alta, búsqueda, edición, liga de cuenta,
  baja, reactivación y ficha como administrador; y como cuenta normal, el plantel y la ficha sin ningún botón de
  administración, con `/plantel/new` rebotando. Sin errores en la consola.
- Capturas en `tmp/screenshots/` a 375 px y en escritorio.

> Ojo con el entorno: el proyecto corre con Ruby 3.3.6 (`.ruby-version`), pero el shell resuelve a 4.0.5.
> Los comandos de Rails se corrieron con `mise exec -- bin/rails …`.

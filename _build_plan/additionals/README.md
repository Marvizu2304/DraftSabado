# Adicionales

Los cuatro hitos de `_build_plan/milestones/` son la construcción inicial. Esta carpeta es para
todo lo que se hizo **después**, fuera de esos hitos: cambios pedidos por el usuario sobre la app
ya construida.

Cada adicional vive en su propia subcarpeta numerada, con el mismo formato que un hito:

- `prompt.md` — el encargo tal como llegó.
- `additional-log.md` — la bitácora: qué hay de nuevo en la app, qué se construyó, decisiones que
  no estaban en el PRD, lo que la siguiente sesión necesita saber, desviaciones y verificación.

Cuando un adicional cambia lo que la app *es* —no solo cómo está hecha— también se actualiza
`_build_plan/prd.html`. La sección «Hitos» del PRD no se toca: es el plan original y se deja como
registro histórico.

| # | Adicional | Fecha | Qué cambió |
|---|-----------|-------|------------|
| 1 | [Distribución automática de equipos](1-distribucion-automatica/additional-log.md) | 2026-10-16 | El sábado ya no se arma eligiendo un número de equipos a ciegas: la app lista las opciones de reparto que salen con los asistentes palomeados y arma la mejor para la que elijas. |

> Antes de este primer adicional hubo dos cambios que no quedaron registrados aquí porque los hizo
> otra sesión: el número de equipos por sábado creció de 2-3 a 2-6 (el tope lo marca
> `Team::COLORS`) y los seis tokens `--color-jersey-*` se documentaron en `/admin/design-system`.

---
id: laboratorio-evidencia-intervencion-h4
titulo: Registro de intervención H4
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Registro de intervención H4

- Fecha: 24 de septiembre de 2026.
- Estado inicial: rama `FirstUpgrade`, commit `e799221`. El árbol trabajaba sobre un cambio sin comprometer de `package.json`/`package-lock.json` (vitest `4.1.10` → `^4.1.11`) y la carpeta `Upgrade0/` sin seguimiento. Ninguno de los dos se creó en esta intervención.
- Objetivo: implementar la máquina de estados del guardia (H4.1 a H4.5 y cierre 6.1) según `Upgrade0/H4/plan-implementacion-h4.md`, con las decisiones 8.1 a 8.4 confirmadas por la persona.
- Herramienta: OpenCode.
- Modelo declarado: `big-pickle` (opencode).

## Decisiones confirmadas

| # | Decisión | Resolución | Control humano |
|---|---|---|---|
| 8.1 | `CAPTURED` terminal | Confirmada: evento `captured` con guarda visión válida y distancia < `CAPTURE_DISTANCE` (24 px) | Respuesta confirmatoria |
| 8.2 | INVESTIGATE sin hallazgo | Desvío documentado: mini-búsqueda (`SEARCH` con `SEARCH_RADIUS_CELLS`) en lugar de RETURN directo; causa `investigacion sin hallazgo` | Respuesta: "Mini-búsqueda al investigar" |
| 8.3 | Parámetros | `SEARCH_DURATION_MS=8000`, `SEARCH_RADIUS_CELLS=2`, `REPLAN_INTERVAL_MS=300`, `CAPTURE_DISTANCE=24` | Respuesta confirmatoria |
| 8.4 | Clic de demostración | Se retira el clic y el toggle BFS/A*; se conservan `Q` (sonido) y `R` (reinicio) | Respuesta: "Sí" |

## Decisiones de diseño surgidas en la implementación

- La guarda de visión se conserva en el evento `captured` para que el estado terminal no dependa de datos no percibidos.
- La mini-búsqueda de INVESTIGATE toma como origen la última posición conocida; si la memoria expiró durante el trayecto, cae al objetivo de la investigación (el sonido investigado) en lugar de lanzar un error.
- Se agrega `failedReturnTargets` al estado en ejecución para que RETURN se recupere explícitamente sin oscilar entre dos puntos de patrulla inaccesibles; `nearestPatrolPoint` acepta una lista de puntos excluidos.
- El patrón de búsqueda devuelve `[]` (retorno directo, causa `busqueda agotada`) cuando el origen está rodeado de paredes, según `plan-implementacion-h4.md:175`.
- PATROL salta un punto inaccesible (`route-failed` → `patrol-skip`) y continúa el ciclo con el siguiente punto válido.

## Correcciones surgidas de revisión

- El reloj simulado avanza con `deltaMs` por cuadro: las pruebas de vencimiento (`SEARCH_DURATION_MS`) avanzan el tiempo por pasos en lugar de un único salto.
- Los mapas de prueba del caso "destino inaccesible" se corrigieron para aislar de verdad el punto (paredes axiales alrededor del origen) y no confiar en paredes parciales que un guardia rodea por el borde.
- `src/game/scenes/GameScene.ts` alimenta `updateBehavior` con percepción ya validada (visión, sonido y memoria), aplica `frame.movement` y representa el plan de `state.lastPlan` sin decidir reglas de conducta.

## Límites pendientes

- No existe todavía una prueba automatizada de navegador; la verificación visual es manual y reproducible por conducta (sonido → investigar; ver → perseguir; perder visión → buscar; agotar → regresar).
- `src/application/simulation/navigationDemo.ts` quedó sin uso tras retirar el clic; se referencía en `docs/arquitectura.md` y se evaluará su remoción en H5/H6.
- La advertencia de tamaño del paquete Phaser se acepta para el laboratorio y se revisará en integración final.
- Las modificaciones de `package.json`/`package-lock.json` (vitest) son previas a la intervención y no se descartan ni se comprometen aquí.

Sin commits: la rama `FirstUpgrade` conserva solo el commit inicial `e799221`.
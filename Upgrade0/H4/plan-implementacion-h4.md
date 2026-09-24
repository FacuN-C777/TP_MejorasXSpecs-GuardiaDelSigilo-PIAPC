---
id: plan-implementacion-h4
titulo: Plan de implementacion H4 - Maquina de estados del guardia
tipo: plan
audiencia: agente-de-desarrollo
acceso: publico
version: 1
---

# Plan de implementacion H4

Objetivo de este documento: guiar una sesion nueva e independiente para implementar el hito H4 (maquina de estados) sin depender de la conversacion previa que lo origino. El documento es autocontenido para la tarea de codificacion; las restricciones canonicas viven en `specs/`, `docs/` y `AGENTS.md` y se referencian, no se duplican.

## 1. Metadatos

| Campo | Valor |
|---|---|
| Proyecto | PIAPC 2026 - Laboratorio Guardia de Sigilo |
| Hito | H4. Maquina de estados (`docs/hitos.md:54-85`) |
| Rama de trabajo | `FirstUpgrade` |
| Criterio de aceptacion global | `npm run validate` finaliza sin errores y las transiciones pueden reproducirse mediante una secuencia documentada |

## 2. Punto de partida

H0 a H3 estan implementados segun `README.md:16`. La maquina de estados se incorpora en H4.

### 2.1 Capacidades existentes

| Capacidad | Ruta | Responsable |
|---|---|---|
| Cuadricula y mapa | `src/domain/model/grid.ts`, `src/application/simulation/labLevel.ts` | Nivel (mapa 30x20, `TILE_SIZE=32`, `GUARD_START={27,17}`, `PLAYER_START={2,2}`) |
| BFS y A* | `src/domain/navigation/search.ts` | Busqueda de rutas (estados `success`, `unreachable`, `invalid-start`, `invalid-goal`) |
| Grafo de vecinos | `src/domain/navigation/gridGraph.ts` | Vecindad cardinal transitable |
| Seguimiento de caminos | `src/domain/navigation/pathFollower.ts` | Locomocion sobre waypoints puros (`advanceAlongPath`) |
| Vision con oclusion | `src/domain/perception/perception.ts` | `evaluateVision` |
| Sonido | `src/domain/perception/perception.ts` | `evaluateSound` |
| Memoria de percepcion | `src/domain/perception/memory.ts` | `rememberObservation`, `timeSinceLastPerception`; prioriza vision en empate (lineas 38-41) |
| Coordinacion de sensores | `src/application/simulation/perceptionSimulation.ts` | Agrega vision+sonido+memoria por cuadro |
| Escena / adaptador Phaser | `src/game/scenes/GameScene.ts` | Entrada, fisica, presentacion y HUD |

### 2.2 Carencias que cierra H4

| Carencia | Evidencia |
|---|---|
| Maquina de estados (Patrullar, Investigar, Perseguir, Buscar, Regresar) | No existe `src/domain/behavior/`; la escena solo actualiza memoria (`GameScene.ts:283-300`), no decide conducta |
| Telemetria estructurada por transicion | `docs/arquitectura.md:100-102` la define; no existe `src/domain/telemetry/`. Solo hay HUD de texto (`GameScene.ts:335-350`) |
| Puntos de patrulla configurables | `labLevel.ts` no define ninguno; el guardia solo se mueve al hacer clic (`GameScene.ts:207-238`) |
| Captura del jugador | La pide `specs/01-producto.md:53`; no existe distancia de captura ni estado terminal |

### 2.3 Lugar exacto donde H4 interviene

El limite del hito H3 esta declarado en `docs/h3-percepcion-movimiento.md:60`: "Ver u oir al jugador actualiza memoria, pero no inicia persecucion o investigacion. Las transiciones autonomas se incorporan en H4." H4 debe conservar intactos los contratos de `src/domain/perception/*`, `src/domain/navigation/search.ts`, `src/domain/navigation/pathFollower.ts` y `src/domain/model/*`.

## 3. Restricciones obligatorias

- `src/domain/` no importa Phaser, DOM ni APIs de navegador (`AGENTS.md:12`).
- `src/application/` coordina casos de uso y no representa la escena (`AGENTS.md:13`).
- `src/game/` adapta Phaser y no decide reglas de comportamiento (`AGENTS.md:14`).
- Percepcion, memoria, decision, busqueda, seguimiento y locomocion permanecen separados; la decision no lee posiciones del jugador no percibidas.
- Vision tiene prioridad sobre sonido; la ultima posicion conocida cambia solo ante una percepcion valida (`specs/01-producto.md:125`).
- Cada transicion produce telemetria observable.
- No se agregan dependencias, no se usa red, no se accede a secretos, no se publica.
- Cada hito intermedio concluye con `npm run validate` (`AGENTS.md:20`).

## 4. Fundamentos previos (se crean antes de H4.1)

| Elemento | Ruta propuesta | Contrato minimo |
|---|---|---|
| Tipos de estado y evento | `src/domain/behavior/guardFsm.ts` | `GuardState`, `GuardEvent`, tipos de `cause`, funcion `transition(state, event, guard) -> result` |
| Nucleo FSM | `src/domain/behavior/guardFsm.ts` | Evaluar eventos, aplicar guardas, devolver `{state, action, cause}` |
| Patron de busqueda | `src/domain/behavior/searchPattern.ts` | Generar anillos de celdas transitables alrededor de un origen (separa *busqueda conductual* de `domain/navigation/search.ts`) |
| Seleccion de puntos de patrulla | `src/domain/behavior/patrol.ts` | Ciclo ordenado y salto ante puntos no transitables |
| Telemetria | `src/domain/telemetry/events.ts`, `src/domain/telemetry/log.ts` | Evento `{timeMs, previousState, event, newState, cause}`; log en memoria |
| Coordinacion | `src/application/simulation/behaviorSimulation.ts` | Recibe cuadro de percepcion + reloj + memoria; emite estado, accion deseada y transiciones |
| Puntos de patrulla | `src/application/simulation/labLevel.ts` | `PATROL_POINTS = [{27,17},{20,17},{20,12},{27,12}]`; se verifican transitables y alcanzables por test |
| Parametros | `src/application/simulation/labLevel.ts` | Constantes junto a las existentes (`GameScene.ts:24-29`): `SEARCH_DURATION_MS=8000`, `SEARCH_RADIUS_CELLS=2`, `REPLAN_INTERVAL_MS=300`, `CAPTURE_DISTANCE=24` |

## 5. Contrato FSM completo

Estados: `PATROL`, `INVESTIGATE`, `PURSUE`, `SEARCH`, `RETURN`, `CAPTURED` (terminal, ver seccion 8).

Eventos: `start`, `vision-valid`, `vision-lost`, `sound-heard`, `route-completed`, `route-failed`, `target-differs`, `search-exhausted`, `patrol-advance`, `captured`, `reset`.

| Origen | Evento | Guarda | Destino | Accion | Causa de telemetria |
|---|---|---|---|---|---|
| PATROL | `start` | inicial | PATROL | tomar punto de patrulla inicial; planificar | inicio |
| PATROL | `patrol-advance` | llegada a punto actual | PATROL | avanzar al siguiente punto ciclico; planificar | llegada patrulla |
| PATROL | `vision-valid` | percepcion visual valida | PURSUE | memorizar vision; objetivo = jugador percibido; planificar | vision |
| PATROL | `sound-heard` | sin vision; sonido activo en radio | INVESTIGATE | memorizar sonido; objetivo = ultima posicion conocida; planificar | sonido |
| PATROL | `route-failed` | punto de patrulla bloqueado/inaccesible | PATROL | saltar al siguiente punto valido; telemetria fracaso | patrulla inaccesible |
| INVESTIGATE | `sound-heard` | sin vision; nuevo sonido | INVESTIGATE | re-objetivar al nuevo sonido; replanificar | sonido reactualizado |
| INVESTIGATE | `vision-valid` | percepcion visual valida | PURSUE | memorizar vision; objetivo = jugador; replanificar | vision |
| INVESTIGATE | `route-completed` | llego al punto de interes sin percepcion | RETURN | elegir punto de patrulla valido; planificar | investigacion sin hallazgo |
| INVESTIGATE | `route-failed` | destino inaccesible | RETURN | recuperar a patrulla; telemetria fracaso | destino inaccesible |
| PURSUE | `vision-valid` | percepcion vigente | PURSUE | mantener/actualizar objetivo; replanificar solo si cambia | actualizacion |
| PURSUE | `target-differs` | jugador cambio de celda o vencio intervalo | PURSUE | replanificar hacia nueva posicion percibida | replanificacion |
| PURSUE | `vision-lost` | percepcion deja de ser valida | SEARCH | objetivo = ultima posicion conocida; inicializar patron + temporizador | perdida de vision |
| PURSUE | `captured` | distancia < captura | CAPTURED | detener navegacion; emitir telemetria | captura |
| SEARCH | `vision-valid` | percepcion valida | PURSUE | reanudar persecucion; memorizar | vision recuperada |
| SEARCH | `sound-heard` | sin vision; sonido activo | INVESTIGATE | apuntar al sonido | sonido durante busqueda |
| SEARCH | `patrol-advance` | punto de patron completado | SEARCH | siguiente punto del patron / reiniciar patron | avance de busqueda |
| SEARCH | `search-exhausted` | vencio tiempo o agoto el patron | RETURN | volver a patrulla | busqueda agotada |
| SEARCH | `route-failed` | punto de busqueda inalcanzable | RETURN | recuperar; telemetria fracaso | busqueda inaccesible |
| RETURN | `route-completed` | llego al punto de patrulla | PATROL | reanudar ciclo desde ese punto | regreso completado |
| RETURN | `route-failed` | punto de patrulla inaccesible | RETURN | elegir otro punto valido | regreso inaccesible |
| RETURN | `vision-valid` | percepcion valida | PURSUE | interrumpir regreso | vision durante regreso |
| RETURN | `sound-heard` | sin vision | INVESTIGATE | investigar sonido | sonido durante regreso |
| cualquiera | `reset` | reinicio | PATROL | restaurar estado y memoria iniciales | reinicio |

### 5.1 Invariantes que la FSM debe mantener

De `specs/01-producto.md:123-129`:

- Un guardia capturado o deshabilitado no continua navegando (estado `CAPTURED` terminal).
- La ultima posicion conocida cambia solo ante una percepcion valida.
- Una ruta nunca contiene celdas bloqueadas.
- El estado informado coincide con el comportamiento ejecutado.
- Regresar a patrulla conduce a un punto valido.
- El jugador y el guardia permanecen dentro del mapa.

### 5.2 Casos limite que ejercitan la tabla

- Inicio igual a destino (ruta de una celda, `totalCost=0`).
- Destino inaccesible (`route-failed` en cualquier estado).
- Jugador detras de una pared dentro del cono (vision `occluded`, no persigue).
- Sonido y vision en el mismo instante (vision gana; coherente con `memory.ts:38-41`).
- Perdida de vision durante una ruta (`vision-lost` desde PURSUE).
- Cambio de objetivo con una ruta activa (`target-differs`).
- Punto de patrulla bloqueado (salto al siguiente valido).
- Reinicio mientras el guardia persigue (`reset`).

## 6. Plan incremental H4.1 a H4.5

Reglas comunes a todo hito: los modulos de dominio son puros y reciben reloj/entrada inyectados; las rutas se planifican por evento (no por cuadro) salvo la replanificacion de PURSUE; cada transicion registra telemetria; el hito cierra con `npm run validate`.

### H4.1 Patrullar

- Transiciones: `start`, `patrol-advance`, `route-failed` desde PATROL.
- Origen/Evento/Guarda/Destino/Accion: PATROL / `patrol-advance` / punto actual alcanzado / PATROL / avanzar al siguiente punto ciclico y planificar con A*.
- Informacion permitida: mapa, puntos de patrulla, posicion propia. Prohibida: posicion del jugador.
- Ruta: planificar una vez por tramo; conservar hasta llegar o fallar.
- Destino inaccesible: saltar al siguiente punto valido y registrar `route-failed` (cubre "punto de patrulla bloqueado").
- Prueba camino principal: el ciclo recorre los puntos en orden y registra llegada y seleccion del siguiente.
- Caso limite: destino = celda actual; punto bloqueado -> salto.
- Archivos: `src/domain/behavior/guardFsm.ts`, `src/domain/behavior/patrol.ts`, `src/domain/telemetry/*`, `src/application/simulation/behaviorSimulation.ts`, `src/application/simulation/labLevel.ts`, `src/game/scenes/GameScene.ts`, `tests/behavior/patrol.test.ts`, `tests/application/behaviorSimulation.test.ts`.

### H4.2 Investigar

- Transiciones: PATROL -> INVESTIGATE (`sound-heard`), INVESTIGATE -> INVESTIGATE (`sound-heard` actualizado), INVESTIGATE -> PURSUE (`vision-valid`), INVESTIGATE -> RETURN (`route-completed` o `route-failed`).
- Origen/Evento/Guarda/Destino/Accion: PATROL / `sound-heard` / sin vision valida; sonido activo en radio / INVESTIGATE / memorizar sonido y dirigirse a la ultima posicion conocida.
- Informacion permitida: memoria (origen `sound`, posicion, antiguedad), evento sonoro activo, mapa. Prohibida: coordenadas del jugador (RF-04: "sin usar informacion no percibida").
- Ruta: una sola planificacion al entrar; se re-planifica solo con nuevo sonido o vision.
- Destino inaccesible: `route-failed` -> RETURN.
- Prueba camino principal: sonido en radio -> el guardia viaja al origen del evento y registra llegada.
- Caso limite: sonido y vision simultaneos -> gana la vision y va a PURSUE.
- Archivos: `src/domain/behavior/guardFsm.ts`, `src/domain/telemetry/*`, `src/application/simulation/behaviorSimulation.ts` (evento de sonido), `src/game/scenes/GameScene.ts`, `tests/behavior/investigate.test.ts`.

### H4.3 Perseguir

- Transiciones: PATROL/INVESTIGATE/SEARCH/RETURN -> PURSUE (`vision-valid`), PURSUE -> PURSUE (`vision-valid` / `target-differs`), PURSUE -> CAPTURED (`captured`), PURSUE -> SEARCH (`vision-lost`).
- Origen/Evento/Guarda/Destino/Accion: PATROL / `vision-valid` / percepcion visual valida (rango+cono+sin oclusion) / PURSUE / memorizar vision y perseguir.
- Informacion permitida: posicion percibida del jugador (del sensor validado), memoria, mapa. Prohibida: posicion real del jugador fuera de percepcion valida.
- Ruta: replanificar solo cuando el objetivo cambia de celda o vence `REPLAN_INTERVAL_MS`; conservar la ruta activa el resto del tiempo.
- Destino inaccesible: `route-failed` -> RETURN con telemetria de fracaso.
- Prueba camino principal: jugador visible -> guardia actualiza memoria (fuente `vision`) y lo sigue; se verifica que no replanifica en cada cuadro.
- Caso limite: reinicio durante la persecucion (R) -> vuelve a PATROL con memoria limpia; jugador tras pared dentro del cono -> `occluded`, no persigue.
- Archivos: `src/domain/behavior/guardFsm.ts`, `src/domain/telemetry/*`, `src/application/simulation/behaviorSimulation.ts`, `src/game/scenes/GameScene.ts`, `tests/behavior/pursue.test.ts` (incluye `captured` si se confirma la decision 8.1).

### H4.4 Buscar

- Transiciones: PURSUE -> SEARCH (`vision-lost`), SEARCH -> SEARCH (`patrol-advance`), SEARCH -> PURSUE (`vision-valid`), SEARCH -> INVESTIGATE (`sound-heard`), SEARCH -> RETURN (`search-exhausted` / `route-failed`).
- Origen/Evento/Guarda/Destino/Accion: PURSUE / `vision-lost` / memoria con ultima posicion conocida no nula / SEARCH / generar patron de anillos de celdas transitables (radio `SEARCH_RADIUS_CELLS`) y recorrerlo con temporizador `SEARCH_DURATION_MS`.
- Informacion permitida: ultima posicion conocida, mapa, reloj. Prohibida: posicion real del jugador (el guardia "no sabe" donde esta).
- Ruta: patron planificado al entrar; conservar mientras se recorre; interrumpir y cambiar si reaparece vision o suena un sonido.
- Vencimiento: `search-exhausted` -> RETURN. Punto de busqueda inalcanzable -> `route-failed` -> RETURN. Ultima posicion rodeada de paredes -> patron vacio -> RETURN directo.
- Prueba camino principal: pierde vision a mitad de persecucion -> busca alrededor de la ultima posicion -> agota -> regresa.
- Caso limite: percepcion recuperada durante la busqueda -> PURSUE y reseteo del temporizador.
- Archivos: `src/domain/behavior/searchPattern.ts`, `src/domain/behavior/guardFsm.ts`, `src/domain/telemetry/*`, `src/application/simulation/behaviorSimulation.ts`, `src/game/scenes/GameScene.ts`, `tests/behavior/searchPattern.test.ts`, `tests/behavior/search.test.ts`.

### H4.5 Regresar

- Transiciones: INVESTIGATE (`route-completed`/`route-failed`) y SEARCH (`search-exhausted`/`route-failed`) -> RETURN; RETURN -> PATROL (`route-completed`); RETURN -> RETURN (`route-failed`); RETURN -> PURSUE (`vision-valid`); RETURN -> INVESTIGATE (`sound-heard`).
- Origen/Evento/Guarda/Destino/Accion: SEARCH / `search-exhausted` / existe al menos un punto de patrulla valido / RETURN / elegir el punto mas cercano (o el del ciclo) y navegar a el.
- Informacion permitida: puntos de patrulla, mapa, posicion propia. Prohibida: posiciones del jugador (salvo interrupcion por vision).
- Ruta: planificar una vez; ante `route-failed`, recuperarse explicitamente (elegir otro punto valido y registrar la transicion).
- Destino inaccesible: `route-failed` -> nuevo objetivo de patrulla valido; si ninguno existe, detenerse con telemetria de incapacidad.
- Prueba camino principal: tras busqueda agotada, vuelve al punto de patrulla y reanuda el ciclo registrando `route-completed`.
- Caso limite: punto de patrulla inaccesible -> elige otro valido y registra el fracaso; retorno interrumpido por vision -> PURSUE.
- Archivos: `src/domain/behavior/guardFsm.ts`, `src/domain/telemetry/*`, `src/application/simulation/behaviorSimulation.ts`, `src/game/scenes/GameScene.ts`, `tests/behavior/return.test.ts`.

### 6.1 Cierre de H4 (integracion)

Secuencia canonica end-to-end de dominio: `PATROL -> INVESTIGATE -> PURSUE -> SEARCH -> RETURN -> PATROL`, mas los caminos de fallo (destinos inaccesibles). La escena deja de aceptar clic como destino (decision 8.4) y muestra estado actual, anterior y ultima causa en el HUD.

## 7. Estrategia de pruebas y evidencia

- Dominio (Vitest, Node, sin Phaser): `tests/behavior/patrol.test.ts`, `investigate.test.ts`, `pursue.test.ts`, `search.test.ts`, `searchPattern.test.ts`, `return.test.ts`, `guardFsm.test.ts`, `telemetry.test.ts`.
- Aplicacion: `tests/application/behaviorSimulation.test.ts` simulando cuadros (tiempo inyectado + percepcion) sobre `LAB_MAP`, incluida la secuencia canonica y los destinos inaccesibles.
- Regresion H3: no se modifican contratos de `perception`, `memory`, `search` ni `pathFollower`; sus pruebas siguen valiendo.
- Verificacion visual manual: escenarios reproducibles por conducta (sonido -> investigar; ver -> perseguir; perder vision -> buscar; agotar -> regresar). Limitacion conocida: no existe prueba automatizada de navegador.
- Evidencia: registrar intervencion y validacion en `docs/evidencias/h4-*.md` usando `docs/plantillas/registro-intervencion.md` y `docs/plantillas/evidencia-pruebas.md`.
- Puerta de cada hito: `npm run validate` (typecheck + test:run + build).

## 8. Decisiones asumidas (estado: confirmables)

| # | Decision | Valor asumido | Justificacion | Estado |
|---|---|---|---|---|
| 8.1 | `CAPTURED` como estado terminal | Evento `captured` con guarda vision valida y distancia < `CAPTURE_DISTANCE` (24 px) | Satisface `specs/01-producto.md:53` y el invariante `:124` sin tocar contratos H3 | Confirmable al iniciar la sesion de codigo |
| 8.2 | INVESTIGATE sin hallazgo | Va a RETURN directo (sin mini-busqueda) | Evita duplicar la busqueda acotada que es exclusiva de SEARCH | Confirmable; alternativa: mini-busqueda si la validacion visual lo pide |
| 8.3 | Parametros por defecto | `SEARCH_DURATION_MS=8000`, `SEARCH_RADIUS_CELLS=2`, `REPLAN_INTERVAL_MS=300`, `CAPTURE_DISTANCE=24` | Valores razonables para un mapa 30x20 y guardia a 115 px/s | Confirmable |
| 8.4 | Clic de demostracion | Se retira en H4; se conservan `Q` (sonido) y `R` (reset) | Mantenerlo complica el invariante "el estado informado coincide con el ejecutado" | Confirmable |

## 9. Condiciones para detenerse y consultar

Replica de `docs/permisos-recomendados.md:28-38`, aplicadas a H4:

1. Ambiguedad con efectos distintos en criterios de aceptacion: confirmar decisiones 8.1-8.4 antes de codificar.
2. Cambios concurrentes en los archivos de la tabla de H4 o en contratos H3.
3. `npm run validate` que falle por causa no comprendida.
4. Accion que requiera credenciales, publicacion, instalacion de dependencias o perdida de informacion.
5. Cruce de limite arquitectonico (ej.: Phaser en `domain/`, o decision de comportamiento en `game/`) sin registro documentado.

No se crean commits, commits de tabajo ni publicaciones sin autorizacion humana explicita.
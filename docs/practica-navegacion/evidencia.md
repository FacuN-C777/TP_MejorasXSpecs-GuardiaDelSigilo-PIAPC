# Evidencia — práctica de navegación

Repositorio: (https://github.com/FacuN-C777/TP_MejorasXSpecs-GuardiaDelSigilo-PIAPC.git)
Commit inicial: 71d78fee157519c5070f9421c28a7c60dd51e18c
Commit de implementación: 3691f3daadf5ed3268e046a39d7d726cade8662a
Versión de entrega: commit final de entrega en repo.
Variante: A (única)
Herramienta/modelo o trabajo manual: opencode (modelo `opencode/big-pickle`); asistencia por agente con revisión humana.
Cambios previos: sin cambios versionados en `src/` ni `tests/` respecto de HEAD. Sin seguimiento: `docs/practica-navegacion/`.
Línea base: `npm run test:run -- tests/navigation` → 2 archivos, 15 pruebas aprobadas.
Validación de cierre (incremento 3, autorizada): `npm run validate` → typecheck OK, 24 archivos / 178 pruebas aprobadas, build OK (sólo aviso no bloqueante de chunk > 500 kB).

## Exploración mínima

| Capa        | Ruta/símbolo                                                                                                         | Capacidad comprobada                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Búsqueda    | `src/domain/navigation/search.ts:24,64` `findPathBfs`/`findPathAStar`                                                | A\* unitario y BFS devuelven estado, ruta, pasos, costo y métricas; consumibles en Node sin Phaser |
| Seguimiento | `src/domain/navigation/pathFollower.ts:10` `advanceAlongPath`                                                        | Consume varios puntos por actualización y no depende de Phaser                                     |
| Consumidor  | `src/application/simulation/behaviorSimulation.ts:562,567` `planRoute`→`findPathAStar`                               | Toma el `SearchResult`, lo expone en `lastPlan` y arma waypoints de la ruta                        |
| Pruebas     | `tests/navigation/search.test.ts`, `tests/navigation/pathFollower.test.ts`, `tests/navigation/commonFixture.test.ts` | Cobertura unitaria y fixture común 5x3 ejecutables con Vitest                                      |

Contraste y decisión humana: contrasté supuestos del Anexo A con el código y decidí
`totalCost` = suma ponderada (default 1), costos opcionales en `GridMap` y consumidor
`behaviorSimulation.planRoute`.
Spec/plan aprobados: spec.md en `Estado: Aprobada`; plan.md en `Estado: Aprobado`.

## Comparación común — fixture libre 5x3

Vecinos y desempate reales: vecinos cardinales en orden arriba, derecha, abajo,
izquierda (`gridGraph.ts:3-8`); BFS desempata por orden de encolado; A\* por menor
costo+heurística, luego menor heurística, luego orden de inserción (`search.ts:137-155`).
| Algoritmo | Estado | Ruta | Pasos | Costo | Expandidos | Frontera máxima |
|---|---|---|---:|---:|---:|---:|
| BFS | success | (0,1)→(1,1)→(2,1)→(3,1)→(4,1) | 4 | 4 | 12 | 4 |
| A\* | success | (0,1)→(1,1)→(2,1)→(3,1)→(4,1) | 4 | 4 | 5 | 9 |
DFS: con pila e inserción de vecinos en orden inverso recorre S→A→C→X→G y alcanza
la meta por la primera rama profunda, sin explorar B. Límite: no garantiza el mínimo
de pasos ni de costo; devuelve la primera meta alcanzada (aquí de 4 pasos, aunque
S→B→D→G tendría 3), no la óptima.
Dijkstra: extraer S=0 descubre A=1 y B=3; extraer A=1 descubre G=10 (1+9); extraer
B=3 mejora G=6 (3+3 < 10); al extraer la entrada válida de G la ruta es S→B→G con
costo 6. Descubrir la meta no fija su costo óptimo: una entrada vieja de costo 10
se descarta cuando aparece una mejor de costo 6.
Nota de unidades: el costo ponderado es una penalización de diseño, no una
probabilidad de detección ni una medida en decibeles; su intención debe documentarse.

## Anexo A — terreno lento (fixture fijo)

Fixture: misma cuadrícula 5x3, S=(0,1), G=(4,1), sin celdas bloqueadas; costo de
entrada 5 en (1,1),(2,1),(3,1) y 1 en el resto; el inicio no suma costo.
Resultados reales con Vitest (`tests/navigation/weightedTerrain.test.ts` y
`tests/application/behaviorSimulation.test.ts`):

| Caso                         | Entrada      |     Pasos |         Costo | Criterio |
| ---------------------------- | ------------ | --------: | ------------: | -------- |
| Ruta directa (contrafactual) | franja lenta |         4 | 16 (=5+5+5+1) | A-AC1    |
| A\* ponderado                | franja lenta | 6 (rodeo) |             6 | A-AC1    |
| BFS (no pondera)             | franja lenta |         4 |             4 | A-01     |
| A\* unitario                 | sin franja   |         4 |             4 | A-AC2    |
| A\* tras restaurar a costo 1 | franja = 1   |         4 |             4 | A-04     |
| Consumidor `planRoute`       | franja lenta |         6 |             6 | A-AC3    |
| Consumidor `planRoute`       | sin franja   |         4 |             4 | A-AC3    |

Validación de costos: `createGridMap` rechaza costos no enteros o menores que 1,
lo que mantiene admisible la heurística Manhattan (costo mínimo 1).

## Criterio → evidencia

| Criterio              | Prueba / comando                                                   | Observado                                                                                   | Limitación                                                                                                 | Estado                                 |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| BASE-AC1              | `git rev-parse HEAD`; exploración (arriba)                         | commit 71d78fe; capas, rutas y cambios previos registrados                                  | cifra previa 23/169 como referencia; el cierre real es 24/178 (BASE-AC5); supuesto vs observado es textual | Cumple                                 |
| BASE-AC2              | `npm run test:run -- tests/navigation/commonFixture.test.ts`       | 13 pruebas: BFS y A\* 4 pasos/costo 4; BFS 12/4; A\* 5/9; A\* < BFS                         | la traza DFS/Dijkstra es texto guía, no ejecutable por comando                                             | Cumple                                 |
| BASE-AC3              | mismo comando                                                      | inicio=meta success costo 0; barrera `unreachable`; extremos `invalid-start`/`invalid-goal` | —                                                                                                          | Cumple                                 |
| BASE-AC4              | lectura de `spec.md`/`plan.md`                                     | `Estado: Aprobada` / `Estado: Aprobado`; sólo anexo A                                       | la aprobación es acto humano; se observa el estado declarado, no verificable por herramienta               | Cumple                                 |
| A-AC1 (normal/límite) | `npm run test:run -- tests/navigation`                             | 35 pruebas: directa 4/16; A\* rodeo 6/6; el test rechaza una ruta que pise la franja        | el rodeo por arriba o abajo es un empate aceptado; no se exige ruta única                                  | Cumple                                 |
| A-AC2 (normal)        | `tests/navigation/weightedTerrain.test.ts`                         | sin franja: 4 pasos, costo 4                                                                | —                                                                                                          | Cumple                                 |
| A-01 (límite)         | mismo comando                                                      | BFS sobre mapa con franja: 4 pasos, costo 4 (ignora costos)                                 | BFS no es oráculo del mínimo ponderado (por diseño)                                                        | Cumple                                 |
| A-04 (límite)         | mismo comando                                                      | franja a costo 1 → 4 pasos, costo 4                                                         | —                                                                                                          | Cumple                                 |
| A-AC3 (consumidor)    | `npm run test:run -- tests/application/behaviorSimulation.test.ts` | 9 pruebas: `planRoute` 6/6 con franja y 4/4 sin franja                                      | el consumidor hereda la ponderación al viajar los costos en `GridMap`; la FSM no se tocó                   | Cumple                                 |
| Validación de costos  | `weightedTerrain.test.ts`                                          | `createGridMap` lanza en costo 0 y 1.5                                                      | —                                                                                                          | Cumple                                 |
| BASE-AC5              | `npm run validate`; `git diff`                                     | EXIT=0; 24 archivos / 178 pruebas; build OK; diff acotado                                   | aviso no bloqueante de chunk > 500 kB                                                                      | Cumple                                 |
| BASE-AC6              | URL + tres documentos + commit final                               | URL y 3 documentos presentes                                                                | falta el commit final (no autorizado)                                                                      | Pendiente (requiere commit autorizado) |

## Registro mínimo de intervención

Prompts por paso de la guía (resumen; no se transcribe el chat):

- Paso de exploración y línea base: leer `specs/01-producto.md`, `docs/arquitectura.md` y `AGENTS.md`; `git rev-parse HEAD`; `npm run test:run -- tests/navigation` (línea base: 2 archivos, 15 pruebas).
- Paso de comparación BFS/A\* y trazas DFS/Dijkstra: fijar el fixture 5x3 y registrar las métricas reales.
- Paso de adaptación de la spec y del plan: aprobar `spec.md` y `plan.md` antes de editar; elegir la variante A.
- Paso de variante (Anexo A): pedir la mínima modificación por incrementos y autorizar sólo los archivos previstos.
- Paso de validación: prueba enfocada por incremento y `npm run validate`; revisar el diff.
- Paso de entrega: completar los tres documentos y declarar limitaciones.

Modificaciones importantes por incremento:

- Incremento 1: `GridMap.costs` opcional; `createGridMap` valida costo entero ≥ 1; nuevo `entryCost`; A\* suma el costo de entrada; `totalCost` ponderado con default 1 (BFS sigue contando pasos). Prueba: `tests/navigation/weightedTerrain.test.ts`.
- Incremento 2: `tests/application/behaviorSimulation.test.ts` verifica que `planRoute` hereda el modo ponderado desde `input.map` (6/6 con franja, 4/4 sin franja). Sin cambios en `src/` ni en la firma de `planRoute`.
- Incremento 3: `npm run validate` (24 archivos / 178 pruebas); revisión de diff y cierre de esta evidencia.

Decisiones humanas: aceptar los tres incrementos; autorizar la corrección de la cifra en BASE-AC1; no autorizar commits ni publicación.
Validación final: `npm run validate` → typecheck OK, 24 archivos / 178 pruebas, build OK.
Diff revisado: `src/domain/model/grid.ts` (+18/−1), `src/domain/navigation/search.ts` (+5/−4), `tests/application/behaviorSimulation.test.ts` (+44/−1); nuevos `tests/navigation/weightedTerrain.test.ts` y `tests/navigation/commonFixture.test.ts`.
Conclusión: en terreno lento conviene A\* con costo ponderado porque minimiza el costo de desplazamiento y evita la franja cara, mientras BFS sólo minimiza pasos. La ponderación viaja dentro de `GridMap`, se activa con configuración explícita y reutiliza la heurística Manhattan (admisible con costo mínimo 1). El caso unitario previo queda intacto porque el costo por defecto es 1. Se conserva una sola variante: A.
Limitaciones: BASE-AC6 sin commit (no autorizado); la traza DFS/Dijkstra es texto guía no ejecutable; el mapa del laboratorio aún no usa costos; el costo es una penalización de diseño, no una probabilidad de detección; el hash de commit final se declarará en la entrega.

## Mapa de capacidades

| Capa              | Ruta / símbolo                                                                                 | Capacidad existente                                                                                                | Evidencia                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| domain/navigation | `src/domain/navigation/gridGraph.ts:10` `walkableNeighbors`                                    | Grafo implícito de 4 vecinos cardinales filtrando celdas bloqueadas                                                | lectura directa, `CARDINAL_DIRECTIONS` en :3     |
| domain/navigation | `src/domain/navigation/gridGraph.ts:26` `manhattanDistance`                                    | Heurística Manhattan (admisible para movimiento cardinal unitario)                                                 | uso en search.ts:75,110                          |
| domain/navigation | `src/domain/navigation/search.ts:24` `findPathBfs`                                             | BFS no informado, como referencia, cola por índice                                                                 | search.test.ts:15                                |
| domain/navigation | `src/domain/navigation/search.ts:64` `findPathAStar`                                           | A\* costo unitario + Manhattan, desempate determinista                                                             | search.test.ts:16,74                             |
| domain/navigation | `src/domain/navigation/search.ts:5-15` `SearchStatus`/`SearchResult`                           | Estados success/unreachable/invalid-start/invalid-goal y path, totalCost, expandedNodes, maximumFrontier, explored | search.test.ts:41-68                             |
| domain/navigation | `src/domain/navigation/pathFollower.ts:10` `advanceAlongPath`                                  | Seguimiento: consume varios puntos por actualización, realinea a centro, reporta fin y dirección                   | pathFollower.test.ts:9-65                        |
| domain/model      | `src/domain/model/grid.ts:16,48,52,63` `createGridMap`,`isWalkable`,`cellCenter`,`worldToCell` | Cuadrícula con celdas bloqueadas validada y conversión celda↔mundo                                                 | tests/model/grid.test.ts:10-39                   |
| domain/model      | `src/domain/model/vector.ts:6,12,21` `distanceBetween`,`normalized`,`assertFiniteVector`       | Geometría finita reutilizada por seguimiento                                                                       | uso en pathFollower.ts:1,36                      |
| application       | `src/application/simulation/navigationDemo.ts:9` `calculateRoute`                              | Selección BFS/A\* para demostración; sin consumidores actuales                                                     | docs/evidencias/h4-intervencion.md:44            |
| application       | `src/application/simulation/behaviorSimulation.ts:562,567` `planRoute`→`findPathAStar`         | Consumidor de búsqueda: planifica y guarda `SearchResult` en `lastPlan`                                            | behaviorSimulation.ts:567, h4-intervencion.md:39 |
| application       | `src/application/simulation/behaviorSimulation.ts:214` `advanceAlongPath`                      | Consumidor de seguimiento: locomoción por velocidad·delta                                                          | behaviorSimulation.ts:214-228                    |
| application       | `src/application/simulation/behaviorSimulation.ts:137` `updateBehavior`                        | FSM + plan + locomoción; salida `BehaviorFrame`                                                                    | behaviorSimulation.test.ts:35                    |
| application       | `src/application/simulation/labLevel.ts:3-13,64` `LAB_MAP`,`PATROL_POINTS`,`TILE_SIZE`         | Mapa 30×20, 4 puntos de patrulla, inicio guardia/jugador                                                           | behaviorSimulation.test.ts:24-33                 |
| game (adaptador)  | `src/game/scenes/GameScene.ts:420` `drawBehaviorPlan`                                          | Representa `explored` y `path` de `state.lastPlan`; no decide navegación                                           | GameScene.ts:421-454                             |
| game (adaptador)  | `src/game/scenes/GameScene.ts:298,336` `updateGuardBehavior`                                   | Llama a `updateBehavior` y aplica `movement.position` al sprite                                                    | GameScene.ts:306-336                             |
| tests             | `tests/navigation/search.test.ts`                                                              | Óptimo, inicio=destino, endpoints inválidos, inalcanzable, A\*≤BFS                                                 | :18,:30,:41,:50,:71                              |
| tests             | `tests/navigation/pathFollower.test.ts`                                                        | Parcial, multi-waypoint, realineación, fin, sin movimiento, entradas inválidas                                     | :10-65                                           |
| tests             | `tests/navigation/commonFixture.test.ts` (nuevo en esta práctica)                              | Fixture común 5x3: BFS/A\* unitarios y casos límite (BASE-02/03/04)                                                | 13 pruebas                                       |
| tests             | `tests/navigation/weightedTerrain.test.ts` (nuevo en esta práctica)                            | Anexo A: costo ponderado, restauración a costo 1 y validación de costos                                            | 7 pruebas                                        |
| tests             | `tests/application/behaviorSimulation.test.ts`                                                 | Alcanzabilidad de patrullas en `LAB_MAP`, ciclo canónico y consumidor ponderado                                    | :24,:35,:88 + bloque A-AC3                       |
| tests             | `tests/support/behaviorSimRunner.ts:46` `BehaviorSimulator`                                    | Arnés de simulación por frames para consumir navegación + FSM                                                      | :78-111                                          |
| tests             | `tests/behavior/*` (10 archivos)                                                               | FSM, patrulla, búsqueda, retorno, persecución, telemetría, escape                                                  | guardFsm.test.ts:32+                             |

## Preguntas para el armado de spec y plan

- ¿Confirmás la variante a documentar en la spec? → A - terreno lento.
- A-AC1 exige costo 16 (directo) y 6 (rodeo), pero `search.ts:176` define `totalCost = pasos`. ¿Cómo represento el costo? → Redefinir `totalCost` = suma ponderada, default 1.
- ¿Dónde vive el costo de entrada de cada celda? → Extender `GridMap` con costos opcionales.

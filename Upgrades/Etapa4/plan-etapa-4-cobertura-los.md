---
id: plan-etapa-4-cobertura-los
titulo: Plan de Etapa 4 - Cobertura y ruptura de linea de vision
tipo: plan
audiencia: agente-de-desarrollo
acceso: publico
version: 1
---

# Plan de Etapa 4 - Cobertura y ruptura de linea de vision

Objetivo de este documento: guiar una sesion nueva e independiente para ejecutar la Etapa 4
del plan de mejoras (Mejora 6: "Cobertura y ruptura de linea de vision - decision activa de
sigilo") sin depender de la conversacion que la origino. El documento es autocontenido para la
tarea de codificacion; las restricciones canonicas viven en `specs/`, `docs/` y `AGENTS.md` y
se referencian, no se duplican. Leer primero `AGENTS.md` y `docs/permisos-recomendados.md`.

## 1. Metadatos

| Campo | Valor |
|---|---|
| Proyecto | PIAPC 2026 - Laboratorio Guardia de Sigilo |
| Plan maestro | `Upgrades/plan-5-mejoras-1-2-4-6-9.md` |
| Etapa | Etapa 4 de 7 (Mejora 6) |
| Rama de trabajo | Verificar con `git branch --show-current`; el patron observado es una rama por etapa (Etapa 3: `UpgradeThree`). Proponer `UpgradeFour` si se crea rama nueva, o continuar en la rama actual si esta limpia y sin cambios concurrentes |
| Estado previo | Etapa 3 completada (`Upgrades/estado-etapas.md`) |
| Criterio de aceptacion | `npm run validate` finaliza sin errores; la regla de cobertura/ruptura de LOS vive en `domain/` (sin Phaser/DOM); `application/` evalua y expone el resultado; `game/` solo presenta y provee datos de solo lectura; la FSM H4 y las Etapas 1-3 no cambian de contrato |

## 2. Punto de partida (estado real tras la Etapa 3)

H4 (maquina de estados), Etapa 1 (pausa/mirada de patrulla), Etapa 2 (cono visible y
reactivo) y Etapa 3 (impacto visual extremo de alerta) estan implementados y validados
(136 pruebas, `npm run validate` OK el 06/10/2026). Estructura real:
`src/domain/behavior/guardFsm.ts`, `patrolPhase.ts`, `src/domain/perception/visionCone.ts`,
`src/application/simulation/behaviorSimulation.ts`, `perceptionSimulation.ts`,
`alertFeedback.ts`, `labLevel.ts` y `src/game/scenes/GameScene.ts`.
No existen `src/domain/Guard.ts` ni `src/game/objects/Guard.ts`.

### 2.1 Capacidades existentes relacionadas con cobertura y linea de vision

| Capacidad | Ruta | Detalle verificado |
|---|---|---|
| Evaluacion de vision | `src/domain/perception/perception.ts:35` | `evaluateVision(query)` valida configuracion y devuelve `VisionResult` con `reason`: `visible`, `out-of-range`, `outside-cone`, `occluded`, `invalid-facing`; la oclusion pasa por `lineIsOccluded` (`:104`, funcion **privada**, no exportada) |
| Simulacion de percepcion | `src/application/simulation/perceptionSimulation.ts:50` | `updatePerceptionSimulation` combina sonido, vision y cono; `PerceptionFrame` (`:21-26`) expone `state`, `vision`, `soundHeard` y `cone` (agregado en Etapa 2); `PerceptionFrameInput` (`:28-37`) recibe `map`, `tileSize`, `observer`, `facing`, `target`, `visionRange`, `fieldOfViewRadians`, `timeMs` |
| Memoria de percepcion | `src/domain/perception/memory.ts` | `rememberObservation` se alimenta solo cuando `vision.visible` o `soundHeard`; una vision bloqueada no actualiza la ultima posicion conocida |
| Configuracion del nivel | `src/application/simulation/labLevel.ts` | `VISION_RANGE = 220` (`:21`), `FIELD_OF_VIEW = Math.PI / 2` (`:22`), `CAPTURE_DISTANCE = 24` (`:18`), `LAB_MAP` (`:61`) con areas bloqueadas; **no existen zonas ni celdas de cobertura** |
| Entrada del jugador | `src/game/scenes/GameScene.ts:176-182` | Flechas y WASD (`PLAYER_SPEED = 190`, `:44`), `R` reinicia escena, `Q` emite sonido; no hay tecla de sigilo/cobertura |
| Consumo de vision por conducta | `src/game/scenes/GameScene.ts:261` (`updatePerception`) y `:282` (`updateGuardBehavior`) | La escena pasa `vision.visible`/`target` a `updateBehavior`; `BehaviorInput.vision` (`behaviorSimulation.ts:71`) es un contrato de solo lectura que no cambia |
| Dibujo del cono | `src/game/scenes/GameScene.ts:397` (`drawPerception`) | Consume exclusivamente `frame.cone`; si el cono refleja un rango efectivo reducido, el dibujo lo sigue automaticamente |
| HUD | `src/game/scenes/GameScene.ts:432` (`updateTelemetry`) | Estado, anterior, causa, objetivo, fase, alerta (Etapa 3, `:455`), vision, sonido y memoria; no muestra cobertura ni estado de la linea de vision |
| Alertas (Etapa 3) | `src/application/simulation/alertFeedback.ts` | `alertsForTransitions`/`strongestAlert`; no se toca. La reduccion de rango efectivo alterara la frecuencia de alertas: efecto esperado a revisar en la Etapa 6 (integracion) |

### 2.2 Carencias que cierra la Etapa 4

| Carencia | Evidencia |
|---|---|
| No existe regla de cobertura | Ningun modulo evalua si el jugador esta cubierto ni que efecto tiene; `evaluateVision` solo ocluye por paredes y siempre con el mismo rango |
| La ruptura de linea de vision no es observable como dato | Solo se infiere de `vision.reason === "occluded"`; el HUD no la muestra y no hay estado de sigilo que la escena pueda presentar |
| El jugador no tiene una decision de sigilo | Mas alla de elegir ruta (posicionamiento), no hay mecanica de cobertura: el cono alcanza los 220px siempre, este donde este el jugador |
| "Decision activa de sigilo" no esta modelada | El plan maestro la asigna a `domain/` como regla pura; hoy no hay tipo ni funcion que la represente |

### 2.3 Lugar exacto donde interviene esta Etapa

Conservar los contratos existentes: `evaluateVision`/`VisionResult`/`VisionQuery`,
`PerceptionFrame` (solo agregados compatibles, como `cone` en Etapa 2), `BehaviorInput` y
`BehaviorFrame` no cambian de firma; la FSM H4, `tests/behavior/*`, la Etapa 2
(`visionCone.ts`) y la Etapa 3 (`alertFeedback.ts`, VFX de `GameScene`) no se modifican.
La Etapa 4 agrega un modulo nuevo de dominio (regla de cobertura/LOS) y su evaluacion y
exposicion en `application/`; `GameScene` solo consume el resultado para presentar.

## 3. Restricciones obligatorias

- `src/domain/` no importa Phaser, DOM ni APIs de navegador (`AGENTS.md:12`).
- `src/application/` coordina casos de uso y no representa la escena (`AGENTS.md:13`).
- `src/game/` adapta Phaser y no decide reglas de comportamiento (`AGENTS.md:14`).
- La decision "jugador cubierto / linea de vision rota" es **regla de dominio**; la capa de
  juego no decide cuando aplica ni su efecto, solo provee la posicion (dato de solo lectura
  que ya inyecta) y presenta el resultado.
- Cambios de contrato aditivos: agregar campos al frame sin romper firmas existentes
  (precedente Etapa 2: `PerceptionFrame.cone`).
- Sin recursos externos: todo se dibuja por codigo.
- Sin dependencias nuevas.
- Cada etapa cierra con `npm run validate` (`AGENTS.md:20`); la respuesta del modelo no
  constituye evidencia de funcionamiento.
- No se crean commits ni publicaciones sin autorizacion humana explicita.

## 4. Diseno propuesto (a confirmar antes de codificar)

### 4.1 Dominio (regla pura)

- Nuevo `src/domain/perception/cover.ts` (nombre propuesto):
  - `type CoverReason = "junto a obstaculo" | "espacio abierto" | ...` (ver E4.1).
  - `interface CoverResult { readonly covered: boolean; readonly reason: CoverReason }`.
  - Funcion pura `evaluateCover(map: GridMap, tileSize: number, position: Vector2): CoverResult`
    con validador de entradas (vectores finitos, `tileSize > 0`), sin Phaser/DOM.
  - Opcional: helper puro `effectiveVisionRange(baseRange, cover, factor)` si se decide que
    el rango efectivo es una regla de dominio (ver E4.2); en caso contrario el factor se
    aplica en `application/`.
- `src/domain/perception/perception.ts` queda intacto en su contrato publico salvo la
  decision E4.5 (exportar la oclusion como dato independiente, cambio aditivo opcional).

### 4.2 Aplicacion (evaluacion y exposicion)

- `src/application/simulation/labLevel.ts`: agregar la configuracion de la mejora
  (p. ej. `COVER_VISION_FACTOR = 0.45`, junto a `VISION_RANGE`); es configuracion de
  escenario, no de juego.
- `src/application/simulation/perceptionSimulation.ts`:
  - Evalua `evaluateCover(map, tileSize, target)` en cada cuadro (el mapa y la posicion del
    jugador ya llegan en `PerceptionFrameInput`; no hay nuevas entradas desde `game/`).
  - Expone `cover: CoverResult` en `PerceptionFrame` (agregado compatible).
  - Usa el rango efectivo (reducido si `cover.covered`) en `evaluateVision` y al construir
    `cone`, de modo que el cono de la Etapa 2 refleje la cobertura sin tocar la escena.

### 4.3 Juego (solo presentacion)

- `GameScene` no agrega reglas: sigue pasando `target`, `map` y `tileSize` como hoy.
- Presentacion del resultado (estilo Etapa 2/3):
  - HUD: linea `cobertura SI/NO` (y motivo si aporta) en `updateTelemetry`; la linea de
    vision puede derivarse de `vision.reason` (`occluded` -> ROTA) sin tocar dominio.
  - Marca visual del jugador cuando esta cubierto (tono/borde distinto, dibujado por
    codigo), solo estetica.
- Si E4.4 elige tecla mantenida: `GameScene` solo traduce la tecla a una bandera de entrada
  (adaptador de entrada); la regla de cuando esa bandera produce cobertura efectiva vive en
  dominio/aplicacion.

## 5. Estrategia de pruebas y evidencia

- Dominio (Vitest, Node, sin Phaser): nueva `tests/perception/cover.test.ts`:
  - celda transitable adyacente a un obstaculo -> `covered`;
  - celda abierta (sin vecino bloqueado) -> `covered` falso;
  - bordes/esquinas del mapa y posicion fuera de rango -> comportamiento documentado;
  - si el rango efectivo es regla de dominio: `effectiveVisionRange` reducido solo con
    cobertura y conservado sin ella.
- Aplicacion: extender `tests/application/perceptionSimulation.test.ts`:
  - el frame expone `cover` con el resultado esperado para una posicion en cobertura y una
    en espacio abierto;
  - con cobertura, `vision` usa el rango efectivo (visible a distancia corta que daria
    `out-of-range` sin cobertura) y `cone.range` refleja ese valor;
  - sin cobertura, el comportamiento identico al de la Etapa 2.
- Regresion sin cambios de contrato: `tests/perception/perception.test.ts`,
  `tests/perception/memory.test.ts`, `tests/perception/visionCone.test.ts`,
  `tests/application/behaviorSimulation.test.ts`, `tests/application/alertFeedback.test.ts`
  y `tests/behavior/*` deben seguir valiendo tal cual.
- Verificacion manual: `npm run dev`, colocar al jugador detras de una pared/en cobertura y
  comprobar HUD de cobertura, cono que refleja el rango efectivo, y que las transiciones de
  la FSM conservan sus causas; provocar ademas una persecucion y una alerta de la Etapa 3.
  Limitacion conocida: no existe prueba automatizada de navegador.
- Evidencia: registrar intervencion y validacion en `docs/evidencias/` si el repositorio
  lo requiere para la entrega (precedente: las Etapas 1-3 no crearon archivos alla).
- Puerta de cierre: `npm run validate` (typecheck + test:run + build).

## 6. Decisiones a confirmar al iniciar la sesion

| # | Decision | Valor propuesto | Justificacion | Estado |
|---|---|---|---|---|
| E4.1 | Definicion de "cobertura" | Celda transitable con al menos un vecino (4 direcciones) bloqueado, evaluada con `GridMap` en dominio | Regla pura sin tocar `LAB_MAP`; cualquier pared del escenario sirve de cobertura y es coherente con la oclusion existente | Confirmable; alternativa: celdas de cobertura explicitas en `labLevel.ts` (mas faciles de disenar, pero agregan datos al mapa) |
| E4.2 | Efecto de la cobertura en la deteccion | Rango efectivo reducido por `COVER_VISION_FACTOR = 0.45` (220 -> 99 px) aplicado a `evaluateVision` y al cono | La decision activa del jugador cambia la deteccion de forma observable y reversible; la memoria no se actualiza si no hay vision | Confirmable; alternativa A: cubierto => invisible salvo distancia umbral fija; alternativa B: solo telemetria sin efecto en deteccion (no recomendada: no seria "decision activa") |
| E4.3 | Integracion en aplicacion | Evaluar dentro de `updatePerceptionSimulation` y exponer `cover` en `PerceptionFrame` (agregado, estilo `cone`) | Minimo cambio de contratos; `application/` coordina dominio sin recibir datos nuevos de `game/` | Confirmable; alternativa: modulo aparte `coverSimulation.ts` si se prefiere no mezclar percepciones |
| E4.4 | Entrada del jugador | Automatica por posicion: estar en celda de cobertura ya aplica el efecto (decision activa = elegir donde moverse y permanecer) | Sin tecla nueva ni cambios de control; regla pura y testeable; el HUD informa el estado | Confirmable; alternativa: tecla mantenida (p. ej. Shift) que solo aplica ademas en celda de cobertura (decision mas explicita, mas codigo de entrada) |
| E4.5 | Exponer la ruptura de LOS como dato | Derivar `vision.reason === "occluded"` en `application/` (p. ej. `losBroken` o texto en HUD) sin tocar `perception.ts` | Cambio cero en el contrato de dominio; la causa ya existe | Confirmable; alternativa: exportar un `lineOfSightClear()` aditivo desde `perception.ts` si se necesita independiente del rango/cono |
| E4.6 | Presentacion de cobertura | HUD `cobertura SI/NO` + marca visual en el jugador; cono refleja el rango efectivo por datos | Observabilidad sin decidir comportamiento, mismo patron que Etapas 1-3 | Confirmable; alternativa: solo HUD, sin marca en el jugador |

## 7. Condiciones para detenerse y consultar

Replica de `docs/permisos-recomendados.md:28-38`, aplicadas a esta etapa:

1. Ambiguedad con efectos distintos en los criterios de aceptacion: confirmar las
   decisiones E4.1-E4.6 antes de codificar.
2. Cambios concurrentes en `src/application/simulation/perceptionSimulation.ts`,
   `labLevel.ts`, `src/domain/perception/*` o `src/game/scenes/GameScene.ts` que interfieran
   con la tarea.
3. `npm run validate` que falle por causa no comprendida.
4. Accion que requiera credenciales, publicacion, instalacion de dependencias o perdida
   de informacion.
5. Cruce de limite arquitectonico (regla de cobertura fuera de `domain/`, efecto decidido en
   la capa de juego, o cambios que rompan `evaluateVision`, `BehaviorInput` o `PerceptionFrame`)
   sin registro documentado.

## 8. Cierre de la etapa

1. Ejecutar `npm run validate` y registrar el resultado.
2. Actualizar `Upgrades/estado-etapas.md` (Etapa 4: completada, fecha, archivos modificados,
   decisiones/umbrales E4.1-E4.6, resultado de validate).
3. Actualizar la seccion de Etapa 4 en `Upgrades/plan-5-mejoras-1-2-4-6-9.md` con estado y notas.
4. Preparar la guia de la Etapa 5 (Mejora 9: escape de ultimo momento) en
   `Upgrades/Etapa5/plan-etapa-5-escape-ultimo-momento.md`, autocontenida, segun el mismo patron.
5. No avanzar a la Etapa 5 si `npm run validate` falla.

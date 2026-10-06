---
id: plan-etapa-5-escape-ultimo-momento
titulo: Plan de Etapa 5 - Escape de ultimo momento
tipo: plan
audiencia: agente-de-desarrollo
acceso: publico
version: 1
---

# Plan de Etapa 5 - Escape de ultimo momento

Objetivo de este documento: guiar una sesion nueva e independiente para ejecutar la Etapa 5
del plan de mejoras (Mejora 9: "Escape de ultimo momento - feedback de alivio ante maniobra
ajustada") sin depender de la conversacion que la origino. El documento es autocontenido para
la tarea de codificacion; las restricciones canonicas viven en `specs/`, `docs/` y `AGENTS.md`
y se referencian, no se duplican. Leer primero `AGENTS.md` y `docs/permisos-recomendados.md`.

## 1. Metadatos

| Campo | Valor |
|---|---|
| Proyecto | PIAPC 2026 - Laboratorio Guardia de Sigilo |
| Plan maestro | `Upgrades/plan-5-mejoras-1-2-4-6-9.md` |
| Etapa | Etapa 5 de 7 (Mejora 9) |
| Rama de trabajo | `UpgradeFive` (verificar con `git branch --show-current`; patron: una rama por etapa) |
| Estado previo | Etapa 4 completada (`Upgrades/estado-etapas.md`) |
| Estado de la etapa | Completada el 06/10/2026; `npm run validate` OK (typecheck + 155 pruebas + build). Ver `Upgrades/estado-etapas.md` |
| Criterio de aceptacion | `npm run validate` finaliza sin errores; la regla de escape vive en `domain/` (sin Phaser/DOM); `application/` deriva y expone el evento `escapeMoment`; `game/` solo presenta; la FSM H4 y las Etapas 1-4 no cambian de contrato |

## 2. Punto de partida (estado real tras la Etapa 4)

H4 (maquina de estados), Etapa 1 (pausa/mirada de patrulla), Etapa 2 (cono visible y
reactivo), Etapa 3 (impacto visual extremo de alerta) y Etapa 4 (cobertura y ruptura de
linea de vision) estan implementados y validados (143 pruebas, `npm run validate` OK el
06/10/2026). Estructura real: `src/domain/behavior/guardFsm.ts`, `patrolPhase.ts`,
`src/domain/perception/visionCone.ts`, `cover.ts`, `src/application/simulation/behaviorSimulation.ts`,
`perceptionSimulation.ts`, `alertFeedback.ts`, `labLevel.ts` y `src/game/scenes/GameScene.ts`.
No existen `src/domain/Guard.ts` ni `src/game/objects/Guard.ts`.

### 2.1 Capacidades existentes relacionadas con el escape

| Capacidad | Ruta | Detalle verificado |
|---|---|---|
| Transiciones expuestas | `src/application/simulation/behaviorSimulation.ts:93-106` | `BehaviorFrame.transitions` trae `timeMs`, `previousState`, `event`, `newState` y `cause`; en un cuadro se genera a lo sumo una transicion |
| Transicion de perdida de vision | `src/domain/behavior/guardFsm.ts` (`transitionFromPursue`) | `PURSUE -> SEARCH` con evento `vision-lost` y causa `perdida de vision` es la **unica** salida de PURSUE ademas de `PURSUE -> CAPTURED`; con cobertura (Etapa 4) el rango efectivo baja a 99 px y esta transicion es mas frecuente |
| Distancia guardia-jugador | `src/domain/model/vector.ts` (`distanceBetween`) | Pura, con validador; `captureDistanceMet` en `behaviorSimulation.ts:150-152` ya usa la misma medicion para captura |
| Alertas (Etapa 3) | `src/application/simulation/alertFeedback.ts` | `alertsForTransitions` emite `search-start` (0.35/300ms) en justamente esa transicion; `GameScene.applyAlertFeedback` (`:333`) aplica shake/flash/zoom con cooldown `ALERT_FX_COOLDOWN_MS = 800` |
| Configuracion de escenario | `src/application/simulation/labLevel.ts` | `CAPTURE_DISTANCE = 24` (`:18`), `COVER_VISION_FACTOR = 0.45` (`:23`); no existe ningun umbral de escape |
| Consumo en escena | `src/game/scenes/GameScene.ts:286-331` (`updateGuardBehavior`) | Recibe `result` y ya llama a `applyAlertFeedback(result.transitions, time)`; la posicion del guardia nueva es `result.movement.position` |
| HUD | `src/game/scenes/GameScene.ts` (`updateTelemetry`) | Estado, anterior, causa, objetivo, fase, alerta, vision, sonido, memoria y cobertura; no hay linea de escape |

### 2.2 Carencias que cierra la Etapa 5

| Carencia | Evidencia |
|---|---|
| No existe la regla de "escape de ultimo momento" | Ningun modulo modela la maniobra ajustada (quedar casi capturado y romper la linea de vision); el plan maestro la asigna a `domain/` como regla pura |
| No hay evento `escapeMoment` | `application/` solo deriva alertas de amenaza (`alertFeedback.ts`); no hay derivacion de alivio |
| No hay feedback de alivio | `GameScene` solo implementa VFX de amenaza (Etapa 3); una persecucion que termina en perdida de vision se nota solo como `search-start` (alerta amarilla), sin contrapartida positiva |
| La "maniobra ajustada" no es observable | Ni el HUD ni la telemetria distinguen un escape cercano de una perdida de vision a distancia segura |

### 2.3 Lugar exacto donde interviene esta Etapa

Conservar los contratos existentes: `BehaviorFrame`/`BehaviorTransition`, `PerceptionFrame`,
`evaluateVision`, `BehaviorInput`, `alertsForTransitions`/`AlertExtreme` y la FSM H4 no
cambian de firma; `tests/behavior/*`, `tests/perception/*`, `tests/application/behaviorSimulation.test.ts`
y `tests/application/alertFeedback.test.ts` deben seguir valiendo tal cual. La Etapa 5 agrega
un modulo nuevo de dominio (regla de escape) y su derivacion en `application/`; `GameScene`
solo consume el resultado para presentar.

## 3. Restricciones obligatorias

- `src/domain/` no importa Phaser, DOM ni APIs de navegador (`AGENTS.md:12`).
- `src/application/` coordina casos de uso y no representa la escena (`AGENTS.md:13`).
- `src/game/` adapta Phaser y no decide reglas de comportamiento (`AGENTS.md:14`).
- La decision "esto fue un escape de ultimo momento" es **regla de dominio**; la capa de
  juego no decide cuando aplica ni su umbral, solo presenta.
- El feedback de alivio (flash, texto) existe **solo** en `src/game/`.
- Cambios de contrato aditivos: agregar campos/lineas de HUD sin romper firmas existentes.
- Sin recursos externos: todo se dibuja por codigo.
- Sin dependencias nuevas.
- Cada etapa cierra con `npm run validate` (`AGENTS.md:20`); la respuesta del modelo no
  constituye evidencia de funcionamiento.
- No se crean commits ni publicaciones sin autorizacion humana explicita.

## 4. Diseno propuesto (decisiones E5.1-E5.4 confirmadas en sesion)

### 4.1 Dominio (regla pura)

- Nuevo `src/domain/behavior/escapeMoment.ts`:
  - `interface EscapeQuery { previousState, newState, distance, nearDistance }`.
  - `interface EscapeMoment { readonly distance: number; readonly nearDistance: number }`.
  - Funcion pura `evaluateEscape(query): EscapeMoment | null` con validador de entradas
    (distancias finitas y `>= 0`), sin Phaser/DOM.
  - Condicion (E5.1): `previousState === "PURSUE" && newState === "SEARCH"` y
    `distance <= nearDistance`. La causa es implicita: en la FSM H4 `PURSUE -> SEARCH` solo
    ocurre con `vision-lost` / `perdida de vision`.
- `src/domain/behavior/guardFsm.ts` y la FSM H4 quedan intactos (no se agregan estados ni
  eventos: el escape es una lectura de una transicion existente, igual que las alertas de la
  Etapa 3).

### 4.2 Aplicacion (derivacion y exposicion)

- `src/application/simulation/labLevel.ts`: `ESCAPE_MARGIN = 40` y
  `ESCAPE_NEAR_DISTANCE = CAPTURE_DISTANCE + ESCAPE_MARGIN` (64 px); configuracion de
  escenario, junto a `CAPTURE_DISTANCE`.
- Nuevo `src/application/simulation/escapeFeedback.ts` (patron `alertFeedback.ts`):
  - `interface EscapeFeedback { timeMs, distance, nearDistance }`.
  - Funcion pura `escapeForTransitions(transitions, guardPosition, playerPosition, nearDistance):
    EscapeFeedback | null`; calcula la distancia con `distanceBetween` y evalua cada
    transicion con `evaluateEscape`.
- `updateBehavior` y `BehaviorFrame` no cambian: la escena llama con las transiciones que ya
  recibe en el frame (precedente Etapa 3).

### 4.3 Juego (solo presentacion)

- `GameScene.updateGuardBehavior`: nuevo `applyEscapeFeedback(result.transitions, guardPos,
  playerPos, time)` llamado **antes** de `applyAlertFeedback`:
  - HUD: linea `escape ultimo momento <dist>px` (o `escape -` antes del primer escape).
  - Flash verde de camara `0x73c991` con `ESCAPE_FX_FLASH_SCALE = 0.35` y
    `ESCAPE_FX_DURATION_MS = 420`; sin shake ni zoom (no competir con la Etapa 3).
  - Cooldown propio `ESCAPE_FX_COOLDOWN_MS = 1000` (ritmo de presentacion, en `game/`).
- E5.4 (precedencia en un mismo cuadro): la transicion `PURSUE -> SEARCH` genera tambien la
  alerta `search-start` de la Etapa 3. Cuando hay escape, se omite el VFX de esa alerta
  marcando su cooldown (`lastAlertFxAtMs`) para que el alivio no compita con shake/flash
  amarillo; la alerta **si** se registra en el HUD (mismo precedente que el cooldown
  `ALERT_FX_COOLDOWN_MS`, que ya omitia VFX sin dejar de registrar alertas).

## 5. Estrategia de pruebas y evidencia

- Dominio (Vitest, Node, sin Phaser): nueva `tests/behavior/escapeMoment.test.ts`:
  - `PURSUE -> SEARCH` con distancia menor o igual al umbral -> `EscapeMoment` (borde
    inclusive en 64 px);
  - la misma transicion por encima del umbral -> `null`;
  - otras transiciones (`PATROL -> PURSUE`, `PURSUE -> CAPTURED`, auto-transiciones,
    `SEARCH -> RETURN`) -> `null`;
  - distancias o umbral no finitos o negativos -> error.
- Aplicacion: nueva `tests/application/escapeFeedback.test.ts`:
  - `BehaviorTransition[]` con perdida de vision cercana -> feedback con `timeMs`,
    `distance` y `nearDistance` correctos;
  - perdida de vision lejana, transiciones sin escape y lote vacio -> `null`;
  - integracion con `BehaviorSimulator` (vision valida -> PURSUE y luego sin vision a
    distancia corta) que recupere un `EscapeFeedback`.
- Regresion sin cambios de contrato: `tests/behavior/*`, `tests/perception/*`,
  `tests/application/behaviorSimulation.test.ts` y `tests/application/alertFeedback.test.ts`
  deben seguir valiendo tal cual.
- Verificacion manual: `npm run dev`, perseguir al guardia hasta quedar a menos de 64 px y
  romper la linea de vision (pared/cobertura de la Etapa 4) para ver el flash verde y la
  linea de HUD; comprobar que una perdida de vision lejana solo muestra la alerta de
  busqueda. Limitacion conocida: no existe prueba automatizada de navegador.
- Evidencia: registrar intervencion y validacion en `docs/evidencias/` si el repositorio
  lo requiere para la entrega (precedente: las Etapas 1-4 no crearon archivos alla).
- Puerta de cierre: `npm run validate` (typecheck + test:run + build).

## 6. Decisiones confirmadas en la sesion

| # | Decision | Valor confirmado | Justificacion | Estado |
|---|---|---|---|---|
| E5.1 | Condicion de escape (near-miss en PURSUE) | Transicion real `PURSUE -> SEARCH` con distancia guardia-jugador <= `ESCAPE_NEAR_DISTANCE` (64 px = captura 24 + margen 40) en ese cuadro | Peligro inminente + ruptura de la linea de vision = maniobra ajustada; regla pura y determinista que reutiliza una transicion existente sin tocar la FSM | Confirmada |
| E5.2 | Ubicacion de la regla y de la derivacion | Regla en `src/domain/behavior/escapeMoment.ts`; derivacion en `src/application/simulation/escapeFeedback.ts` consumida desde `GameScene` (patron `alertFeedback.ts`, sin tocar `BehaviorFrame`) | Minimo cambio de contratos; `application/` coordina y no representa escena | Confirmada |
| E5.3 | Feedback de alivio en `game/` | Flash verde de camara (escala 0.35, 420ms) + linea `escape ultimo momento <px>` en HUD, sin shake/zoom, cooldown propio de 1000ms | Contrapartida positiva clara sin competir con los VFX de amenaza de la Etapa 3; sin recursos externos | Confirmada |
| E5.4 | Precedencia frente a la alerta `search-start` en el mismo cuadro | Si hay escape, se omite el VFX de la alerta de la Etapa 3 (marcando su cooldown); el HUD si registra ambas lineas | El shake amarillo de `search-start` contradiria el alivio; solo afecta presentacion y sigue el precedente del cooldown existente | Confirmada |

## 7. Condiciones para detenerse y consultar

Replica de `docs/permisos-recomendados.md:28-38`, aplicadas a esta etapa:

1. Ambiguedad con efectos distintos en los criterios de aceptacion: confirmar las
   decisiones E5.1-E5.4 antes de codificar.
2. Cambios concurrentes en `src/application/simulation/behaviorSimulation.ts`,
   `alertFeedback.ts`, `src/game/scenes/GameScene.ts`, `src/domain/behavior/*` o en los
   tests de comportamiento que interfieran con la tarea.
3. `npm run validate` que falle por causa no comprendida.
4. Accion que requiera credenciales, publicacion, instalacion de dependencias o perdida
   de informacion.
5. Cruce de limite arquitectonico (regla de escape fuera de `domain/`, umbral decidido en
   la capa de juego, o cambios que rompan `BehaviorFrame`, `BehaviorTransition` o
   `alertsForTransitions`) sin registro documentado.

## 8. Cierre de la etapa

1. Ejecutar `npm run validate` y registrar el resultado.
2. Actualizar `Upgrades/estado-etapas.md` (Etapa 5: completada, fecha, archivos modificados,
   decisiones/umbrales E5.1-E5.4, resultado de validate).
3. Actualizar la seccion de Etapa 5 en `Upgrades/plan-5-mejoras-1-2-4-6-9.md` con estado y notas.
4. Preparar la guia de la Etapa 6 (integracion + validacion final) en
   `Upgrades/Etapa6/plan-etapa-6-integracion-validacion.md`, autocontenida, segun el mismo
   patron (incluye checklist de eventos cruzados entre las 5 mejoras).
5. No avanzar a la Etapa 6 si `npm run validate` falla.

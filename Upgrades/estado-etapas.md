# Estado de etapas - 5 mejoras (1,2,4,6,9)

Ubicación: Upgrades/
Plan: Upgrades/plan-5-mejoras-1-2-4-6-9.md
Guía Etapa 2 (sesión nueva): Upgrades/Etapa2/plan-etapa-2-cono-vision.md
Guía Etapa 3 (sesión nueva): Upgrades/Etapa3/plan-etapa-3-impacto-alerta.md
Guía Etapa 4 (sesión nueva): Upgrades/Etapa4/plan-etapa-4-cobertura-los.md
Guía Etapa 5 (sesión nueva): Upgrades/Etapa5/plan-etapa-5-escape-ultimo-momento.md
Guía Etapa 6 (sesión nueva): Upgrades/Etapa6/plan-etapa-6-integracion-validacion.md

## Resumen
Etapas implementadas por sesiones futuras. Actualizar al cierre de cada etapa.

## Etapas

### Etapa 0: Preparación
- Estado: completado
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Archivos modificados: []
- Archivos leídos (hallazgos):
  - src/domain/Guard.ts
  - src/domain/PatrolState.ts
  - src/domain/PatrolPath.ts
  - src/domain/GuardState.ts
  - src/domain/Vision.ts
  - src/application/services/GuardService.ts
  - src/application/ports/GameEventPort.ts
  - src/game/adapters/GameAdapter.ts
  - src/game/scenes/GameScene.ts
  - src/game/objects/Guard.ts
- Decisiones/umbrales: []
- `npm run validate`: OK (baseline 06/10/2026: typecheck + 97 pruebas + build, sin errores)
- Notas: Los hallazgos describen una estructura anterior del repositorio. La línea base real
  tras el hito H4 usa `src/domain/behavior/guardFsm.ts`, `patrol.ts`, `searchPattern.ts`,
  `src/domain/telemetry/*`, `src/application/simulation/behaviorSimulation.ts` y
  `src/game/scenes/GameScene.ts` (no existen `Guard.ts`, `PatrolState.ts` ni `objects/Guard.ts`).

### Etapa 1: Mejora 1 - Patrulla con pausas y mirada direccional
- Estado: completada
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Archivos modificados:
  - src/domain/behavior/patrolPhase.ts (nuevo)
  - src/domain/behavior/guardFsm.ts
  - src/application/simulation/behaviorSimulation.ts
  - src/application/simulation/labLevel.ts
  - src/game/scenes/GameScene.ts
  - tests/behavior/patrolPhase.test.ts (nuevo)
  - tests/behavior/guardFsm.test.ts
  - tests/application/behaviorSimulation.test.ts
  - tests/support/behaviorSimRunner.ts
- Decisiones/umbrales:
  - Sub-fases dentro de PATROL (`walk`/`pause`/`look`) sin añadir estados a la FSM H4;
    la telemetría registra auto-transiciones PATROL→PATROL con causas `pausa`, `mirada`
    y `continua patrulla`.
  - Mirada direccional hacia el siguiente punto de patrulla válido del ciclo
    (`patrolLookDirection`, salta bloqueados, con wrap; null si no hay siguiente).
  - `PATROL_PAUSE_MS = 1200`, `PATROL_LOOK_MS = 900` en `labLevel.ts` (configurables).
  - Visión y sonido interrumpen pausa y mirada (prioridad de percepción; la fase vuelve
    a `walk` al salir de PATROL).
  - Reanudación desde RETURN → PATROL no pausa (`skipPauseOnArrival`: el evento
    `patrol-advance` con causa `llegada patrulla` avanza sin pasar por pausa/mirada).
  - Durante `pause`/`look` la ruta permanece `completed` y el guardia no se mueve;
    `BehaviorFrame.facing` expone la dirección de mirada (la escena sólo la refleja).
- `npm run validate`: OK (06/10/2026: typecheck + 118 pruebas + build, sin errores)
- Notas: Pruebas nuevas de máquina de fases, dirección de mirada, transiciones FSM,
  ritmo pause→look→avance, interrupciones y reanudación sin pausa.

### Etapa 2: Mejora 2 - Cono de visión visible y reactivo
- Estado: completada
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Archivos modificados:
  - src/domain/perception/visionCone.ts (nuevo)
  - src/application/simulation/labLevel.ts
  - src/application/simulation/perceptionSimulation.ts
  - src/game/scenes/GameScene.ts
  - tests/perception/visionCone.test.ts (nuevo)
  - tests/application/perceptionSimulation.test.ts
- Decisiones/umbrales:
  - E2.1: modelo `VisionCone {origin, direction, range, fovRadians}` en
    `src/domain/perception/visionCone.ts` con validador puro (`createVisionCone`:
    vectores finitos, `range >= 0` finito, `fovRadians` en 0..2PI, reutiliza
    `assertFiniteVector`); configuración `VISION_RANGE = 220` y
    `FIELD_OF_VIEW = Math.PI / 2` movidas de `GameScene.ts` a `labLevel.ts`.
  - E2.2: estilo del cono reactivo por estado de conducta (color/alpha por
    `fsmState`: PURSUE rojo 0xe16969 α0.30, INVESTIGATE/SEARCH amarillo 0xe5b454 α0.24,
    PATROL/RETURN azul 0x6b8afd α0.12, CAPTURED azul α0.06) más resultado de visión
    (si `vision.visible` → verde 0x73c991 con α mínimo 0.26). Sólo presentación.
  - E2.3: cono siempre visible; atenuado (α bajo) fuera de estados de alerta.
  - E2.4: `evaluateVision`/`VisionResult`/`VisionQuery` sin cambios; sólo se agregó
    `cone: VisionCone` a `PerceptionFrame` (agregado compatible, regresión H3 intacta).
  - La escena dibuja el cono consumiendo exclusivamente `frame.cone`
    (origen, dirección, radio, ángulo) en `drawPerception`; sin constantes propias.
  - Corrección de rutas: las referencias históricas `Upgrade0/` de los documentos
    se actualizaron a `Upgrades/` (la carpeta fue renombrada por el usuario).
- `npm run validate`: OK (06/10/2026: typecheck + 125 pruebas + build, sin errores)
- Notas: 7 pruebas nuevas (5 de `visionCone`, 2 de exposición del cono en el frame).
  Verificación manual pendiente opcional con `npm run dev`: cono rota en fase MIRADA,
  cambia de estilo al perseguir y conserva la oclusión (no hay prueba de navegador).

### Etapa 3: Mejora 4 - Impacto visual extremo de alerta
- Estado: completada
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Archivos modificados:
  - src/application/simulation/alertFeedback.ts (nuevo)
  - src/game/scenes/GameScene.ts
  - tests/application/alertFeedback.test.ts (nuevo)
- Decisiones/umbrales:
  - Rama de trabajo: `UpgradeThree` (la guia de la etapa referenciaba `UpgradeTwo`;
    metadato corregido en `Upgrades/Etapa3/plan-etapa-3-impacto-alerta.md`).
  - E3.1: `alertExtreme` se emite al entrar a PURSUE (intensidad 0.8, 450ms),
    CAPTURED (1.0, 700ms), INVESTIGATE (0.45, 300ms) y SEARCH (0.35, 300ms).
    Sola cuenta la entrada real (`previousState !== newState`): las auto-transiciones
    (pausa/mirada de patrulla, actualizacion/replanificacion en PURSUE, sonido
    reactualizado en INVESTIGATE, avance de busqueda) no generan alerta.
  - E3.2: logica pura en `src/application/simulation/alertFeedback.ts`
    (`alertsForTransitions()` + `strongestAlert()`); `BehaviorFrame`, la FSM H4 y la
    Etapa 2 no se modifican (solo se consumen `result.transitions`, que antes se ignoraba).
  - E3.3: VFX solo en `GameScene`, via `this.cameras.main`: `shake(durationMs,
    intensidad * 0.02)`, `flash(durationMs, color)` por `kind` (0xff3b3b captura,
    0xe16969 persecucion, 0xe5b454 investigacion/busqueda) atenuado por
    `ALERT_FX_FLASH_SCALE = 0.3` (canales RGB escalados al 30%) y zoom punch
    `zoomTo(1 + intensidad * 0.06)` ida/vuelta con `delayedCall` (sin recursos externos).
  - E3.4: cooldown de presentacion `ALERT_FX_COOLDOWN_MS = 800` medido en `GameScene`;
    el VFX se omite dentro del cooldown pero el HUD si registra toda alerta derivada
    (linea `alerta <tipo> <intensidad>` en `updateTelemetry`).
  - `ALERT_FX_MIN_TWEEN_MS = 50` (suelo del tween de zoom); cooldown y constantes de
    VFX viven en `game/` (ritmo de presentacion, no regla de gameplay).
- `npm run validate`: OK (06/10/2026: typecheck + 136 pruebas + build, sin errores)
- Notas: 11 pruebas nuevas en `tests/application/alertFeedback.test.ts` (8 de
  `alertsForTransitions`, 2 de `strongestAlert` y 1 integracion con `BehaviorSimulator`
  que recorre PATROL→INVESTIGATE→PURSUE→SEARCH→RETURN→PATROL y verifica exactamente
  las 3 alertas de amenaza). Verificacion manual hecha en la sesion: el flash y el zoom
  punch resultaron demasiado distractos y se ajustaron el 06/10/2026 (flash al 30% con
  `ALERT_FX_FLASH_SCALE = 0.3`, zoom punch de 0.08 a 0.06 con `ALERT_FX_ZOOM_SCALE`);
  `npm run validate` OK tras el ajuste. Efecto conocido: el zoom punch puede recortar
  brevemente el borde del HUD.

### Etapa 4: Mejora 6 - Cobertura y ruptura de línea de visión
- Estado: completada
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Archivos modificados:
  - src/domain/perception/cover.ts (nuevo)
  - src/application/simulation/perceptionSimulation.ts
  - src/application/simulation/labLevel.ts
  - src/game/scenes/GameScene.ts
  - tests/perception/cover.test.ts (nuevo)
- Decisiones/umbrales:
  - Implementación en el commit `97b9de8` ("Integrated Upgrade Four: Cover & LOS") en la
    rama `UpgradeFive`; cierre documental y de pruebas en la sesión de la Etapa 5.
  - E4.1: cobertura = celda transitable con al menos un vecino (4 direcciones) bloqueado,
    evaluada con `GridMap` en `evaluateCover` (`src/domain/perception/cover.ts`, validador
    puro); el borde del mapa cuenta como obstáculo; una celda no transitable o fuera del
    mapa devuelve `covered: false, reason: "open"`.
  - E4.2: rango efectivo reducido por `COVER_VISION_FACTOR = 0.45` (220 -> 99 px) aplicado
    a `evaluateVision` y al cono de la Etapa 2 dentro de `updatePerceptionSimulation`.
  - E4.3: evaluación en `updatePerceptionSimulation` y exposición como
    `PerceptionFrame.cover` (agregado compatible, estilo `cone`); sin nuevas entradas
    desde `game/`.
  - E4.4: decisión activa automática por posición (estar en celda de cobertura ya aplica
    el efecto); sin tecla nueva.
  - E4.5: ruptura de línea de visión derivada en `game/` desde `vision.reason === "occluded"`
    (etiqueta HUD "OCLUIDO"); `perception.ts` no cambió de contrato.
  - E4.6: HUD `cobertura SI/NO (motivo)` y el cono refleja el rango efectivo por datos
    (la escena sólo dibuja `frame.cone`).
  - Cierre de la sesión: el hack `(this as any).__coverLabel` se reemplazó por el campo
    privado tipado `coverLabel` (solo presentación).
- `npm run validate`: OK (06/10/2026: typecheck + 143 pruebas + build, sin errores)
- Notas: 7 pruebas nuevas en `tests/perception/cover.test.ts` (cobertura por obstáculo,
  borde del mapa, celda abierta/bloqueada/fuera de mapa y validadores de entradas).
  Efecto esperado a revisar en la Etapa 6: el rango reducido por cobertura altera la
  frecuencia de alertas (Etapa 3) y de escapes (Etapa 5).

### Etapa 5: Mejora 9 - Escape de último momento
- Estado: completada
- Inicio: 06/10/2026
- Cierre: 06/10/2026
- Archivos modificados:
  - src/domain/behavior/escapeMoment.ts (nuevo)
  - src/application/simulation/escapeFeedback.ts (nuevo)
  - src/application/simulation/labLevel.ts
  - src/game/scenes/GameScene.ts
  - tests/behavior/escapeMoment.test.ts (nuevo)
  - tests/application/escapeFeedback.test.ts (nuevo)
- Decisiones/umbrales:
  - E5.1: near-miss en PURSUE: la transición real `PURSUE -> SEARCH` (causa
    `perdida de vision`, la única de la FSM H4) cuenta como escape cuando la distancia
    guardia-jugador en ese cuadro es `<= ESCAPE_NEAR_DISTANCE`; en `labLevel.ts`
    `ESCAPE_MARGIN = 40` y `ESCAPE_NEAR_DISTANCE = CAPTURE_DISTANCE + ESCAPE_MARGIN`
    (24 + 40 = 64 px). La regla es `evaluateEscape` (pura, con validadores de entradas)
    en `src/domain/behavior/escapeMoment.ts`; la FSM H4 no cambia (no hay estados/eventos
    nuevos, es lectura de una transición existente).
  - E5.2: derivación en `src/application/simulation/escapeFeedback.ts` con
    `escapeForTransitions(transitions, guardPosition, playerPosition, nearDistance)`
    (patrón `alertFeedback.ts`, sin tocar `BehaviorFrame`); `GameScene` la consume con
    `result.transitions` y `result.movement.position`.
  - E5.3: feedback de alivio sólo en `game/`: flash de cámara verde 0x73c991 con
    `ESCAPE_FX_FLASH_SCALE = 0.35` y `ESCAPE_FX_DURATION_MS = 420`, sin shake/zoom;
    cooldown propio `ESCAPE_FX_COOLDOWN_MS = 1000`; HUD añade línea
    `escape ultimo momento <px>` (inicial `escape -`).
  - E5.4: precedencia en el mismo cuadro: si hay escape, `applyAlertFeedback` omite el VFX
    de la alerta `search-start` (Etapa 3) —marcada por la bandera `suppressFx` del cuadro—,
    pero el HUD sigue registrando la alerta; no se toca `lastAlertFxAtMs` (sólo esa
    transición), ni `alertsForTransitions`/`AlertExtreme`.
- `npm run validate`: OK (06/10/2026: typecheck + 155 pruebas + build, sin errores)
- Notas: 12 pruebas nuevas (6 de `escapeMoment` en `tests/behavior/`, 6 de
  `escapeFeedback` en `tests/application/`, incluida una integración con
  `BehaviorSimulator` que persigue de cerca y rompe la visión). Efecto esperado a revisar
  en la Etapa 6: la cobertura (Etapa 4, rango efectivo 99 px) hace más frecuentes las
  pérdidas de visión cercanas y, por tanto, los escapes; interacción con las alertas de la
  Etapa 3 ya resuelta vía E5.4.

### Etapa 6: Integración + validación final
- Estado: pendiente
- Guía de la sesión (preparada al cierre de la Etapa 5):
  `Upgrades/Etapa6/plan-etapa-6-integracion-validacion.md`
- Archivos modificados: []
- Integración (eventos cruzados): []
- `npm run validate`: pendiente
- Notas: []

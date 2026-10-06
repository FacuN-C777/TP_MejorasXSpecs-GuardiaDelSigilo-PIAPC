# Plan de mejora: 5 mejoras (1, 2, 4, 6, 9)

## Objetivo
Integrar las cinco mejoras en el proyecto respetando la arquitectura definida: `src/domain/` (reglas puras, sin Phaser/DOM), `src/application/` (coordinaciÃ³n), `src/game/` (adaptador Phaser). ImplementaciÃ³n por etapas individuales, actualizando documentaciÃ³n al cierre de cada etapa.

## Referencias
- `specs/01-producto.md` - Requerimientos del producto
- `docs/arquitectura.md` - Arquitectura y capas
- `AGENTS.md` - Instrucciones para agentes (validaciÃ³n, lÃ­mites)
- `docs/permisos-recomendados.md` - Permisos/tools

## Alcance
Mejoras a implementar:
1. Patrulla con pausas y mirada direccional (anticipaciÃ³n visual, ritmo de recorrido)
2. Cono de visiÃ³n visible y reactivo (claridad de alcance y amenaza)
4. Impacto visual extremo de alerta (shake/flash/zoom/partÃ­culas)
6. Cobertura y ruptura de lÃ­nea de visiÃ³n (decisiÃ³n activa de sigilo)
9. Escape de Ãºltimo momento (feedback de alivio ante maniobra ajustada)

## LÃ­mites arquitectÃ³nicos
- `src/domain/` no puede importar Phaser, DOM ni APIs del navegador.
- `src/application/` coordina el dominio y no representa la escena.
- `src/game/` adapta Phaser y no decide reglas de comportamiento.
- Evitar recursos externos: escena base dibujada por cÃ³digo cuando aplique.
- No agregar dependencias sin justificar necesidad.
- Validar con `npm run validate` al cierre de cada etapa.

## DiseÃ±o por mejora

### 1) Patrulla con pausas y mirada direccional
- **Dominio**: estados `patrol`, `pause`, `look` (o extender `PatrolState` existente). Tiempos configurables (`pauseDuration`, `lookDuration`, `lookDirection`/Ã¡ngulo objetivo). Transiciones por tiempo/condiciones puras.
- **Application**: coordina temporizaciÃ³n y transiciones segÃºn eventos del juego.
- **Game**: solo refleja orientaciÃ³n/direcciÃ³n visual (sin lÃ³gica de transiciÃ³n).

### 2) Cono de visiÃ³n visible y reactivo
- **Dominio/App**: modelo de cono (radio, Ã¡ngulo, origen, orientaciÃ³n) en entidades/config dominio. Datos necesarios para evaluaciÃ³n, no dibujo.
- **Game**: renderizado visible del cono (solo dibujo). Debe ser reactivo a cambios de estado/orientaciÃ³n. No contiene reglas de detecciÃ³n.

### 4) Impacto visual extremo de alerta
- **Dominio**: (opcional) estado/condiciÃ³n que gatilla alerta.
- **Application**: emite evento `alertExtreme` con parÃ¡metros mÃ­nimos (intensidad/duraciÃ³n).
- **Game**: Ãºnica capa que implementa VFX (shake, flash, zoom, partÃ­culas o equivalente). Sin tomar decisiones de gameplay.

### 6) Cobertura y ruptura de lÃ­nea de visiÃ³n
- **Dominio**: evaluaciÃ³n pura de cobertura y ruptura de LOS (mundo geomÃ©trico, obstÃ¡culos, cobertura). DecisiÃ³n activa de sigilo es regla de dominio.
- **Application**: expone evaluaciÃ³n/resultados al resto sin introducir render.
- **Game**: provee datos geomÃ©tricos requeridos (solo lectura); no implementa regla.

### 9) Escape de Ãºltimo momento
- **Dominio**: define condiciÃ³n de "escape de Ãºltimo momento" (maniobra ajustada) como regla pura.
- **Application**: emite evento `escapeMoment` (feedback de alivio) al cumplirse condiciÃ³n.
- **Game**: reproduce feedback visual al recibir evento. Sin lÃ³gica de regla.

## Plan por etapas

### Etapa 0: PreparaciÃ³n (completada)
**Estado actual:** completada.

**Hallazgos (lÃ­nea base):**
- Tras el hito H4, el nÃºcleo real estÃ¡ en `src/domain/behavior/guardFsm.ts`,
  `patrol.ts`, `searchPattern.ts`, `src/domain/telemetry/*`,
  `src/application/simulation/behaviorSimulation.ts` y `src/game/scenes/GameScene.ts`.
  (Los nombres `Guard.ts`/`PatrolState.ts`/`PatrolPath.ts`/`GuardState.ts`/`Vision.ts`
  corresponden a una estructura anterior que ya no existe.)

**Criterios cumplidos:** tracker creado, archivos relevantes identificados, sin cambios funcionales.
**ValidaciÃ³n:** `npm run validate` OK (baseline 06/10/2026: 97 pruebas).

### Etapa 1: Mejora 1 - Patrulla con pausas y mirada direccional
**Estado:** completada (06/10/2026).
**Objetivo:** introducir ritmo con pausas y mirada direccional.
**Cambios:** dominio (estados+tiempos+transiciones puras), app (coordinaciÃ³n), game (reflejo visual).
**Criterios:** transiciones vÃ¡lidas, tiempos configurables, sin import Phaser en dominio.
**ValidaciÃ³n:** `npm run validate` OK (06/10/2026: typecheck + 118 pruebas + build).
**Notas:**
- Nuevo `src/domain/behavior/patrolPhase.ts`: mÃ¡quina de fases `walk`/`pause`/`look`
  con tiempo inyectado y `patrolLookDirection` (direcciÃ³n hacia el siguiente punto vÃ¡lido).
- FSM extendida con eventos `pause-start`/`look-start`/`patrol-continue`, acciones
  `patrol-pause`/`patrol-look` y causas `pausa`/`mirada`/`continua patrulla`
  (auto-transiciones PATROLâ†’PATROL; la FSM H4 conserva su tabla).
- `BehaviorRuntimeState` gana `patrolPhase` y `skipPauseOnArrival` (la reanudaciÃ³n
  desde RETURN avanza sin pausa); `BehaviorFrame` expone `facing` y la escena sÃ³lo lo refleja.
- Umbrales `PATROL_PAUSE_MS=1200` / `PATROL_LOOK_MS=900` en `labLevel.ts`; HUD muestra
  `fase AVANCE/PAUSA/MIRADA`.
- Detalle completo y rastreo en `Upgrades/estado-etapas.md`.

### Etapa 2: Mejora 2 - Cono de visiÃ³n visible y reactivo
**Estado:** completada (06/10/2026).
**GuÃ­a de la sesiÃ³n:** `Upgrades/Etapa2/plan-etapa-2-cono-vision.md` (documento
autocontenido con punto de partida, contratos, decisiones y condiciones de parada).
**Objetivo:** cono visible y reactivo.
**Cambios:** dominio (`visionCone.ts`), app (config en `labLevel.ts` + `cone` en
`PerceptionFrame`), game (dibujo desde `frame.cone` + estilo por estado).
**Criterios:** dibujo solo en game, datos del cono provenientes de dominio/app, reactivo.
**ValidaciÃ³n:** `npm run validate` OK (06/10/2026: typecheck + 125 pruebas + build).
**Notas:**
- Nuevo `src/domain/perception/visionCone.ts`: `VisionCone` + `createVisionCone`
  (validador puro); `evaluateVision` sin cambios (E2.4).
- `VISION_RANGE = 220` / `FIELD_OF_VIEW = Math.PI / 2` ahora viven en `labLevel.ts`;
  la escena no tiene constantes propias del cono.
- `PerceptionFrame` expone `cone` (origen, direcciÃ³n, radio, Ã¡ngulo); `drawPerception`
  sÃ³lo consume `frame.cone`.
- Reactividad (E2.2/E2.3): color/alpha por `fsmState` + `vision.visible`; siempre
  visible, atenuado fuera de PURSUE/INVESTIGATE/SEARCH. SÃ³lo presentaciÃ³n.
- Rutas `Upgrade0/` â†’ `Upgrades/` corregidas en esta documentaciÃ³n.
- Detalle completo y rastreo en `Upgrades/estado-etapas.md`.

### Etapa 3: Mejora 4 - Impacto visual extremo de alerta
**Estado:** completada (06/10/2026).
**GuÃ­a de la sesiÃ³n:** `Upgrades/Etapa3/plan-etapa-3-impacto-alerta.md` (documento
autocontenido con punto de partida, contratos, decisiones y condiciones de parada).
**Objetivo:** VFX extremo al alertar.
**Cambios:** app emite `alertExtreme` (`src/application/simulation/alertFeedback.ts`:
`alertsForTransitions()` con kind/intensidad/duraciÃ³n), game implementa VFX
(shake + flash atenuado al 30% + zoom punch 1 + intensidad Ã— 0.06 en `GameScene`,
con cooldown de 800ms).
**Criterios:** sin reglas en game, parÃ¡metros mÃ­nimos, seguro.
**ValidaciÃ³n:** `npm run validate` OK (06/10/2026: typecheck + 136 pruebas + build).
**Notas:**
- `result.transitions` (antes ignorado en `GameScene`) alimenta las alertas; la FSM H4,
  `BehaviorFrame` y la Etapa 2 no cambian de contrato.
- Umbrales E3.1: PURSUE 0.8/450ms, CAPTURED 1.0/700ms, INVESTIGATE 0.45/300ms,
  SEARCH 0.35/300ms; sÃ³lo cuentan entradas reales de estado.
- HUD aÃ±ade lÃ­nea `alerta <tipo> <intensidad>`; el VFX se omite dentro del cooldown.
- Rama real de la etapa: `UpgradeThree` (la guÃ­a original decÃ­a `UpgradeTwo`).
- Detalle completo y rastreo en `Upgrades/estado-etapas.md`.

### Etapa 4: Mejora 6 - Cobertura y ruptura de lÃ­nea de visiÃ³n
**Estado:** completada (06/10/2026).
**GuÃ­a de la sesiÃ³n:** `Upgrades/Etapa4/plan-etapa-4-cobertura-los.md`.
**Objetivo:** decisiÃ³n activa de sigilo en dominio.
**Cambios:** nuevo `src/domain/perception/cover.ts` (`evaluateCover`, regla pura),
integraciÃ³n en `perceptionSimulation.ts` (rango efectivo con `COVER_VISION_FACTOR = 0.45`
en `labLevel.ts`, `PerceptionFrame.cover` agregado), HUD de cobertura en `GameScene`.
**Criterios:** evaluaciÃ³n pura (sin Phaser/DOM), decisiones documentadas.
**ValidaciÃ³n:** `npm run validate` OK (06/10/2026: typecheck + 143 pruebas + build).
**Notas:**
- El cÃ³digo de la etapa venÃ­a del commit `97b9de8` (rama `UpgradeFive`); la sesiÃ³n de
  cierre aÃ±adiÃ³ `tests/perception/cover.test.ts` (7 pruebas), documentaciÃ³n y la
  limpieza del hack `__coverLabel` (campo privado tipado).
- Detalle completo y rastreo en `Upgrades/estado-etapas.md`.

### Etapa 5: Mejora 9 - Escape de Ãºltimo momento
**Estado:** completada (06/10/2026).
**GuÃ­a de la sesiÃ³n:** `Upgrades/Etapa5/plan-etapa-5-escape-ultimo-momento.md`.
**Objetivo:** feedback de alivio.
**Cambios:** dominio `src/domain/behavior/escapeMoment.ts` (`evaluateEscape`: transiciÃ³n
`PURSUE -> SEARCH` a distancia `<= ESCAPE_NEAR_DISTANCE = 64`), app
`src/application/simulation/escapeFeedback.ts` (`escapeForTransitions`, patrÃ³n
`alertFeedback.ts`) y `GameScene` (flash verde atenuado + lÃ­nea HUD + cooldown propio;
E5.4: en un cuadro con escape se omite el VFX de la alerta `search-start` pero el HUD la
registra).
**Criterios:** condiciÃ³n clara (near-miss en PURSUE, regla pura en `domain/`), evento
emitido correctamente, feedback solo presentaciÃ³n.
**ValidaciÃ³n:** `npm run validate` OK (06/10/2026: typecheck + 155 pruebas + build).
**Notas:**
- Rama de trabajo: `UpgradeFive`; misma rama que la Etapa 4, Ã¡rbol limpio.
- Umbrales E5.1: `ESCAPE_MARGIN = 40`, `ESCAPE_NEAR_DISTANCE = 24 + 40 = 64` en `labLevel.ts`.
- Sin nuevas dependencias ni recursos externos; FSM H4 y contratos de Etapas 1-4 intactos.
- Detalle completo y rastreo en `Upgrades/estado-etapas.md`.

### Etapa 6: Integración + validación final
**Estado:** completada (06/10/2026).
**Guía de la sesión:** Upgrades/Etapa6/plan-etapa-6-integracion-validacion.md
**Objetivo:** integración final y validación (pruebas cruzadas + documentación).
**Cambios:** 	ests/application/integration.test.ts (nuevo), documentación (estado-etapas.md, README.md).
**Criterios:** 
pm run validate OK, secuencia reproducible documentada, regresión intacta.
**Validación:** 
pm run validate OK (typecheck + 156 pruebas + build, sin errores).
**Notas:** Cruces E3/E4/E5/E2/E1 verificados; política sin ajustes sin diagnóstico+confirmación humana.

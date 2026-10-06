# Plan de mejora: 5 mejoras (1, 2, 4, 6, 9)

## Objetivo
Integrar las cinco mejoras en el proyecto respetando la arquitectura definida: `src/domain/` (reglas puras, sin Phaser/DOM), `src/application/` (coordinación), `src/game/` (adaptador Phaser). Implementación por etapas individuales, actualizando documentación al cierre de cada etapa.

## Referencias
- `specs/01-producto.md` - Requerimientos del producto
- `docs/arquitectura.md` - Arquitectura y capas
- `AGENTS.md` - Instrucciones para agentes (validación, límites)
- `docs/permisos-recomendados.md` - Permisos/tools

## Alcance
Mejoras a implementar:
1. Patrulla con pausas y mirada direccional (anticipación visual, ritmo de recorrido)
2. Cono de visión visible y reactivo (claridad de alcance y amenaza)
4. Impacto visual extremo de alerta (shake/flash/zoom/partículas)
6. Cobertura y ruptura de línea de visión (decisión activa de sigilo)
9. Escape de último momento (feedback de alivio ante maniobra ajustada)

## Límites arquitectónicos
- `src/domain/` no puede importar Phaser, DOM ni APIs del navegador.
- `src/application/` coordina el dominio y no representa la escena.
- `src/game/` adapta Phaser y no decide reglas de comportamiento.
- Evitar recursos externos: escena base dibujada por código cuando aplique.
- No agregar dependencias sin justificar necesidad.
- Validar con `npm run validate` al cierre de cada etapa.

## Diseño por mejora

### 1) Patrulla con pausas y mirada direccional
- **Dominio**: estados `patrol`, `pause`, `look` (o extender `PatrolState` existente). Tiempos configurables (`pauseDuration`, `lookDuration`, `lookDirection`/ángulo objetivo). Transiciones por tiempo/condiciones puras.
- **Application**: coordina temporización y transiciones según eventos del juego.
- **Game**: solo refleja orientación/dirección visual (sin lógica de transición).

### 2) Cono de visión visible y reactivo
- **Dominio/App**: modelo de cono (radio, ángulo, origen, orientación) en entidades/config dominio. Datos necesarios para evaluación, no dibujo.
- **Game**: renderizado visible del cono (solo dibujo). Debe ser reactivo a cambios de estado/orientación. No contiene reglas de detección.

### 4) Impacto visual extremo de alerta
- **Dominio**: (opcional) estado/condición que gatilla alerta.
- **Application**: emite evento `alertExtreme` con parámetros mínimos (intensidad/duración).
- **Game**: única capa que implementa VFX (shake, flash, zoom, partículas o equivalente). Sin tomar decisiones de gameplay.

### 6) Cobertura y ruptura de línea de visión
- **Dominio**: evaluación pura de cobertura y ruptura de LOS (mundo geométrico, obstáculos, cobertura). Decisión activa de sigilo es regla de dominio.
- **Application**: expone evaluación/resultados al resto sin introducir render.
- **Game**: provee datos geométricos requeridos (solo lectura); no implementa regla.

### 9) Escape de último momento
- **Dominio**: define condición de "escape de último momento" (maniobra ajustada) como regla pura.
- **Application**: emite evento `escapeMoment` (feedback de alivio) al cumplirse condición.
- **Game**: reproduce feedback visual al recibir evento. Sin lógica de regla.

## Plan por etapas

### Etapa 0: Preparación (completada)
**Estado actual:** completada.

**Hallazgos (línea base):**
- Tras el hito H4, el núcleo real está en `src/domain/behavior/guardFsm.ts`,
  `patrol.ts`, `searchPattern.ts`, `src/domain/telemetry/*`,
  `src/application/simulation/behaviorSimulation.ts` y `src/game/scenes/GameScene.ts`.
  (Los nombres `Guard.ts`/`PatrolState.ts`/`PatrolPath.ts`/`GuardState.ts`/`Vision.ts`
  corresponden a una estructura anterior que ya no existe.)

**Criterios cumplidos:** tracker creado, archivos relevantes identificados, sin cambios funcionales.
**Validación:** `npm run validate` OK (baseline 06/10/2026: 97 pruebas).

### Etapa 1: Mejora 1 - Patrulla con pausas y mirada direccional
**Estado:** completada (06/10/2026).
**Objetivo:** introducir ritmo con pausas y mirada direccional.
**Cambios:** dominio (estados+tiempos+transiciones puras), app (coordinación), game (reflejo visual).
**Criterios:** transiciones válidas, tiempos configurables, sin import Phaser en dominio.
**Validación:** `npm run validate` OK (06/10/2026: typecheck + 118 pruebas + build).
**Notas:**
- Nuevo `src/domain/behavior/patrolPhase.ts`: máquina de fases `walk`/`pause`/`look`
  con tiempo inyectado y `patrolLookDirection` (dirección hacia el siguiente punto válido).
- FSM extendida con eventos `pause-start`/`look-start`/`patrol-continue`, acciones
  `patrol-pause`/`patrol-look` y causas `pausa`/`mirada`/`continua patrulla`
  (auto-transiciones PATROL→PATROL; la FSM H4 conserva su tabla).
- `BehaviorRuntimeState` gana `patrolPhase` y `skipPauseOnArrival` (la reanudación
  desde RETURN avanza sin pausa); `BehaviorFrame` expone `facing` y la escena sólo lo refleja.
- Umbrales `PATROL_PAUSE_MS=1200` / `PATROL_LOOK_MS=900` en `labLevel.ts`; HUD muestra
  `fase AVANCE/PAUSA/MIRADA`.
- Detalle completo y rastreo en `Upgrade0/estado-etapas.md`.

### Etapa 2: Mejora 2 - Cono de visión visible y reactivo
**Estado:** pendiente.
**Guía para la sesión nueva:** `Upgrade0/Etapa2/plan-etapa-2-cono-vision.md` (documento
autocontenido con punto de partida, contratos, decisiones a confirmar y condiciones de parada).
**Objetivo:** cono visible y reactivo.
**Cambios:** dominio/app (modelo), game (dibujo reactivo).
**Criterios:** dibujo solo en game, datos provenientes de dominio/app, reactivo.
**Validación:** `npm run validate`.

### Etapa 3: Mejora 4 - Impacto visual extremo de alerta
**Objetivo:** VFX extremo al alertar.
**Cambios:** app emite `alertExtreme`, game implementa VFX.
**Criterios:** sin reglas en game, parámetros mínimos, seguro.
**Validación:** `npm run validate`.

### Etapa 4: Mejora 6 - Cobertura y ruptura de línea de visión
**Objetivo:** decisión activa de sigilo en dominio.
**Cambios:** dominio (evaluación cobertura/ruptura LOS), app coordina.
**Criterios:** evaluación pura (sin Phaser/DOM), decisiones documentadas.
**Validación:** `npm run validate`.

### Etapa 5: Mejora 9 - Escape de último momento
**Objetivo:** feedback de alivio.
**Cambios:** dominio regla, app emite `escapeMoment`, game feedback.
**Criterios:** condición clara, evento emitido correctamente, feedback solo presentación.
**Validación:** `npm run validate`.

### Etapa 6: Integración + validación final
**Objetivo:** integración cruzada, coherencia, validación global.
**Tareas:** revisar eventos entre mejoras, evitar duplicados, actualizar docs finales.
**Criterios:** todas etapas completas, `npm run validate` OK.
**Validación:** `npm run validate`.

## Reglas para actualizar documentación (al cierre de cada etapa)
1. Actualizar `Upgrade0/estado-etapas.md`: marcar etapa (completada), fecha, archivos modificados (rutas), decisiones/umbrales, resultado `npm run validate`.
2. Actualizar `Upgrade0/plan-5-mejoras-1-2-4-6-9.md` con estado de etapa y notas.
3. No avanzar a siguiente etapa si `npm run validate` falla.
4. Mantener cambios acotados a la etapa.

## Validación
Ejecutar `npm run validate` al cierre de cada etapa. Respuesta del modelo no constituye evidencia de funcionamiento.
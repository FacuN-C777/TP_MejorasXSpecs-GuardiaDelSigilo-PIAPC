# Estado de etapas - 5 mejoras (1,2,4,6,9)

Ubicación: Upgrade0/
Plan: Upgrade0/plan-5-mejoras-1-2-4-6-9.md
Guía Etapa 2 (sesión nueva): Upgrade0/Etapa2/plan-etapa-2-cono-vision.md

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
- Estado: pendiente
- Guía para la sesión: Upgrade0/Etapa2/plan-etapa-2-cono-vision.md (autocontenida)
- Archivos modificados: []
- Decisiones/umbrales: []
- `npm run validate`: pendiente
- Notas: Leer la guía antes de inspeccionar código; incluye punto de partida exacto,
  contratos, decisiones a confirmar y condiciones de parada.

### Etapa 3: Mejora 4 - Impacto visual extremo de alerta
- Estado: pendiente
- Archivos modificados: []
- Decisiones/umbrales: []
- `npm run validate`: pendiente
- Notas: []

### Etapa 4: Mejora 6 - Cobertura y ruptura de línea de visión
- Estado: pendiente
- Archivos modificados: []
- Decisiones/umbrales: []
- `npm run validate`: pendiente
- Notas: []

### Etapa 5: Mejora 9 - Escape de último momento
- Estado: pendiente
- Archivos modificados: []
- Decisiones/umbrales: []
- `npm run validate`: pendiente
- Notas: []

### Etapa 6: Integración + validación final
- Estado: pendiente
- Archivos modificados: []
- Integración (eventos cruzados): []
- `npm run validate`: pendiente
- Notas: []

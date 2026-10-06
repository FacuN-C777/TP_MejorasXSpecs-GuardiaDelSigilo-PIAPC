---
id: plan-etapa-3-impacto-alerta
titulo: Plan de Etapa 3 - Impacto visual extremo de alerta
tipo: plan
audiencia: agente-de-desarrollo
acceso: publico
version: 1
---

# Plan de Etapa 3 - Impacto visual extremo de alerta

Objetivo de este documento: guiar una sesion nueva e independiente para ejecutar la Etapa 3
del plan de mejoras (Mejora 4: "Impacto visual extremo de alerta") sin depender de la
conversacion que la origino. El documento es autocontenido para la tarea de codificacion;
las restricciones canonicas viven en `specs/`, `docs/` y `AGENTS.md` y se referencian,
no se duplican. Leer primero `AGENTS.md` y `docs/permisos-recomendados.md`.

## 1. Metadatos

| Campo | Valor |
|---|---|
| Proyecto | PIAPC 2026 - Laboratorio Guardia de Sigilo |
| Plan maestro | `Upgrades/plan-5-mejoras-1-2-4-6-9.md` |
| Etapa | Etapa 3 de 7 (Mejora 4) |
| Rama de trabajo | `UpgradeTwo` (verificar con `git branch --show-current`) |
| Estado previo | Etapa 2 completada (`Upgrades/estado-etapas.md`) |
| Criterio de aceptacion | `npm run validate` finaliza sin errores; VFX solo en `game/`; el evento `alertExtreme` se emite desde `application/` con parametros minimos (intensidad/duracion); sin reglas de gameplay en la capa de juego |

## 2. Punto de partida (estado real tras la Etapa 2)

H4 (maquina de estados), Etapa 1 (pausa/mirada de patrulla) y Etapa 2 (cono de vision
visible y reactivo) estan implementados y validados (125 pruebas, `npm run validate` OK
el 06/10/2026). Estructura real: `src/domain/behavior/guardFsm.ts`, `patrolPhase.ts`,
`src/domain/perception/visionCone.ts`, `src/application/simulation/behaviorSimulation.ts`,
`perceptionSimulation.ts`, `labLevel.ts` y `src/game/scenes/GameScene.ts`.
No existen `src/domain/Guard.ts` ni `src/game/objects/Guard.ts`.

### 2.1 Capacidades existentes relacionadas con la alerta

| Capacidad | Ruta | Detalle verificado |
|---|---|---|
| Transiciones expuestas | `src/application/simulation/behaviorSimulation.ts:101-106` | `BehaviorFrame` incluye `transitions: readonly BehaviorTransition[]`; cada `BehaviorTransition` (`:93-99`) trae `timeMs`, `previousState`, `event`, `newState` y `cause`. Se genera en `updateBehavior` (`:186-206`) sólo cuando la FSM transiciona |
| Tipos de transicion | `src/domain/behavior/guardFsm.ts` | `GuardState` (`:3`), `GuardEvent` (`:11`), `TransitionCause` (`:27`); `transition()` es pura y ya cubierta por `tests/behavior/guardFsm.test.ts` |
| Estados que interesan | FSM H4 | Entradas criticas: `-> PURSUE` (vision valida), `-> CAPTURED` (distancia de captura), `-> INVESTIGATE`/`-> SEARCH` (sonido/perdida); salidas `PURSUE -> ...` con causa de vision perdida |
| Consumo en escena | `src/game/scenes/GameScene.ts:256-301` | `updateGuardBehavior` recibe `result` de `updateBehavior` pero **hoy ignora `result.transitions`**; ahi debe engancharse la emision |
| Camara disponible | `src/game/scenes/GameScene.ts:121` | `this.cameras.main` ya se usa (fondo); Phaser ofrece `shake`, `flash`, `zoom`/`setZoom` sobre ella sin recursos externos |
| HUD/telemetria | `src/game/scenes/GameScene.ts:391` | `updateTelemetry` muestra estado/anterior/causa; la alerta no debe romperlo |
| Config de escenario | `src/application/simulation/labLevel.ts` | Umbral de captura `CAPTURE_DISTANCE = 24`; constantes de nivel (no de juego) |

### 2.2 Carencias que cierra la Etapa 3

| Carencia | Evidencia |
|---|---|
| No hay senal de alerta estructurada | Ningun modulo convierte `BehaviorTransition[]` en un efecto de alerta con intensidad/duracion; la escena no lee `result.transitions` |
| No hay VFX de alerta | `GameScene` no hace shake, flash, zoom ni particulas; una transicion a PURSUE/CAPTURED solo cambia el stroke del guardia y el HUD |
| La mejora pide "impacto extremo" | `plan-5-mejoras-1-2-4-6-9.md` (diseno mejora 4): app emite `alertExtreme` con parametros minimos; game es la unica capa que implementa VFX |

### 2.3 Lugar exacto donde interviene esta Etapa

Conservar los contratos existentes: `BehaviorFrame`/`BehaviorTransition` no cambian de
firma (solo se consumen); la FSM H4 y `tests/behavior/*` no se tocan; la Etapa 2
(`visionCone.ts`, `PerceptionFrame.cone`, estilo del cono) no se modifica. La Etapa 3
agrega un modulo nuevo de aplicacion (para derivar la alerta) y su consumo en `GameScene`.

## 3. Restricciones obligatorias

- `src/domain/` no importa Phaser, DOM ni APIs de navegador (`AGENTS.md:12`).
- `src/application/` coordina casos de uso y no representa la escena (`AGENTS.md:13`).
- `src/game/` adapta Phaser y no decide reglas de comportamiento (`AGENTS.md:14`).
- Los VFX (shake, flash, zoom, particulas o equivalente) existen **solo** en `src/game/`;
  la capa de juego no decide que transiciones son relevantes ni que intensidad corresponde.
- El evento `alertExtreme` se emite desde `application/` con parametros minimos
  (al menos: tipo/cause, intensidad, duracionMs).
- Sin recursos externos: todo se dibuja por codigo (el flash puede ser un `Rectangle`
  a pantalla completa; las particulas, si se usan, requieren una textura generada por
  codigo o deben omitirse).
- Sin dependencias nuevas.
- Cada etapa cierra con `npm run validate` (`AGENTS.md:20`); la respuesta del modelo no
  constituye evidencia de funcionamiento.
- No se crean commits ni publicaciones sin autorizacion humana explicita.

## 4. Diseno propuesto (a confirmar antes de codificar)

### 4.1 Aplicacion (emision)

- Nuevo `src/application/simulation/alertFeedback.ts` (nombre propuesto):
  - `type AlertKind = "pursue-start" | "captured" | ...` (ver E3.1).
  - `interface AlertExtreme { readonly kind: AlertKind; readonly intensity: number; readonly durationMs: number; }`
    (intensity normalizada 0..1; durationMs en milisegundos).
  - Funcion pura `alertsForTransitions(transitions: readonly BehaviorTransition[]): readonly AlertExtreme[]`
    que deriva las alertas de las transiciones del cuadro. Sin Phaser/DOM (es
  - `src/application/` pero es codigo puro; si se prefiere mas cercano al dominio, la
    opcion E3.2 discute ubicacion).
- `updateBehavior` **no** cambia: la escena (u otra coordinacion) llamara a
  `alertsForTransitions(result.transitions)` con las transiciones que ya vienen en el frame.
  Alternativa (E3.2): exponer las alertas ya calculadas dentro de `BehaviorFrame`.

### 4.2 Juego (VFX, solo presentacion)

- `GameScene.updateGuardBehavior` (`GameScene.ts:256`): consumir `result.transitions`
  (hoy ignorado) -> `alertsForTransitions(...)` -> disparar VFX en `this.cameras.main`:
  - `shake(durationMs, intensidad)` para persecucion/captura.
  - `flash(durationMs, color)` con rectangulo o `camera.flash` para el golpe visual.
  - Zoom punch opcional (`setZoom`/`zoomTo` breve y retorno) - ver E3.3.
- Anti-spam: limitar la frecuencia de los VFX (cooldown, ver E3.4). El cooldown es
  ritmo de presentacion, no regla de gameplay.
- El HUD puede registrar la ultima alerta (texto) si aporta observabilidad; sin
  decidir comportamiento.

### 4.3 Dominio (opcional)

- La condicion "gatilla alerta" ya existe en la FSM (transiciones a PURSUE/CAPTURED);
  no duplicarla. Si se quiere una clasificacion de severidad como regla pura, puede
  vivir en `src/domain/behavior/alertSeverity.ts` (ver E3.2).

## 5. Estrategia de pruebas y evidencia

- Aplicacion (Vitest, Node): nueva `tests/application/alertFeedback.test.ts`:
  - transicion `-> PURSUE` produce una alerta con intensidad/duracion esperadas;
  - transicion `-> CAPTURED` produce la alerta de mayor severidad;
  - transiciones sin interes (p. ej. pause-start de patrulla) no producen alertas;
  - lista vacia -> lista vacia.
- Regresion: `tests/behavior/*` (118+ pruebas de FSM/fases) y
  `tests/application/behaviorSimulation.test.ts` deben seguir valiendo sin cambios de
  contrato; `tests/perception/*` y `tests/application/perceptionSimulation.test.ts`
  (Etapa 2) no se ven afectados.
- Verificacion manual de VFX: `npm run dev`, provocar una persecucion (ser visto) y una
  captura, comprobar shake/flash/zoom y que el cono de la Etapa 2 conserva su estilo.
  Limitacion conocida: no existe prueba automatizada de navegador.
- Evidencia: registrar intervencion y validacion en `docs/evidencias/` si el repositorio
  lo requiere para la entrega.
- Puerta de cierre: `npm run validate` (typecheck + test:run + build).

## 6. Decisiones a confirmar al iniciar la sesion

| # | Decision | Valor propuesto | Justificacion | Estado |
|---|---|---|---|---|
| E3.1 | Que transiciones gatilan `alertExtreme` y su severidad | `-> PURSUE` (alta, p. ej. intensidad 0.8, 450ms) y `-> CAPTURED` (maxima, intensidad 1.0, 700ms); `-> INVESTIGATE`/`-> SEARCH` opcionales con severidad media/baja | Son las transiciones de "amenaza real" (persecucion y captura); mantener pocas evita ruido visual | Confirmable; alternativa: incluir toda entrada a estados de alerta (INVESTIGATE/SEARCH/RETURN) |
| E3.2 | Ubicacion de la logica de alerta | Funcion pura en `src/application/simulation/alertFeedback.ts` consumida desde `GameScene` (sin tocar `BehaviorFrame`) | Minimo cambio de contratos; `application/` coordina y no representa escena | Confirmable; alternativa A: exponer `alerts` dentro de `BehaviorFrame`; alternativa B: severidad pura en `domain/behavior/` + mapeo en `application/` |
| E3.3 | Que VFX implementa `game/` | Shake + flash de camara (sin texturas externas), con zoom punch solo si es estable | "Impacto extremo" sin recursos externos ni riesgo de inestabilidad; particulas descartadas salvo textura generada por codigo | Confirmable; alternativa: solo shake+flash (mas conservador) |
| E3.4 | Anti-spam de VFX | Cooldown de 800ms medido dentro de `GameScene` (presentacion) | Evita sacudidas encadenadas cuando hay transiciones rapidas; no afecta reglas ni telemetria | Confirmable; alternativa: sin cooldown si E3.1 queda estricta |

## 7. Condiciones para detenerse y consultar

Replica de `docs/permisos-recomendados.md:28-38`, aplicadas a esta etapa:

1. Ambiguedad con efectos distintos en los criterios de aceptacion: confirmar las
   decisiones E3.1-E3.4 antes de codificar.
2. Cambios concurrentes en `src/application/simulation/behaviorSimulation.ts`,
   `src/game/scenes/GameScene.ts`, `src/domain/behavior/guardFsm.ts` o en los tests de
   comportamiento que interfieran con la tarea.
3. `npm run validate` que falle por causa no comprendida.
4. Accion que requiera credenciales, publicacion, instalacion de dependencias o perdida
   de informacion.
5. Cruce de limite arquitectonico (VFX fuera de `game/`, decision de severidad en la
   capa de juego, o duplicado de la logica de transicion de la FSM) sin registro
   documentado.

## 8. Cierre de la etapa

1. Ejecutar `npm run validate` y registrar el resultado.
2. Actualizar `Upgrades/estado-etapas.md` (Etapa 3: completada, fecha, archivos modificados,
   decisiones/umbrales E3.1-E3.4, resultado de validate).
3. Actualizar la seccion de Etapa 3 en `Upgrades/plan-5-mejoras-1-2-4-6-9.md` con estado y notas.
4. Preparar la guia de la Etapa 4 (Mejora 6: cobertura y ruptura de linea de vision) en
   `Upgrades/Etapa4/plan-etapa-4-cobertura-los.md`, autocontenida, segun el mismo patron.
5. No avanzar a la Etapa 4 si `npm run validate` falla.

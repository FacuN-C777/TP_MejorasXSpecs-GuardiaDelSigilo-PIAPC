---
id: plan-etapa-2-cono-vision
titulo: Plan de Etapa 2 - Cono de vision visible y reactivo
tipo: plan
audiencia: agente-de-desarrollo
acceso: publico
version: 1
---

# Plan de Etapa 2 - Cono de vision visible y reactivo

Objetivo de este documento: guiar una sesion nueva e independiente para ejecutar la Etapa 2
del plan de mejoras (Mejora 2: "Cono de vision visible y reactivo") sin depender de la
conversacion que la origino. El documento es autocontenido para la tarea de codificacion;
las restricciones canonicas viven en `specs/`, `docs/` y `AGENTS.md` y se referencian,
no se duplican. Leer primero `AGENTS.md` y `docs/permisos-recomendados.md`.

## 1. Metadatos

| Campo | Valor |
|---|---|
| Proyecto | PIAPC 2026 - Laboratorio Guardia de Sigilo |
| Plan maestro | `Upgrades/plan-5-mejoras-1-2-4-6-9.md` |
| Etapa | Etapa 2 de 7 (Mejora 2) |
| Rama de trabajo | `UpgradeOne&PlanOfAction` |
| Estado previo | Etapa 1 completada (`Upgrades/estado-etapas.md`) |
| Criterio de aceptacion | `npm run validate` finaliza sin errores; dibujo solo en `game/`; datos del cono provenientes de `domain/`/`application/`; reactividad demostrable |

## 2. Punto de partida (estado real tras la Etapa 1)

H4 (maquina de estados) y Etapa 1 (pausa/mirada de patrulla) estan implementados y
validados (118 pruebas). No existen `src/domain/Guard.ts`, `PatrolState.ts` ni
`src/game/objects/Guard.ts`: la estructura real es la siguiente.

### 2.1 Capacidades existentes relacionadas con el cono

| Capacidad | Ruta | Detalle verificado |
|---|---|---|
| Evaluacion de vision | `src/domain/perception/perception.ts` | `evaluateVision(query)` valida `range` y `fieldOfViewRadians` (finitos, 0..2PI) y devuelve `VisionResult` con `reason`: `visible`, `out-of-range`, `outside-cone`, `occluded`, `invalid-facing` |
| Simulacion de percepcion | `src/application/simulation/perceptionSimulation.ts` | `PerceptionFrameInput` recibe `visionRange` y `fieldOfViewRadians` como entrada inyectada; `PerceptionFrame` expone `state`, `vision`, `soundHeard` (hoy NO expone el cono) |
| Constantes del cono | `src/game/scenes/GameScene.ts:38-39` | `VISION_RANGE = 220` y `FIELD_OF_VIEW = Math.PI / 2` viven en la capa `game/` |
| Inyeccion a percepcion | `src/game/scenes/GameScene.ts:213-214` | La escena pasa esas constantes a `updatePerceptionSimulation` |
| Dibujo del cono | `src/game/scenes/GameScene.ts:308` (`drawPerception`) | Redibuja cada cuadro en `perceptionGraphics` (depth 1): origen `this.guard.x/y`, orientacion `this.guardFacing`, relleno 0x73c991 si `vision.visible` o 0x6b8afd si no, alpha 0.16; tambien radio sonoro y marcador de ultima posicion conocida |
| Orientacion del guardia | `src/game/scenes/GameScene.ts` (`guardFacing`) | Se actualiza con `result.movement.direction` y, desde la Etapa 1, con `result.facing` durante la fase `look` (el cono ya rota con la mirada direccional) |
| HUD | `src/game/scenes/GameScene.ts` (`updateTelemetry`) | Muestra estado, anterior, causa, objetivo, fase (AVANCE/PAUSA/MIRADA), vision, sonido y memoria |

### 2.2 Carencias que cierra la Etapa 2

| Carencia | Evidencia |
|---|---|
| El modelo del cono no proviene de dominio/aplicacion | Radio y angulo son constantes de `src/game/scenes/GameScene.ts:38-39` y la escena es quien las inyecta: la dependencia va de `game/` hacia `application/`/`domain/` con los datos, no solo con la representacion |
| No existe una entidad "cono de vision" explicita | No hay tipo que reuna origen, orientacion, radio y angulo como dato compartido entre evaluacion y presentacion |
| El dibujo no es reactivo a la conducta | `drawPerception` solo distingue `vision.visible`; no hay senal visual de amenaza/alerta del guardia (el plan de la mejora pide "claridad de alcance y amenaza") |
| El frame no expone datos del cono | `PerceptionFrame` no incluye radio/angulo/orientacion; la escena debe conocer las constantes para dibujar |

### 2.3 Lugar exacto donde interviene esta Etapa

El contrato de H3 sobre percepcion debe conservarse: `src/domain/perception/*`,
`src/domain/navigation/*` y `src/domain/model/*` no se rompen (la Etapa 2 solo puede
agregar tipos/exports, no cambiar firmas existentes sin actualizar sus pruebas).
La Etapa 1 agregó `src/domain/behavior/patrolPhase.ts` y extendio
`behaviorSimulation.ts`; no se toca salvo que el cono requiera exponer datos (ver diseno).

## 3. Restricciones obligatorias

- `src/domain/` no importa Phaser, DOM ni APIs de navegador (`AGENTS.md:12`).
- `src/application/` coordina casos de uso y no representa la escena (`AGENTS.md:13`).
- `src/game/` adapta Phaser y no decide reglas de comportamiento (`AGENTS.md:14`).
- Presentacion no decide comportamiento; el dibujo ocurre solo en `src/game/`.
- Los datos del cono (radio, angulo, origen, orientacion) provienen de `domain/`/`application/`;
  la capa `game/` solo los consume para dibujar.
- Sin recursos externos: la escena se dibuja por codigo.
- Sin dependencias nuevas.
- Cada etapa cierra con `npm run validate` (`AGENTS.md:20`); la respuesta del modelo no
  constituye evidencia de funcionamiento.
- No se crean commits ni publicaciones sin autorizacion humana explicita.

## 4. Diseno propuesto (a confirmar antes de codificar)

### 4.1 Dominio

- Nuevo `src/domain/perception/visionCone.ts` (o equivalente):
  - `interface VisionCone { readonly origin: Vector2; readonly direction: Vector2; readonly range: number; readonly fovRadians: number; }`
  - Constructor/validador puro (finitos, `range >= 0`, `fovRadians` en 0..2PI), reutilizando
    `assertFiniteVector` de `src/domain/model/vector.ts`.
  - Opcional: helper puro que a partir de un cono produzca los datos normalizados que
    `evaluateVision` ya recibe (sin duplicar la logica de deteccion).
- `src/domain/perception/perception.ts` queda intacto en su contrato publico
  (`evaluateVision`, `VisionResult`, `VisionQuery`).

### 4.2 Aplicacion

- Mover `VISION_RANGE` y `FIELD_OF_VIEW` de `GameScene.ts` a
  `src/application/simulation/labLevel.ts` (junto a `PATROL_PAUSE_MS`, `CAPTURE_DISTANCE`, etc.).
- `perceptionSimulation.ts`: construir y exponer el cono efectivo del cuadro en
  `PerceptionFrame` (p. ej. `cone: VisionCone`), combinando la configuracion del nivel
  (radio/angulo), el observador (`observer`) y la orientacion (`facing`) que la escena ya inyecta.
  La escena deja de necesitar constantes propias para dibujar.

### 4.3 Juego

- `GameScene.ts`: eliminar `VISION_RANGE`/`FIELD_OF_VIEW` locales; pasar la configuracion
  desde `labLevel` a la simulacion de percepcion y dibujar el cono consumiendo
  `frame.cone` (origen, direccion, radio, angulo) en `drawPerception`.
- Reactividad visual (solo presentacion, decide nada de comportamiento): estilo del cono
  distinto segun el estado de conducta del guardia (`behaviorState.fsmState`) y/o el
  resultado de vision; el cono ya rota con `guardFacing`, incluida la mirada direccional
  de la Etapa 1 (fase `look`).
- El radio sonoro, el marcador de ultima posicion conocida y el HUD siguen como estan
  (pueden aprovechar los mismos datos si aporta claridad, sin cambiar reglas).

## 5. Estrategia de pruebas y evidencia

- Dominio (Vitest, Node, sin Phaser): nueva `tests/perception/visionCone.test.ts`
  para la entidad/validacion del cono.
- Aplicacion: extender `tests/application/perceptionSimulation.test.ts` para verificar que
  el frame expone el cono con la configuracion recibida (radio/angulo/origen/orientacion).
- Regresion: `tests/perception/perception.test.ts` y `tests/perception/memory.test.ts`
  deben seguir valiendo sin cambios de contrato; `tests/application/behaviorSimulation.test.ts`
  y `tests/behavior/*` (Etapa 1) no se ven afectados.
- Verificacion manual de reactividad: `npm run dev` y comprobar que el cono rota durante
  la mirada de patrulla (fase MIRADA), cambia de estilo ante la transicion a
  PERSIGUIENDO y conserva la oclusion. Limitacion conocida: no existe prueba
  automatizada de navegador.
- Evidencia: registrar intervencion y validacion en `docs/evidencias/` si el repositorio
  lo requiere para la entrega.
- Puerta de cierre: `npm run validate` (typecheck + test:run + build).

## 6. Decisiones a confirmar al iniciar la sesion

| # | Decision | Valor propuesto | Justificacion | Estado |
|---|---|---|---|---|
| E2.1 | Ubicacion del modelo del cono | Tipo `VisionCone` en `src/domain/perception/visionCone.ts` + configuracion en `labLevel.ts` | El plan de mejoras pide el modelo en dominio y la configuracion a nivel de escenario | Confirmable |
| E2.2 | Alcance de la reactividad | Estilo del cono distinto por estado de conducta (patrulla/investigando/persiguiendo/buscando/regresando/capturado) y resultado de vision | "Claridad de alcance y amenaza"; es presentacion, no comportamiento | Confirmable; alternativa: solo color por `vision.visible` como hoy, si la validacion visual lo prefiere |
| E2.3 | Visibilidad del cono | Siempre visible (como hoy), con estilo atenuado fuera de PURSUE | Mantiene la observabilidad continua del alcance | Confirmable |
| E2.4 | Contrato de perception | `evaluateVision` y `VisionResult` sin cambios; solo se agrega la exposicion del cono en el frame | Conserva la regresion de H3 intacta | Confirmable |

## 7. Condiciones para detenerse y consultar

Replica de `docs/permisos-recomendados.md:28-38`, aplicadas a esta etapa:

1. Ambiguedad con efectos distintos en los criterios de aceptacion: confirmar las
   decisiones E2.1-E2.4 antes de codificar.
2. Cambios concurrentes en `src/domain/perception/*`,
   `src/application/simulation/perceptionSimulation.ts`, `labLevel.ts` o
   `src/game/scenes/GameScene.ts` que interfieran con la tarea.
3. `npm run validate` que falle por causa no comprendida.
4. Accion que requiera credenciales, publicacion, instalacion de dependencias o perdida
   de informacion.
5. Cruce de limite arquitectonico (dibujo fuera de `game/`, datos del cono decididos en
   la capa de juego, o reglas de deteccion duplicadas en presentacion) sin registro
   documentado.

## 8. Cierre de la etapa

1. Ejecutar `npm run validate` y registrar el resultado.
2. Actualizar `Upgrades/estado-etapas.md` (Etapa 2: completada, fecha, archivos modificados,
   decisiones/umbrales, resultado de validate).
3. Actualizar la seccion de Etapa 2 en `Upgrades/plan-5-mejoras-1-2-4-6-9.md` con estado y notas.
4. No avanzar a la Etapa 3 si `npm run validate` falla.

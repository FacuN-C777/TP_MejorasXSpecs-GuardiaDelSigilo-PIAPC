---
id: plan-etapa-6-integracion-validacion
titulo: Plan de Etapa 6 - Integracion y validacion final
tipo: plan
audiencia: agente-de-desarrollo
acceso: publico
version: 1
---

# Plan de Etapa 6 - Integracion y validacion final

Objetivo de este documento: guiar una sesion nueva e independiente para ejecutar la Etapa 6
del plan de mejoras (cierre del plan: "Integracion + validacion final") sin depender de la
conversacion que la origino. El documento es autocontenido para la tarea; las restricciones
canonicas viven en `specs/`, `docs/` y `AGENTS.md` y se referencian, no se duplican. Leer
primero `AGENTS.md` y `docs/permisos-recomendados.md`.

## 1. Metadatos

| Campo | Valor |
|---|---|
| Proyecto | PIAPC 2026 - Laboratorio Guardia de Sigilo |
| Plan maestro | `Upgrades/plan-5-mejoras-1-2-4-6-9.md` |
| Etapa | Etapa 6 de 7 (Integracion + validacion final) |
| Rama de trabajo | Verificar con `git branch --show-current`; patron observado: `UpgradeFive` (Etapas 4-5). Proponer `UpgradeSix` si se crea rama nueva, o continuar en la rama actual si esta limpia (el arbol quedara limpio al cerrar la Etapa 5) |
| Estado previo | Etapas 0-5 completadas (`Upgrades/estado-etapas.md`; 155 pruebas, `npm run validate` OK el 06/10/2026) |
| Criterio de aceptacion | Todas las etapas completas; `npm run validate` finaliza sin errores; a lo sumo se agregan pruebas de integracion y documentacion (sin cambiar contratos de Etapas 1-5 salvo decision E6.x expresamente registrada); existe una secuencia reproducible documentada que recorra las 5 mejoras |

## 2. Punto de partida (estado real tras la Etapa 5)

Las cinco mejoras y el hito H4 estan implementados y validados por separado. Estructura real:

- H4 y Etapa 1: `src/domain/behavior/guardFsm.ts`, `patrol.ts`, `patrolPhase.ts`,
  `searchPattern.ts`; `src/application/simulation/behaviorSimulation.ts`.
- Etapa 2: `src/domain/perception/visionCone.ts` (+ `PerceptionFrame.cone`).
- Etapa 3: `src/application/simulation/alertFeedback.ts` (+ VFX en `GameScene`).
- Etapa 4: `src/domain/perception/cover.ts` (+ `COVER_VISION_FACTOR`,
  `PerceptionFrame.cover`).
- Etapa 5: `src/domain/behavior/escapeMoment.ts`, `src/application/simulation/escapeFeedback.ts`
  (+ `ESCAPE_NEAR_DISTANCE`).
- Configuracion de escenario: `src/application/simulation/labLevel.ts`.
- Presentacion: `src/game/scenes/GameScene.ts`.

No existen `src/domain/Guard.ts` ni `src/game/objects/Guard.ts`.

### 2.1 Checklist de eventos cruzados entre las 5 mejoras

| Cruce | Interaccion esperada | Donde verificar |
|---|---|---|
| E1 (pausa/mirada) x E2 (cono) | El cono rota con la mirada direccional (fase `look`); pausa/mirada se interrumpen por vision o sonido (prioridad perceptual) | `guardFacing` + `frame.cone` en `GameScene`; `patrolPhase` en `behaviorSimulation` |
| E2 (cono) x H4 | El estilo del cono reacciona a `fsmState` y a `vision.visible` (presentacion) | `coneStyle`; `tests/perception/visionCone.test.ts` |
| E3 (alerta) x FSM H4 | Solo entradas reales de estado gatillan `alertExtreme`; auto-transiciones no | `alertsForTransitions`; `tests/application/alertFeedback.test.ts` |
| E4 (cobertura) x E2 (cono) | Rango efectivo reducido (`COVER_VISION_FACTOR=0.45`, 220->99 px) se refleja en `evaluateVision` y en `cone.range` | `updatePerceptionSimulation`; `tests/perception/cover.test.ts` y `perceptionSimulation.test.ts` |
| E4 (cobertura) x E3 (alerta) | Menos alcance => mas transiciones `vision-lost`; puede aumentar la frecuencia de alertas `search-start` | Revisar frecuencia en verificacion manual; no reajustar sin E6.x |
| E4 (cobertura) x E5 (escape) | La cobertura favorece perdidas de vision cercanas => mas escapes; el escape requiere `PURSUE -> SEARCH` | `escapeForTransitions`; `tests/application/escapeFeedback.test.ts` |
| E5 (escape) x E3 (alerta) | En el mismo cuadro `PURSUE -> SEARCH`, E5.4 omite el VFX de `search-start` pero el HUD registra ambas lineas | `applyAlertFeedback(suppressFx)` en `GameScene` |
| E1-E5 x reinicio (R) | `GameScene.create()` resetea perception, behavior, alerta, escape y cobertura | Lineas de reset en `GameScene.create()` |
| Telemetria (H4/E1-E5) | HUD muestra estado, anterior, causa, objetivo, fase, alerta, escape, vision, sonido, memoria y cobertura | `updateTelemetry`; verificar sin desborde en visual |
| Invarian de memoria | La ultima posicion conocida solo cambia ante percepcion valida; con cobertura el rango efectivo tambien acota la memoria | `rememberObservation` en `perceptionSimulation` |

### 2.2 Carencias que cierra la Etapa 6

| Carencia | Evidencia |
|---|---|
| No hay una prueba de integracion que recorra TODAS las mejoras en una sola ejecucion | Las suites cubren cada etapa por separado; ninguna ejecuta PATROL (pausa/mirada) -> INVESTIGATE -> PURSUE -> SEARCH -> RETURN -> PATROL combinado con cobertura, alertas y escape |
| No existe una secuencia reproducible documentada del recorrido completo | El criterio de aceptacion global 3 pide "transiciones reproducibles mediante una secuencia documentada"; las etapas registraron verificaciones manuales sueltas |
| Documentacion final del plan | `plan-5-mejoras-1-2-4-6-9.md` y `estado-etapas.md` deben quedar como entrega final (todas completadas) |

### 2.3 Lugar exacto donde interviene esta Etapa

Idealmente sin cambios de contrato; solo:
- prueba(s) de integracion nueva(s) en `tests/` que consuman los contratos existentes;
- verificacion manual con `npm run dev` siguiendo la secuencia reproducible;
- documentacion final (`estado-etapas.md`, `plan-5-mejoras-1-2-4-6-9.md` y, si se confirma,
  una seccion breve en `README.md`).
Si una interaccion revelara un defecto, corregir de forma acotada y con el diagnostico
registrado (E6.3).

## 3. Restricciones obligatorias

- `src/domain/` no importa Phaser, DOM ni APIs de navegador (`AGENTS.md:12`).
- `src/application/` coordina casos de uso y no representa la escena (`AGENTS.md:13`).
- `src/game/` adapta Phaser y no decide reglas de comportamiento (`AGENTS.md:14`).
- No se agregan dependencias ni recursos externos.
- Los contratos de Etapas 1-5 no cambian salvo decision E6.x registrada (los tests
  existentes deben seguir valiendo tal cual).
- Cada etapa cierra con `npm run validate` (`AGENTS.md:20`); la respuesta del modelo no
  constituye evidencia de funcionamiento.
- No se crean commits ni publicaciones sin autorizacion humana explicita.

## 4. Diseno propuesto (decisiones E6.1-E6.4 a confirmar)

### 4.1 Integracion (pruebas)

- Nueva `tests/application/integration.test.ts` (o ampliacion de `behaviorSimulation.test.ts`):
  con `BehaviorSimulator` recorrer `PATROL -> INVESTIGATE -> PURSUE -> SEARCH -> RETURN ->
  PATROL` inyectando sonido, vision valida, perdida de vision cercana (con cobertura activa),
  exhaucion de busqueda y regreso; al final del recorrido verificar:
  - `alertsForTransitions(sim.allTransitions)` devuelve exactamente las alertas de las
    transiciones criticas (Etapa 3);
  - al menos un `escapeForTransitions` da no-nulo en la perdida de vision cercana (Etapa 5);
  - la cobertura (Etapa 4) se refleja en que la vision cercana con rango reducido no produce
    memoria si esta fuera del rango efectivo (invariante).
  La prueba depende del patron de `tests/application/alertFeedback.test.ts` y
  `escapeFeedback.test.ts`.

### 4.2 Secuencia reproducible y documentacion final

- Documentar en `Upgrades/estado-etapas.md` (seccion de cierre) y/o `README.md` una
  secuencia manual paso a paso: iniciar `npm run dev`, provocar sonido (Q), ser visto
  (persecucion y alerta), meterse en cobertura para romper la linea, escapar cerca
  (flash verde), verificar busqueda/regreso y reinicio (R). Registrar el detalle visual
  esperado en cada paso.

### 4.3 Ajustes cruzados (solo si la validacion lo requiere)

- Si la cobertura (E4) produce una frecuencia de alertas/escapes que degrada la
  observabilidad, NO reajustar umbrales en silencio: registrar diagnostico y confirmar
  con el humano el ajuste (todas las constantes viven en `labLevel.ts` salvo el ritmo de
  presentacion en `GameScene`).

## 5. Estrategia de pruebas y evidencia

- Integracion: `tests/application/integration.test.ts` segun 4.1.
- Regresion: toda la suite existente (155 pruebas) debe seguir valiendo sin cambios.
- Validacion: `npm run validate` (typecheck + test:run + build).
- Verificacion manual: ejecutar la secuencia reproducible de 4.2 con `npm run dev`;
  comprobar HUD completo sin desborde, VFX de Etapa 3 y E5.4, cono de Etapa 2 con rango
  efectivo de Etapa 4, y reinicio (R) que restaura todas las lineas de HUD.
  Limitacion conocida: no existe prueba automatizada de navegador.
- Evidencia: registrar intervencion y validacion en `docs/evidencias/` si el repositorio
  lo requiere para la entrega (precedente: las Etapas 1-5 no crearon archivos alla).
- Puerta de cierre: `npm run validate`.

## 6. Decisiones a confirmar al iniciar la sesion

| # | Decision | Valor propuesto | Justificacion | Estado |
|---|---|---|---|---|
| E6.1 | Prueba de integracion nueva | Agregar `tests/application/integration.test.ts` con el recorrido completo (4.1) | Criterio global 4 (navegacion + FSM con pruebas) ya cubre; 4.1 cierra el cruce entre mejoras sin tocar contratos | Confirmable; alternativa: sin codigo nuevo, solo regresion + docs |
| E6.2 | Documentacion de la secuencia reproducible | Seccion de cierre en `estado-etapas.md` + breve seccion en `README.md` | Criterio global 3 y 5 (telemetria explica cada transicion) | Confirmable; alternativa: solo `estado-etapas.md` |
| E6.3 | Ajustes cruzados de umbrales | No reajustar sin diagnostico y confirmacion humana; registrar cualquier interaccion conflictiva | Evita cambios de comportamiento no acordados en la etapa final | Confirmable |
| E6.4 | Alcance de cambios permitidos | Solo pruebas de integracion, documentacion y correcciones acotadas con diagnostico registrado | La Etapa 6 no debe reabrir diseno de Etapas 1-5 | Confirmable |

## 7. Condiciones para detenerse y consultar

Replica de `docs/permisos-recomendados.md:28-38`, aplicadas a esta etapa:

1. Ambiguedad con efectos distintos en los criterios de aceptacion: confirmar E6.1-E6.4.
2. Cambios concurrentes en `src/application/simulation/*`, `src/domain/*`,
   `src/game/scenes/GameScene.ts` o en los tests que interfieran con la tarea.
3. `npm run validate` que falle por causa no comprendida.
4. Accion que requiera credenciales, publicacion, instalacion de dependencias o perdida
   de informacion.
5. Cruce de limite arquitectonico (regla nueva fuera de `domain/`, o cambios que rompan
   `BehaviorFrame`, `PerceptionFrame`, `alertsForTransitions` o `escapeForTransitions`)
   sin registro documentado.

## 8. Cierre de la etapa (y del plan)

1. Ejecutar `npm run validate` y registrar el resultado.
2. Actualizar `Upgrades/estado-etapas.md` (Etapa 6: completada, archivos modificados,
   decisiones/umbrales E6.1-E6.4, resultado de validate; marcar el plan como cerrado).
3. Actualizar la seccion de Etapa 6 en `Upgrades/plan-5-mejoras-1-2-4-6-9.md` con estado
   y notas, y el resumen general (5 mejoras integradas).
4. Comprobar los criterios de aceptacion globales de `specs/01-producto.md` (1-6).
5. No declarar el plan cerrado si `npm run validate` falla.
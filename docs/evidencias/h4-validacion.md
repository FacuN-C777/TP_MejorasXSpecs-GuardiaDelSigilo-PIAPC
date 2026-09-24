---
id: laboratorio-evidencia-validacion-h4
titulo: Evidencia de validación H4
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia de validación H4

- Fecha: 24 de septiembre de 2026.
- Entorno: Windows, Node.js (nvm en `C:\nvm4w`), npm vía `npm.cmd` por política de ejecución de PowerShell.
- Versión evaluada: cambios H4 sobre `FirstUpgrade` (sin commit nuevo).

| Criterio | Método | Comando | Resultado |
|---|---|---|---|
| Tipos estrictos | automatizado | `npm run typecheck` | Sin errores |
| Pruebas de dominio y aplicación | automatizado | `npm run test:run` | 97 pruebas aprobadas en 15 archivos |
| Producto web | automatizado | `npm run build` | 23 módulos en `dist/`; advertencia de tamaño no bloqueante |
| Integración completa | automatizado | `npm run validate` | Typecheck, tests y build aprobados |

## Cobertura por archivo

- `tests/behavior/guardFsm.test.ts`: guardas e invariantes de la tabla de transiciones; eventos fuera de tabla lanzan error; `reset` global regresa a PATROL con causa `reinicio`.
- `tests/behavior/patrol.test.ts`: primer punto, avance cíclico, retroceso al inicial, punto perimetral y punto bloqueado (salto).
- `tests/behavior/searchPattern.test.ts`: anillos transitables, exclusión de bloqueadas, radio cero, origen bloqueado y origen rodeado de paredes → patrón vacío.
- `tests/behavior/investigate.test.ts`: viaje al sonido, mini-búsqueda (decisión 8.2), re-objetivo por nuevo sonido y prioridad de visión sobre sonido simultáneo.
- `tests/behavior/pursue.test.ts`: entrada por visión, sin replanificación por cuadro, replanificación por cambio de celda, visión perdida → SEARCH y captura a distancia cercana (estado terminal inmóvil).
- `tests/behavior/search.test.ts`: recorrido del patrón con avances registrados, recuperación de visión → PURSUE y retorno directo por origen aislado.
- `tests/behavior/return.test.ts`: regreso y reanudación del ciclo, interrupción por visión/sonido y recuperación explícita ante un punto inaccesible (exclusión de `failedReturnTargets`).
- `tests/behavior/telemetry.test.ts`: registro de transiciones y eventos por estado/evento.
- `tests/application/behaviorSimulation.test.ts`: puntos de patrulla transitables y mutuamente alcanzables en `LAB_MAP`; secuencia canónica `PATROL → INVESTIGATE → PURSUE → SEARCH → RETURN → PATROL`; salto de punto de patrulla inaccesible.

## Caminos de fallo ejercitados

- Destino inaccesible en PATROL (salto al siguiente punto válido).
- Destino inaccesible en RETURN (recuperación explícita con exclusión acumulada).
- Origen de búsqueda rodeado de paredes (patrón vacío → RETURN directo).
- Ruta de una celda (inicio igual a destino, sin movimiento).
- Captura sin visión válida (la guarda impide `captured`).

## Límites

- No validado de forma automatizada: interacción por navegador (clic retirado en H4; controles restantes `Q` y `R`). La verificación visual es manual.
- Fallos abiertos: ninguno conocido. La advertencia de chunk de Phaser supera los 500 kB, como en H3, sin efecto bloqueante.
# Plan — práctica de navegación

Estado: Aprobado
Variante: A (terreno lento)
Spec: spec.md (aprobada)

Precondición: BASE-AC4 — spec y plan aprobados antes de editar código.

| Incremento | Trabajo | Archivos reales | Criterios | Comprobación |
| --- | --- | --- | --- | --- |
| 1 — dominio y pruebas | Añadir costo de entrada opcional al modelo y sumar el costo ponderado en A*, conservando BFS unitario. Pruebas de franja lenta y de restauración sobre el fixture común. | `src/domain/model/grid.ts`, `src/domain/navigation/search.ts`, `tests/navigation/weightedTerrain.test.ts` | A-01, A-02, A-04, A-AC1, A-AC2; regresión BASE-AC2 | `npm run test:run -- tests/navigation` |
| 2 — conexión con el consumidor | Verificar que `behaviorSimulation.planRoute` hereda el modo ponderado desde `input.map` sin interfaz nueva y conserva el caso unitario. | `tests/application/behaviorSimulation.test.ts`; `src/application/simulation/behaviorSimulation.ts` sólo si resultara imprescindible | A-03, A-AC3, BASE-AC5 | `npm run test:run -- tests/application/behaviorSimulation.test.ts` |
| 3 — cierre | Validación completa, revisión de diff y cierre de la evidencia del anexo. | `docs/practica-navegacion/evidencia.md`; diff de `src/` y `tests/` | BASE-AC1, BASE-AC4, BASE-AC6 | `npm run validate` |

Referencia previa: comparación y casos comunes BASE-01 a BASE-04 completados
(`docs/practica-navegacion/evidencia.md`).

Riesgos:
- Redefinir `totalCost` (pasos) a suma ponderada puede afectar expectativas
  unitarias (`tests/navigation/search.test.ts:22` espera 12); se mitiga manteniendo
  el costo por defecto 1, que equivale a pasos.
- La heurística Manhattan deja de ser admisible si se admiten costos menores que 1;
  se exige costo entero y >= 1.

Detenerse si:
- Faltan permisos o aparecen cambios ajenos que interfieran.
- Hay conflicto de contrato, regresión nueva o se requiere dependencia, UI o
  refactorización fuera del alcance.
- Aparece un costo no entero o menor que 1 en la configuración.
- La conexión con el consumidor exige tocar la FSM o crear una interfaz nueva.

No crear commits ni publicar automáticamente.

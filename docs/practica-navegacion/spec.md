# Spec: práctica de navegación — 7 al 14/10/2026

Estado: Aprobada
Repositorio: (https://github.com/FacuN-C777/TP_MejorasXSpecs-GuardiaDelSigilo-PIAPC.git)
Commit inicial: 71d78fee157519c5070f9421c28a7c60dd51e18c
Variante elegida: A
Rutas relevantes:
- Búsqueda: `src/domain/navigation/search.ts:64` `findPathAStar`, `:24` `findPathBfs`,
  `:101` `candidateCost`, `:176` `totalCost`.
- Grafo y heurística: `src/domain/navigation/gridGraph.ts:10` `walkableNeighbors`,
  `:26` `manhattanDistance`.
- Modelo: `src/domain/model/grid.ts:6` `GridMap`, `:16` `createGridMap`, `:48` `isWalkable`.
- Seguimiento: `src/domain/navigation/pathFollower.ts:10` `advanceAlongPath`.
- Consumidor: `src/application/simulation/behaviorSimulation.ts:562` `planRoute` →
  `:567` `findPathAStar`.
- Pruebas: `tests/navigation/search.test.ts`, `tests/navigation/pathFollower.test.ts`,
  `tests/application/behaviorSimulation.test.ts`.

Comandos confirmados:
- Prueba enfocada (confirmada): `npm run test:run -- tests/navigation` → línea base 2 archivos / 15 pruebas; tras los incrementos, 4 archivos / 35 pruebas.
- Validación completa: `npm run validate` (typecheck + test:run + build; `package.json:16`).
- En Windows con política de ejecución restringida usar `npm.cmd` (ver `docs/evidencias/h4-validacion.md:13`).

## Objetivo

Comparar navegación y verificar una única mejora con un caso normal y uno
límite, manteniendo separadas búsqueda, seguimiento y decisión.

## Alcance

Exploración, línea base, comparación BFS/A\*, trazas guiadas DFS/Dijkstra,
adaptación de esta spec, un plan de tres incrementos, la variante seleccionada,
validación y entrega. La variante se conecta con una entrada de navegación o
simulación existente; no queda como un algoritmo aislado sin consumidor.

## Fuera de alcance

Implementar DFS o Dijkstra; cambiar FSM, percepción o controles; agregar
dependencias, editor de mapas, motor nuevo o despliegue; hacer varias variantes.

## Requisitos comunes

BASE-01: identificar búsqueda, seguimiento, consumidor y pruebas con rutas;
registrar commit inicial, cambios previos y validación de referencia.
BASE-02: usar el fixture de 5x3 definido debajo y registrar vecinos/desempate.
Comparar BFS y A\* unitarios con igual mapa, inicio y meta: estado, ruta, pasos,
costo, nodos expandidos y frontera máxima. No inventar métricas ausentes.
Si una métrica no existe, registrar la limitación sin agregar instrumentación
obligatoria; conservar al menos estado, ruta, pasos y costo comprobable.
BASE-03: explicar la traza DFS y completar los costos de la traza Dijkstra
provistas en la guía. No implementar nuevos algoritmos para este requisito.
BASE-04: verificar éxito con ruta válida, inicio igual a meta con costo 0,
destino libre pero inaccesible y extremos inválidos, usando el contrato real
del proyecto. No representar éxito inmóvil y fracaso de forma indistinguible.
BASE-05: copiar un solo anexo, contrastar sus supuestos con el código, completar
rutas/comandos y señalar incompatibilidades. Aprobar spec y plan antes de editar
código. Registrar un contraste y una decisión humana, sin transcribir el chat.
BASE-06: implementar sólo la variante aprobada, reutilizar capacidades ya
existentes y revisar cada incremento. Conservar dominio puro y conducta previa.
BASE-07: producir evidencia del camino normal, el caso límite y una llamada
desde el consumidor real o su prueba de integración. Ejecutar prueba enfocada
y validación del repositorio; revisar diff y regresiones.
BASE-08: entregar el 14/10/2026, en un único paquete, spec.md, plan.md y
evidencia.md bajo docs/practica-navegacion/, más URL y commit final.

## Fixture común

Cuadrícula: x=0..4, y=0..2; origen arriba a la izquierda; cuatro vecinos,
sin diagonales; inicio S=(0,1), meta G=(4,1); todas las celdas libres y costo 1.
La ruta incluye inicio y meta. Pasos = cantidad de aristas, no de puntos.
Para el caso inaccesible, bloquear (2,0), (2,1) y (2,2); la meta sigue libre.
Para extremos inválidos: inicio (-1,1) o meta (5,1), en casos separados.
Traducir el fixture al formato actual sin cambiar su semántica.

## Restricciones

No sobreescribir cambios anteriores ni modificar pruebas para ocultar fallos.
No instalar dependencias, acceder a secretos o publicar. No cambiar el motor
ni la FSM. Escritura acotada a documentos, navegación, su consumidor mínimo y
pruebas previstas en el plan. No autorizar commits automáticos.
Todos los comandos deben existir o estar justificados y autorizados.

## Criterios comunes

BASE-AC1: evidencia identifica repositorio/commit, capas, cambios previos,
comando y resultado inicial; lo observado se distingue de lo supuesto.
BASE-AC2: en el fixture libre, BFS y A\* devuelven ruta cardinal válida de
4 pasos y costo 4. Registrar resultados reales y explicar métricas disponibles.
Las trazas DFS/Dijkstra incluyen conclusión sobre pasos frente a costos.
BASE-AC3: inicio=meta es éxito de costo 0; barrera completa es inaccesible;
extremos fuera de mapa producen resultados inválidos según contrato documentado.
BASE-AC4: spec y plan aprobados antes de implementación; una decisión humana
y su contraste quedan registrados, y sólo se desarrolla el anexo elegido.
BASE-AC5: criterios del anexo tienen pruebas reproducibles; existe evidencia
de su conexión con el consumidor; validación final y diff revisados, sin
regresiones nuevas ni ampliaciones ocultas del alcance.
BASE-AC6: los tres documentos, la URL y el commit final identifican la misma
versión entregada el 14/10; los cambios de código y pruebas están en ese commit.

## Evidencia y decisiones

Usar la plantilla evidencia.md de esta guía. Si un supuesto no se cumple,
marcarlo como pendiente y consultar; no aprobar una spec con dudas que afecten
el comportamiento. La hora/canal de entrega será la indicada por la cátedra.

## Anexo A: terreno lento

Intención: minimizar costo de desplazamiento, no sólo cantidad de pasos.
Escenario: fixture BASE, con costo de entrada 5 en (1,1), (2,1), (3,1).
El resto cuesta 1; el inicio no suma costo. No hay celdas bloqueadas.

Requisitos:
A-01: el cálculo ponderado suma costos de entrada positivos; BFS conserva
su semántica unitaria y no se presenta como oráculo del mínimo ponderado.
A-02: usar A\* existente con costo ponderado y heurística Manhattan válida
(costo mínimo 1), o su capacidad equivalente ya existente; no implementar
Dijkstra adicional. Mantener compatible el caso unitario anterior.
A-03: conectar el modo ponderado con un consumidor de navegación/simulación
existente mediante configuración explícita, sin crear una interfaz nueva.
A-04: si la franja vuelve a costo 1, la búsqueda usa esos nuevos datos y
recupera el mínimo unitario; no reutiliza costos anteriores por accidente.

Criterios:
A-AC1: la ruta directa tiene 4 pasos y costo 16 (=5+5+5+1).
La búsqueda ponderada devuelve un rodeo válido de 6 pasos y costo total 6.
Puede pasar por arriba o abajo; no exigir una ruta única en un empate.
A-AC2: sin franja lenta, resultado de 4 pasos y costo 4.
A-AC3: prueba del consumidor confirma que usa el modo ponderado y obtiene
costo 6 con franja; el modo unitario existente conserva su funcionamiento.

Adaptación al contrato (decidida, sin conflictos pendientes):
- `totalCost` pasa a ser la suma de los costos de entrada de las celdas de la ruta.
  Con costo por defecto 1 equivale a la cantidad de pasos, por lo que conserva la
  semántica actual y las pruebas unitarias de `tests/navigation/search.test.ts`.
- Fuente de costo: `GridMap` incorpora costos de entrada opcionales (análogo a
  `blocked`); las celdas sin dato valen 1. Se exigen costos enteros y >= 1 para
  mantener admisible la heurística Manhattan (costo mínimo 1).
- BFS no interpreta costos: conserva su semántica unitaria (A-01) y su `totalCost`
  siguen siendo pasos.
- Consumidor confirmado: `src/application/simulation/behaviorSimulation.ts:562`
  `planRoute` → `findPathAStar`. Al viajar los costos dentro de `GridMap`, el modo
  ponderado se activa con configuración explícita del mapa, sin crear interfaz nueva.
- Incompatibilidad resuelta: `search.ts:176` calculaba `totalCost = path.length - 1`;
  se reemplaza por la suma ponderada manteniendo el mismo valor en mapas unitarios.

Fuera de alcance: modificar velocidad, crear terrenos gráficos o editar niveles.
Evidencia: prueba de franja, prueba de restauración, comparación de costos y
prueba de consumidor; registrar en evidencia.md.

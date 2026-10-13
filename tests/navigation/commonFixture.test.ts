import { describe, expect, it } from "vitest";
import {
  createGridMap,
  isWalkable,
  type GridPoint,
} from "../../src/domain/model/grid";
import { findPathAStar, findPathBfs } from "../../src/domain/navigation/search";

// Fixture común (BASE-02): x=0..4, y=0..2; S=(0,1), G=(4,1);
// cuatro vecinos cardinales, sin diagonales; todas las celdas libres con costo 1.
const START: GridPoint = { x: 0, y: 1 };
const GOAL: GridPoint = { x: 4, y: 1 };
const FREE_MAP = createGridMap(5, 3, []);
const BARRIER_CELLS: readonly GridPoint[] = [
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
];
const BARRIER_MAP = createGridMap(5, 3, BARRIER_CELLS);

function steps(result: { path: readonly GridPoint[] }): number {
  return result.path.length - 1;
}

function isCardinalStep(from: GridPoint, to: GridPoint): boolean {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y) === 1;
}

describe.each([
  ["BFS", findPathBfs],
  ["A*", findPathAStar],
] as const)("fixture común 5x3 — %s", (_name, findPath) => {
  it("BASE-02: finds a cardinal route of 4 steps and cost 4", () => {
    const result = findPath(FREE_MAP, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.path[0]).toEqual(START);
    expect(result.path.at(-1)).toEqual(GOAL);
    expect(steps(result)).toBe(4);
    expect(result.totalCost).toBe(4);
    expect(result.path.every((point) => isWalkable(FREE_MAP, point))).toBe(true);

    for (let index = 1; index < result.path.length; index += 1) {
      const previous = result.path[index - 1];
      const current = result.path[index];
      if (!previous || !current) {
        throw new Error("Path invariant failed.");
      }
      expect(isCardinalStep(previous, current)).toBe(true);
    }
  });

  it("BASE-04: start equal to goal is success with cost 0", () => {
    const result = findPath(FREE_MAP, START, START);

    expect(result.status).toBe("success");
    expect(result.path).toEqual([START]);
    expect(steps(result)).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("BASE-04: free but unreachable goal fails explicitly", () => {
    const result = findPath(BARRIER_MAP, START, GOAL);

    expect(result.status).toBe("unreachable");
    expect(result.path).toEqual([]);
    expect(result.totalCost).toBeNull();
  });

  it("BASE-04: start outside the map is an invalid start", () => {
    const result = findPath(FREE_MAP, { x: -1, y: 1 }, GOAL);

    expect(result.status).toBe("invalid-start");
    expect(result.expandedNodes).toBe(0);
  });

  it("BASE-04: goal outside the map is an invalid goal", () => {
    const result = findPath(FREE_MAP, START, { x: 5, y: 1 });

    expect(result.status).toBe("invalid-goal");
    expect(result.expandedNodes).toBe(0);
  });
});

// Valores registrados el 13/10/2026 sobre el contrato actual (commit 71d78fe).
// El orden de `explored` documenta vecinos y desempate: vecinos cardinales en
// orden arriba, derecha, abajo, izquierda (gridGraph.ts:3-8); BFS desempata por
// orden de encolado y A* por menor costo+heurística, luego heurística, luego
// orden de inserción (search.ts:137-155).
describe("fixture común 5x3 — resultados registrados (BASE-02)", () => {
  const keys = (points: readonly GridPoint[]): string[] =>
    points.map((point) => `${point.x},${point.y}`);

  it("BFS: 4 pasos, costo 4, 12 expandidos, frontera máxima 4", () => {
    const result = findPathBfs(FREE_MAP, START, GOAL);

    expect({
      status: result.status,
      steps: steps(result),
      cost: result.totalCost,
      expanded: result.expandedNodes,
      maxFrontier: result.maximumFrontier,
      path: keys(result.path),
    }).toEqual({
      status: "success",
      steps: 4,
      cost: 4,
      expanded: 12,
      maxFrontier: 4,
      path: ["0,1", "1,1", "2,1", "3,1", "4,1"],
    });
    expect(keys(result.explored)).toEqual([
      "0,1", "0,0", "1,1", "0,2", "1,0", "2,1",
      "1,2", "2,0", "3,1", "2,2", "3,0", "4,1",
    ]);
  });

  it("A*: 4 pasos, costo 4, 5 expandidos, frontera máxima 9", () => {
    const result = findPathAStar(FREE_MAP, START, GOAL);

    expect({
      status: result.status,
      steps: steps(result),
      cost: result.totalCost,
      expanded: result.expandedNodes,
      maxFrontier: result.maximumFrontier,
      path: keys(result.path),
    }).toEqual({
      status: "success",
      steps: 4,
      cost: 4,
      expanded: 5,
      maxFrontier: 9,
      path: ["0,1", "1,1", "2,1", "3,1", "4,1"],
    });
    expect(keys(result.explored)).toEqual(["0,1", "1,1", "2,1", "3,1", "4,1"]);
  });

  it("A* conserva el costo óptimo expandiendo menos que BFS", () => {
    const bfs = findPathBfs(FREE_MAP, START, GOAL);
    const astar = findPathAStar(FREE_MAP, START, GOAL);

    expect(astar.totalCost).toBe(bfs.totalCost);
    expect(astar.expandedNodes).toBeLessThan(bfs.expandedNodes);
  });
});

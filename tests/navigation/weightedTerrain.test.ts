import { describe, expect, it } from "vitest";
import {
  createGridMap,
  entryCost,
  isWalkable,
  type GridMap,
  type GridPoint,
} from "../../src/domain/model/grid";
import { findPathAStar, findPathBfs } from "../../src/domain/navigation/search";

// Anexo A: fixture común 5x3 con franja lenta de costo de entrada 5 en la fila
// central (1,1),(2,1),(3,1). S=(0,1), G=(4,1); el inicio no suma costo.
const START: GridPoint = { x: 0, y: 1 };
const GOAL: GridPoint = { x: 4, y: 1 };
const DIRECT_PATH: readonly GridPoint[] = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
];
const SLOW_CELLS: readonly (readonly [GridPoint, number])[] = [
  [{ x: 1, y: 1 }, 5],
  [{ x: 2, y: 1 }, 5],
  [{ x: 3, y: 1 }, 5],
];
const SLOW_MAP = createGridMap(5, 3, [], SLOW_CELLS);
const UNIT_MAP = createGridMap(5, 3, []);

function weightedPathCost(path: readonly GridPoint[], map: GridMap): number {
  return path.slice(1).reduce((sum, point) => sum + entryCost(map, point), 0);
}

describe("anexo A: terreno lento (fixture 5x3)", () => {
  it("A-AC1: la ruta directa cuesta 16 (5+5+5+1)", () => {
    expect(weightedPathCost(DIRECT_PATH, SLOW_MAP)).toBe(16);
  });

  it("A-AC1: A* prefiere un rodeo de 6 pasos y costo total 6", () => {
    const result = findPathAStar(SLOW_MAP, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.path.length - 1).toBe(6);
    expect(result.totalCost).toBe(6);
    expect(weightedPathCost(result.path, SLOW_MAP)).toBe(6);
    expect(result.path.every((point) => isWalkable(SLOW_MAP, point))).toBe(true);
  });

  it("A-AC1: el rodeo pasa por arriba o por abajo y evita la franja lenta", () => {
    const result = findPathAStar(SLOW_MAP, START, GOAL);
    const cells = result.path.map((point) => `${point.x},${point.y}`);
    const goesTop = cells.includes("0,0") || cells.includes("1,0");
    const goesBottom = cells.includes("0,2") || cells.includes("1,2");

    expect(goesTop || goesBottom).toBe(true);
    for (const point of result.path) {
      expect(entryCost(SLOW_MAP, point)).toBe(1);
    }
  });

  it("A-AC2: sin franja lenta, A* da 4 pasos y costo 4", () => {
    const result = findPathAStar(UNIT_MAP, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("A-01: BFS conserva la semántica unitaria y no interpreta costos", () => {
    const result = findPathBfs(SLOW_MAP, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("A-04: al volver la franja a costo 1, la búsqueda recupera el mínimo unitario", () => {
    const restored = createGridMap(5, 3, [], [
      [{ x: 1, y: 1 }, 1],
      [{ x: 2, y: 1 }, 1],
      [{ x: 3, y: 1 }, 1],
    ]);
    const result = findPathAStar(restored, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("rechaza costos no enteros o menores que 1", () => {
    expect(() => createGridMap(5, 3, [], [[{ x: 1, y: 1 }, 0]])).toThrow("Entry costs");
    expect(() => createGridMap(5, 3, [], [[{ x: 1, y: 1 }, 1.5]])).toThrow("Entry costs");
  });
});

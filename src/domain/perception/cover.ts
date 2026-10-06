import { isWalkable, worldToCell, type GridMap } from "../model/grid";
import { assertFiniteVector, type Vector2 } from "../model/vector";

export type CoverReason = "adjacent-to-obstacle" | "open";

export interface CoverResult {
  readonly covered: boolean;
  readonly reason: CoverReason;
}

export function evaluateCover(map: GridMap, tileSize: number, position: Vector2): CoverResult {
  assertFiniteVector(position);
  if (!Number.isFinite(tileSize) || tileSize <= 0) {
    throw new Error("Cover evaluation requires a positive tileSize.");
  }

  const cell = worldToCell(position, tileSize);
  if (!isWalkable(map, cell)) {
    return { covered: false, reason: "open" };
  }

  const neighbors = [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ];

  for (const n of neighbors) {
    if (!isWalkable(map, n)) {
      return { covered: true, reason: "adjacent-to-obstacle" };
    }
  }

  return { covered: false, reason: "open" };
}

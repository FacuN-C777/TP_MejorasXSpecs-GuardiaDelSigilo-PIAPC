import { cellKey, isWalkable, type GridMap, type GridPoint } from "../model/grid";
import { manhattanDistance } from "../navigation/gridGraph";

export interface PatrolSelection {
  readonly index: number;
  readonly point: GridPoint;
}

export function firstPatrolPoint(
  points: readonly GridPoint[],
  map: GridMap,
): PatrolSelection | null {
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point && isWalkable(map, point)) {
      return { index, point };
    }
  }
  return null;
}

export function nextPatrolPoint(
  points: readonly GridPoint[],
  map: GridMap,
  currentIndex: number,
): PatrolSelection | null {
  if (!Number.isInteger(currentIndex) || currentIndex < 0) {
    throw new Error("Patrol index must be a non-negative integer.");
  }
  if (points.length === 0) {
    return null;
  }

  for (let step = 1; step <= points.length; step += 1) {
    const index = (currentIndex + step) % points.length;
    const point = points[index];
    if (point && isWalkable(map, point)) {
      return { index, point };
    }
  }
  return null;
}

export function nearestPatrolPoint(
  points: readonly GridPoint[],
  map: GridMap,
  from: GridPoint,
  excluded: readonly GridPoint[] = [],
): PatrolSelection | null {
  const excludedKeys = new Set(excluded.map(cellKey));
  let selected: PatrolSelection | null = null;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point || !isWalkable(map, point) || excludedKeys.has(cellKey(point))) {
      continue;
    }
    const distance = manhattanDistance(from, point);
    const selectedDistance = selected ? manhattanDistance(from, selected.point) : Number.POSITIVE_INFINITY;
    if (!selected || distance < selectedDistance || (distance === selectedDistance && index < selected.index)) {
      selected = { index, point };
    }
  }

  return selected;
}

export function patrolIndexForPoint(
  points: readonly GridPoint[],
  point: GridPoint,
): number | null {
  const index = points.findIndex(
    (candidate) => candidate.x === point.x && candidate.y === point.y,
  );
  return index >= 0 ? index : null;
}
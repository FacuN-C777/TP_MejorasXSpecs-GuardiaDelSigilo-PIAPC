import { isWalkable, type GridMap, type GridPoint } from "../model/grid";

export function buildSearchPattern(
  map: GridMap,
  origin: GridPoint,
  radiusCells: number,
): readonly GridPoint[] {
  if (!Number.isInteger(radiusCells) || radiusCells < 0) {
    throw new Error("Search radius must be a non-negative integer.");
  }
  if (!Number.isInteger(origin.x) || !Number.isInteger(origin.y)) {
    throw new Error("Search origin must be an integer cell.");
  }
  if (!isWalkable(map, origin)) {
    return [];
  }

  const AXIAL = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const hasWalkableExit = AXIAL.some(
    (offset) => isWalkable(map, { x: origin.x + offset.x, y: origin.y + offset.y }),
  );
  if (!hasWalkableExit) {
    return [];
  }

  const rings: GridPoint[] = [];
  for (let radius = 1; radius <= radiusCells; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        const distanceX = Math.abs(x - origin.x);
        const distanceY = Math.abs(y - origin.y);
        if (Math.max(distanceX, distanceY) !== radius) {
          continue;
        }
        const cell = { x, y };
        if (isWalkable(map, cell)) {
          rings.push(cell);
        }
      }
    }
  }
  return rings;
}
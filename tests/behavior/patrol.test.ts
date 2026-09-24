import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import {
  firstPatrolPoint,
  nearestPatrolPoint,
  nextPatrolPoint,
  patrolIndexForPoint,
} from "../../src/domain/behavior/patrol";

describe("patrol points", () => {
  it("selects the first walkable point as the initial one", () => {
    const map = createGridMap(6, 6, [{ x: 1, y: 1 }, { x: 1, y: 2 }]);
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }];

    const selection = firstPatrolPoint(points, map);

    expect(selection).toEqual({ index: 0, point: { x: 0, y: 0 } });
  });

  it("skips blocked points to find the first initial point", () => {
    const map = createGridMap(6, 6, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];

    const selection = firstPatrolPoint(points, map);

    expect(selection).toEqual({ index: 2, point: { x: 2, y: 2 } });
  });

  it("returns null when every patrol point is blocked", () => {
    const map = createGridMap(3, 3, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(firstPatrolPoint([{ x: 0, y: 0 }, { x: 1, y: 1 }], map)).toBeNull();
    expect(nextPatrolPoint([{ x: 0, y: 0 }], map, 0)).toBeNull();
    expect(nearestPatrolPoint([{ x: 0, y: 0 }], map, { x: 2, y: 2 })).toBeNull();
  });

  it("advances the cycle in order and skips blocked points", () => {
    const map = createGridMap(6, 6, [{ x: 2, y: 2 }]);
    const points = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }];

    expect(nextPatrolPoint(points, map, 0)).toEqual({ index: 2, point: { x: 3, y: 1 } });
    expect(nextPatrolPoint(points, map, 1)).toEqual({ index: 2, point: { x: 3, y: 1 } });
  });

  it("wraps around the cycle", () => {
    const map = createGridMap(6, 6, []);
    const points = [{ x: 1, y: 1 }, { x: 2, y: 3 }];

    expect(nextPatrolPoint(points, map, 1)).toEqual({ index: 0, point: { x: 1, y: 1 } });
  });

  it("chooses the nearest walkable patrol point", () => {
    const map = createGridMap(6, 6, [{ x: 2, y: 2 }]);
    const points = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 4 }];

    expect(nearestPatrolPoint(points, map, { x: 3, y: 3 })).toEqual({ index: 2, point: { x: 4, y: 4 } });
  });

  it("breaks distance ties by index", () => {
    const map = createGridMap(6, 6, []);
    const points = [{ x: 2, y: 1 }, { x: 1, y: 2 }];

    expect(nearestPatrolPoint(points, map, { x: 1, y: 1 })).toEqual({ index: 0, point: { x: 2, y: 1 } });
  });

  it("resolves the index of a patrol point", () => {
    const points = [{ x: 1, y: 1 }, { x: 3, y: 3 }];

    expect(patrolIndexForPoint(points, { x: 3, y: 3 })).toBe(1);
    expect(patrolIndexForPoint(points, { x: 9, y: 9 })).toBeNull();
  });
});
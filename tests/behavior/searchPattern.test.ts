import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import { buildSearchPattern } from "../../src/domain/behavior/searchPattern";

describe("search pattern", () => {
  it("builds concentric rings of walkable cells around the origin", () => {
    const map = createGridMap(7, 7, []);
    const pattern = buildSearchPattern(map, { x: 3, y: 3 }, 2);

    expect(pattern.length).toBe(24);
    const ringOne = pattern.slice(0, 8);
    expect(ringOne).toContainEqual({ x: 2, y: 2 });
    expect(ringOne).toContainEqual({ x: 4, y: 3 });
    expect(pattern).not.toContainEqual({ x: 3, y: 3 });
  });

  it("excludes the origin and blocked cells", () => {
    const map = createGridMap(7, 7, [{ x: 4, y: 3 }, { x: 3, y: 4 }]);
    const pattern = buildSearchPattern(map, { x: 3, y: 3 }, 1);

    expect(pattern).not.toContainEqual({ x: 3, y: 3 });
    expect(pattern).not.toContainEqual({ x: 4, y: 3 });
    expect(pattern).not.toContainEqual({ x: 3, y: 4 });
    expect(pattern.length).toBe(6);
  });

  it("returns an empty pattern for an isolated walkable origin", () => {
    const map = createGridMap(5, 5, [
      { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 }],
    );

    expect(buildSearchPattern(map, { x: 2, y: 2 }, 2)).toEqual([]);
  });

  it("returns an empty pattern when the origin is blocked", () => {
    const map = createGridMap(5, 5, [{ x: 2, y: 2 }]);

    expect(buildSearchPattern(map, { x: 2, y: 2 }, 1)).toEqual([]);
  });

  it("supports a zero radius", () => {
    const map = createGridMap(5, 5, []);

    expect(buildSearchPattern(map, { x: 2, y: 2 }, 0)).toEqual([]);
  });

  it("rejects invalid radii", () => {
    const map = createGridMap(5, 5, []);

    expect(() => buildSearchPattern(map, { x: 2, y: 2 }, -1)).toThrow();
    expect(() => buildSearchPattern(map, { x: 2, y: 2 }, 1.5)).toThrow();
  });
});
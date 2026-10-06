import { describe, expect, it } from "vitest";
import { evaluateCover } from "../../src/domain/perception/cover";
import { cellCenter, createGridMap } from "../../src/domain/model/grid";

const TILE = 32;

function mapWithBlocked(cells: readonly { x: number; y: number }[]) {
  return createGridMap(10, 10, cells);
}

describe("evaluateCover", () => {
  it("marks a walkable cell next to an obstacle as covered", () => {
    const map = mapWithBlocked([{ x: 4, y: 4 }]);
    const position = cellCenter({ x: 5, y: 4 }, TILE);

    expect(evaluateCover(map, TILE, position)).toEqual({
      covered: true,
      reason: "adjacent-to-obstacle",
    });
  });

  it("marks a walkable cell away from obstacles as open", () => {
    const map = mapWithBlocked([{ x: 0, y: 0 }]);
    const position = cellCenter({ x: 5, y: 5 }, TILE);

    expect(evaluateCover(map, TILE, position)).toEqual({
      covered: false,
      reason: "open",
    });
  });

  it("treats the map border as an obstacle", () => {
    const map = mapWithBlocked([]);
    const position = cellCenter({ x: 0, y: 5 }, TILE);

    expect(evaluateCover(map, TILE, position)).toEqual({
      covered: true,
      reason: "adjacent-to-obstacle",
    });
  });

  it("returns open for a position on a blocked cell", () => {
    const map = mapWithBlocked([{ x: 4, y: 4 }]);
    const position = cellCenter({ x: 4, y: 4 }, TILE);

    expect(evaluateCover(map, TILE, position)).toEqual({
      covered: false,
      reason: "open",
    });
  });

  it("returns open for a position outside the map", () => {
    const map = mapWithBlocked([]);
    const position = cellCenter({ x: 12, y: 3 }, TILE);

    expect(evaluateCover(map, TILE, position)).toEqual({
      covered: false,
      reason: "open",
    });
  });

  it("rejects a non-finite position", () => {
    const map = mapWithBlocked([]);

    expect(() => evaluateCover(map, TILE, { x: Number.NaN, y: 0 })).toThrow(
      "Vector components must be finite.",
    );
    expect(() => evaluateCover(map, TILE, { x: 0, y: Number.POSITIVE_INFINITY })).toThrow(
      "Vector components must be finite.",
    );
  });

  it("rejects a non-positive or non-finite tileSize", () => {
    const map = mapWithBlocked([]);
    const position = cellCenter({ x: 5, y: 5 }, TILE);

    expect(() => evaluateCover(map, 0, position)).toThrow(
      "Cover evaluation requires a positive tileSize.",
    );
    expect(() => evaluateCover(map, -1, position)).toThrow(
      "Cover evaluation requires a positive tileSize.",
    );
    expect(() => evaluateCover(map, Number.NaN, position)).toThrow(
      "Cover evaluation requires a positive tileSize.",
    );
  });
});

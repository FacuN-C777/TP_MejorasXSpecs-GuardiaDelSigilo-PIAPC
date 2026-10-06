import { describe, expect, it } from "vitest";
import { createVisionCone } from "../../src/domain/perception/visionCone";

const ORIGIN = { x: 10, y: 20 };
const DIRECTION = { x: -1, y: 0 };

describe("vision cone", () => {
  it("creates a cone with the provided values", () => {
    const cone = createVisionCone(ORIGIN, DIRECTION, 220, Math.PI / 2);

    expect(cone.origin).toEqual(ORIGIN);
    expect(cone.direction).toEqual(DIRECTION);
    expect(cone.range).toBe(220);
    expect(cone.fovRadians).toBeCloseTo(Math.PI / 2);
  });

  it("accepts a zero range and a full circle field of view", () => {
    const cone = createVisionCone(ORIGIN, DIRECTION, 0, Math.PI * 2);

    expect(cone.range).toBe(0);
    expect(cone.fovRadians).toBeCloseTo(Math.PI * 2);
  });

  it("rejects non-finite origin or direction components", () => {
    expect(() => createVisionCone({ x: Number.NaN, y: 0 }, DIRECTION, 10, 1)).toThrow(
      "Vector components must be finite.",
    );
    expect(() => createVisionCone(ORIGIN, { x: 0, y: Number.POSITIVE_INFINITY }, 10, 1)).toThrow(
      "Vector components must be finite.",
    );
  });

  it("rejects a negative or non-finite range", () => {
    expect(() => createVisionCone(ORIGIN, DIRECTION, -1, Math.PI / 2)).toThrow(
      "Vision cone range must be a finite non-negative number.",
    );
    expect(() => createVisionCone(ORIGIN, DIRECTION, Number.NaN, Math.PI / 2)).toThrow(
      "Vision cone range must be a finite non-negative number.",
    );
  });

  it("rejects a field of view outside 0 and 2PI", () => {
    expect(() => createVisionCone(ORIGIN, DIRECTION, 10, -0.1)).toThrow(
      "Vision cone field of view must be within 0 and 2PI.",
    );
    expect(() => createVisionCone(ORIGIN, DIRECTION, 10, Math.PI * 2 + 0.01)).toThrow(
      "Vision cone field of view must be within 0 and 2PI.",
    );
    expect(() => createVisionCone(ORIGIN, DIRECTION, 10, Number.NaN)).toThrow(
      "Vision cone field of view must be within 0 and 2PI.",
    );
  });
});

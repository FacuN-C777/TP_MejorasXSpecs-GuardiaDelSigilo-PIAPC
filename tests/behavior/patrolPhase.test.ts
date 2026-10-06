import { describe, expect, it } from "vitest";
import {
  applyPatrolPhaseEvent,
  duePatrolPhaseEvent,
  initialPatrolPhase,
  patrolLookDirection,
} from "../../src/domain/behavior/patrolPhase";
import { createGridMap } from "../../src/domain/model/grid";

const CONFIG = { pauseDurationMs: 1000, lookDurationMs: 600 };

describe("patrol phase machine", () => {
  it("starts in the walk phase", () => {
    expect(initialPatrolPhase(0)).toEqual({ phase: "walk", startedAtMs: 0 });
  });

  it("emits no event while walking", () => {
    expect(duePatrolPhaseEvent(initialPatrolPhase(0), 99999, CONFIG)).toBeNull();
  });

  it("emits look-start only once the pause elapses", () => {
    const pause = applyPatrolPhaseEvent("pause-start", 100);

    expect(duePatrolPhaseEvent(pause, 1099, CONFIG)).toBeNull();
    expect(duePatrolPhaseEvent(pause, 1100, CONFIG)).toBe("look-start");
    expect(duePatrolPhaseEvent(pause, 5000, CONFIG)).toBe("look-start");
  });

  it("emits patrol-continue only once the look elapses", () => {
    const look = applyPatrolPhaseEvent("look-start", 500);

    expect(duePatrolPhaseEvent(look, 1099, CONFIG)).toBeNull();
    expect(duePatrolPhaseEvent(look, 1100, CONFIG)).toBe("patrol-continue");
  });

  it("restarts the timer on every phase event", () => {
    const look = applyPatrolPhaseEvent("look-start", 2000);
    expect(look).toEqual({ phase: "look", startedAtMs: 2000 });

    const walk = applyPatrolPhaseEvent("patrol-continue", 3000);
    expect(walk).toEqual({ phase: "walk", startedAtMs: 3000 });
    expect(duePatrolPhaseEvent(walk, 99999, CONFIG)).toBeNull();
  });

  it("supports zero durations", () => {
    const zero = { pauseDurationMs: 0, lookDurationMs: 0 };
    const pause = applyPatrolPhaseEvent("pause-start", 10);

    expect(duePatrolPhaseEvent(pause, 10, zero)).toBe("look-start");
  });

  it("rejects invalid durations and non-finite time", () => {
    const pause = applyPatrolPhaseEvent("pause-start", 0);

    expect(() => duePatrolPhaseEvent(pause, 1, { ...CONFIG, pauseDurationMs: -1 })).toThrow();
    expect(() => duePatrolPhaseEvent(pause, 1, { ...CONFIG, lookDurationMs: Number.NaN })).toThrow();
    expect(() => duePatrolPhaseEvent(pause, Number.POSITIVE_INFINITY, CONFIG)).toThrow();
    expect(() => initialPatrolPhase(Number.NaN)).toThrow();
    expect(() => applyPatrolPhaseEvent("pause-start", Number.NaN)).toThrow();
  });
});

describe("patrol look direction", () => {
  const POINTS = [
    { x: 1, y: 1 },
    { x: 1, y: 5 },
    { x: 5, y: 5 },
  ];

  it("points toward the next patrol point", () => {
    const map = createGridMap(10, 10, []);

    expect(patrolLookDirection(POINTS, map, 0)).toEqual({ x: 0, y: 1 });
    expect(patrolLookDirection(POINTS, map, 1)).toEqual({ x: 1, y: 0 });
  });

  it("wraps around the cycle", () => {
    const map = createGridMap(10, 10, []);

    const direction = patrolLookDirection(POINTS, map, 2);
    expect(direction).not.toBeNull();
    expect(direction!.x).toBeCloseTo(-Math.SQRT1_2, 10);
    expect(direction!.y).toBeCloseTo(-Math.SQRT1_2, 10);
  });

  it("skips blocked points when choosing the look target", () => {
    const map = createGridMap(10, 10, [{ x: 1, y: 5 }]);

    const direction = patrolLookDirection(POINTS, map, 0);
    expect(direction).not.toBeNull();
    expect(direction!.x).toBeCloseTo(Math.SQRT1_2, 10);
    expect(direction!.y).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it("returns null without a next point or a valid current point", () => {
    const map = createGridMap(10, 10, []);

    expect(patrolLookDirection([{ x: 2, y: 2 }], map, 0)).toBeNull();
    expect(patrolLookDirection(POINTS, createGridMap(10, 10, [{ x: 1, y: 1 }]), 0)).toBeNull();
  });

  it("rejects an invalid patrol index", () => {
    const map = createGridMap(10, 10, []);

    expect(() => patrolLookDirection(POINTS, map, -1)).toThrow();
    expect(() => patrolLookDirection(POINTS, map, 1.5)).toThrow();
  });
});

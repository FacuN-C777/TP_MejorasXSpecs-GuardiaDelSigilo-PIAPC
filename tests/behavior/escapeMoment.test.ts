import { describe, expect, it } from "vitest";
import { evaluateEscape, type EscapeQuery } from "../../src/domain/behavior/escapeMoment";

const NEAR_DISTANCE = 64;

function makeQuery(overrides: Partial<EscapeQuery> = {}): EscapeQuery {
  return {
    previousState: "PURSUE",
    newState: "SEARCH",
    distance: 40,
    nearDistance: NEAR_DISTANCE,
    ...overrides,
  };
}

describe("evaluateEscape", () => {
  it("returns an escape moment for a near-miss pursuit break", () => {
    expect(evaluateEscape(makeQuery({ distance: 50 }))).toEqual({
      distance: 50,
      nearDistance: NEAR_DISTANCE,
    });
  });

  it("accepts a distance exactly on the near boundary", () => {
    expect(evaluateEscape(makeQuery({ distance: NEAR_DISTANCE }))).toEqual({
      distance: NEAR_DISTANCE,
      nearDistance: NEAR_DISTANCE,
    });
  });

  it("returns null beyond the near distance", () => {
    expect(evaluateEscape(makeQuery({ distance: 64.01 }))).toBeNull();
    expect(evaluateEscape(makeQuery({ distance: 300 }))).toBeNull();
  });

  it("returns null for transitions that are not a pursuit break", () => {
    expect(evaluateEscape(makeQuery({ previousState: "PATROL", newState: "PURSUE" }))).toBeNull();
    expect(evaluateEscape(makeQuery({ previousState: "PURSUE", newState: "CAPTURED" }))).toBeNull();
    expect(evaluateEscape(makeQuery({ previousState: "PURSUE", newState: "PURSUE" }))).toBeNull();
    expect(evaluateEscape(makeQuery({ previousState: "SEARCH", newState: "RETURN" }))).toBeNull();
  });

  it("rejects a non-finite or negative distance", () => {
    expect(() => evaluateEscape(makeQuery({ distance: Number.NaN }))).toThrow(
      "Escape distance must be a finite non-negative number.",
    );
    expect(() => evaluateEscape(makeQuery({ distance: Number.POSITIVE_INFINITY }))).toThrow(
      "Escape distance must be a finite non-negative number.",
    );
    expect(() => evaluateEscape(makeQuery({ distance: -1 }))).toThrow(
      "Escape distance must be a finite non-negative number.",
    );
  });

  it("rejects a non-finite or negative near distance", () => {
    expect(() => evaluateEscape(makeQuery({ nearDistance: Number.NaN }))).toThrow(
      "Escape near distance must be a finite non-negative number.",
    );
    expect(() => evaluateEscape(makeQuery({ nearDistance: -1 }))).toThrow(
      "Escape near distance must be a finite non-negative number.",
    );
  });
});
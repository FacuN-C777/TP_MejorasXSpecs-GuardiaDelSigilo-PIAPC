import { describe, expect, it } from "vitest";
import {
  transition,
  type GuardState,
  type TransitionContext,
} from "../../src/domain/behavior/guardFsm";

const BASE: TransitionContext = {
  hasValidVision: false,
  perceivedPlayer: null,
  soundHeard: false,
  soundPosition: null,
  lastKnown: { x: 4, y: 4 },
  routeCompleted: false,
  routeFailed: false,
  targetChanged: false,
  searchExhausted: false,
  arrivedAtPatrolPoint: false,
  captureDistanceMet: false,
};

function step(
  state: GuardState,
  event: Parameters<typeof transition>[1],
  overrides: Partial<TransitionContext> = {},
) {
  return transition(state as never, event, { ...BASE, ...overrides });
}

describe("guard FSM", () => {
  it("starts patrolling from the initial patrol point", () => {
    expect(step("PATROL", "start")).toEqual({
      state: "PATROL",
      action: { kind: "patrol-start" },
      cause: "inicio",
    });
  });

  it("advances the patrol cycle on arrival", () => {
    expect(step("PATROL", "patrol-advance", { arrivedAtPatrolPoint: true })).toEqual({
      state: "PATROL",
      action: { kind: "patrol-advance" },
      cause: "llegada patrulla",
    });
  });

  it("turns vision into pursuit from PATROL", () => {
    const result = step("PATROL", "vision-valid", {
      hasValidVision: true,
      perceivedPlayer: { x: 6, y: 6 },
    });

    expect(result.state).toBe("PURSUE");
    expect(result.action).toEqual({ kind: "pursue", target: { x: 6, y: 6 } });
    expect(result.cause).toBe("vision");
  });

  it("turns an active sound into investigation when vision is absent", () => {
    const result = step("PATROL", "sound-heard", {
      soundHeard: true,
      soundPosition: { x: 2, y: 2 },
      lastKnown: { x: 3, y: 3 },
    });

    expect(result.state).toBe("INVESTIGATE");
    expect(result.action).toEqual({ kind: "investigate", target: { x: 3, y: 3 } });
    expect(result.cause).toBe("sonido");
  });

  it("skips an unreachable patrol point", () => {
    expect(step("PATROL", "route-failed", { routeFailed: true })).toEqual({
      state: "PATROL",
      action: { kind: "patrol-skip" },
      cause: "patrulla inaccesible",
    });
  });

  it("re-targets an updated sound while investigating", () => {
    const result = step("INVESTIGATE", "sound-heard", {
      soundHeard: true,
      lastKnown: { x: 1, y: 1 },
    });

    expect(result.state).toBe("INVESTIGATE");
    expect(result.action).toEqual({ kind: "investigate", target: { x: 1, y: 1 } });
    expect(result.cause).toBe("sonido reactualizado");
  });

  it("escalates investigation into pursuit on vision", () => {
    const result = step("INVESTIGATE", "vision-valid", {
      hasValidVision: true,
      perceivedPlayer: { x: 7, y: 7 },
    });

    expect(result.state).toBe("PURSUE");
    expect(result.cause).toBe("vision");
  });

  it("starts a mini-search after an empty investigation (decision 8.2)", () => {
    const result = step("INVESTIGATE", "route-completed", {
      routeCompleted: true,
      lastKnown: { x: 2, y: 3 },
    });

    expect(result.state).toBe("SEARCH");
    expect(result.action).toEqual({ kind: "search", origin: { x: 2, y: 3 } });
    expect(result.cause).toBe("investigacion sin hallazgo");
  });

  it("recovers from an unreachable investigation target", () => {
    expect(step("INVESTIGATE", "route-failed", { routeFailed: true })).toEqual({
      state: "RETURN",
      action: { kind: "return" },
      cause: "destino inaccesible",
    });
  });

  it("keeps pursuing while vision stays valid", () => {
    expect(step("PURSUE", "vision-valid", { hasValidVision: true })).toEqual({
      state: "PURSUE",
      action: { kind: "keep" },
      cause: "actualizacion",
    });
  });

  it("replans only when the perceived target changes", () => {
    const result = step("PURSUE", "target-differs", {
      hasValidVision: true,
      perceivedPlayer: { x: 9, y: 9 },
      targetChanged: true,
    });

    expect(result.state).toBe("PURSUE");
    expect(result.action).toEqual({ kind: "pursue", target: { x: 9, y: 9 } });
    expect(result.cause).toBe("replanificacion");
  });

  it("searches the last known position after losing vision", () => {
    const result = step("PURSUE", "vision-lost", { lastKnown: { x: 5, y: 5 } });

    expect(result.state).toBe("SEARCH");
    expect(result.action).toEqual({ kind: "search", origin: { x: 5, y: 5 } });
    expect(result.cause).toBe("perdida de vision");
  });

  it("captures the player at close range with vision", () => {
    expect(step("PURSUE", "captured", { captureDistanceMet: true })).toEqual({
      state: "CAPTURED",
      action: { kind: "stop" },
      cause: "captura",
    });
  });

  it("resumes pursuit when vision is recovered during search", () => {
    const result = step("SEARCH", "vision-valid", {
      hasValidVision: true,
      perceivedPlayer: { x: 3, y: 3 },
    });

    expect(result.state).toBe("PURSUE");
    expect(result.cause).toBe("vision recuperada");
  });

  it("investigates a sound heard during search", () => {
    const result = step("SEARCH", "sound-heard", {
      soundHeard: true,
      lastKnown: { x: 3, y: 3 },
    });

    expect(result.state).toBe("INVESTIGATE");
    expect(result.cause).toBe("sonido durante busqueda");
  });

  it("advances the pattern after finishing a search step", () => {
    expect(step("SEARCH", "patrol-advance", { routeCompleted: true })).toEqual({
      state: "SEARCH",
      action: { kind: "search-step" },
      cause: "avance de busqueda",
    });
  });

  it("returns to patrol after an exhausted search", () => {
    expect(step("SEARCH", "search-exhausted", { searchExhausted: true })).toEqual({
      state: "RETURN",
      action: { kind: "return" },
      cause: "busqueda agotada",
    });
  });

  it("returns when a search step is unreachable", () => {
    expect(step("SEARCH", "route-failed", { routeFailed: true })).toEqual({
      state: "RETURN",
      action: { kind: "return" },
      cause: "busqueda inaccesible",
    });
  });

  it("resumes the patrol cycle after completing the return", () => {
    expect(step("RETURN", "route-completed", { routeCompleted: true })).toEqual({
      state: "PATROL",
      action: { kind: "patrol-resume" },
      cause: "regreso completado",
    });
  });

  it("interrupts the return with an unreachable patrol point self-recovery", () => {
    expect(step("RETURN", "route-failed", { routeFailed: true })).toEqual({
      state: "RETURN",
      action: { kind: "return" },
      cause: "regreso inaccesible",
    });
  });

  it("interrupts the return on vision", () => {
    const result = step("RETURN", "vision-valid", {
      hasValidVision: true,
      perceivedPlayer: { x: 7, y: 7 },
    });

    expect(result.state).toBe("PURSUE");
    expect(result.cause).toBe("vision durante regreso");
  });

  it("interrupts the return on sound", () => {
    const result = step("RETURN", "sound-heard", {
      soundHeard: true,
      lastKnown: { x: 7, y: 7 },
    });

    expect(result.state).toBe("INVESTIGATE");
    expect(result.cause).toBe("sonido durante regreso");
  });

  it("resets to patrol from any state", () => {
    for (const state of ["PATROL", "INVESTIGATE", "PURSUE", "SEARCH", "RETURN", "CAPTURED"] as const) {
      const result = step(state, "reset");
      expect(result.state).toBe("PATROL");
      expect(result.action).toEqual({ kind: "reset" });
      expect(result.cause).toBe("reinicio");
    }
  });

  it("rejects events outside the codified table", () => {
    expect(() => step("PATROL", "captured", { captureDistanceMet: true })).toThrow();
    expect(() => step("CAPTURED", "vision-valid", { hasValidVision: true })).toThrow();
    expect(() => step("PATROL", "vision-lost", { lastKnown: { x: 0, y: 0 } })).toThrow();
  });
});
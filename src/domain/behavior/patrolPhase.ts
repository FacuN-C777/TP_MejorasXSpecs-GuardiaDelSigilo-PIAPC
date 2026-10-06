import { isWalkable, type GridMap, type GridPoint } from "../model/grid";
import { normalized, type Vector2 } from "../model/vector";
import { nextPatrolPoint } from "./patrol";

export type PatrolPhase = "walk" | "pause" | "look";

export type PatrolPhaseEvent = "pause-start" | "look-start" | "patrol-continue";

export interface PatrolPhaseConfig {
  readonly pauseDurationMs: number;
  readonly lookDurationMs: number;
}

export interface PatrolPhaseState {
  readonly phase: PatrolPhase;
  readonly startedAtMs: number;
}

export function initialPatrolPhase(timeMs: number): PatrolPhaseState {
  assertTime(timeMs);
  return { phase: "walk", startedAtMs: timeMs };
}

export function duePatrolPhaseEvent(
  state: PatrolPhaseState,
  timeMs: number,
  config: PatrolPhaseConfig,
): PatrolPhaseEvent | null {
  assertTime(timeMs);
  assertPhaseConfig(config);
  const elapsed = timeMs - state.startedAtMs;

  if (state.phase === "pause") {
    return elapsed >= config.pauseDurationMs ? "look-start" : null;
  }
  if (state.phase === "look") {
    return elapsed >= config.lookDurationMs ? "patrol-continue" : null;
  }
  return null;
}

export function applyPatrolPhaseEvent(
  event: PatrolPhaseEvent,
  timeMs: number,
): PatrolPhaseState {
  assertTime(timeMs);
  switch (event) {
    case "pause-start":
      return { phase: "pause", startedAtMs: timeMs };
    case "look-start":
      return { phase: "look", startedAtMs: timeMs };
    case "patrol-continue":
      return { phase: "walk", startedAtMs: timeMs };
  }
}

export function patrolLookDirection(
  points: readonly GridPoint[],
  map: GridMap,
  currentIndex: number,
): Vector2 | null {
  if (!Number.isInteger(currentIndex) || currentIndex < 0) {
    throw new Error("Patrol index must be a non-negative integer.");
  }
  const current = points[currentIndex];
  if (!current || !isWalkable(map, current)) {
    return null;
  }

  const next = nextPatrolPoint(points, map, currentIndex);
  if (!next) {
    return null;
  }

  return normalized({ x: next.point.x - current.x, y: next.point.y - current.y });
}

function assertTime(timeMs: number): void {
  if (!Number.isFinite(timeMs)) {
    throw new Error("Patrol phase time must be finite.");
  }
}

function assertPhaseConfig(config: PatrolPhaseConfig): void {
  if (!Number.isFinite(config.pauseDurationMs) || config.pauseDurationMs < 0) {
    throw new Error("Patrol pause duration must be a finite non-negative number.");
  }
  if (!Number.isFinite(config.lookDurationMs) || config.lookDurationMs < 0) {
    throw new Error("Patrol look duration must be a finite non-negative number.");
  }
}

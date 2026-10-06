import type { GuardState } from "./guardFsm";

export interface EscapeQuery {
  readonly previousState: GuardState;
  readonly newState: GuardState;
  readonly distance: number;
  readonly nearDistance: number;
}

export interface EscapeMoment {
  readonly distance: number;
  readonly nearDistance: number;
}

export function evaluateEscape(query: EscapeQuery): EscapeMoment | null {
  const distance = assertNonNegative(
    query.distance,
    "Escape distance must be a finite non-negative number.",
  );
  const nearDistance = assertNonNegative(
    query.nearDistance,
    "Escape near distance must be a finite non-negative number.",
  );

  if (query.previousState !== "PURSUE" || query.newState !== "SEARCH") {
    return null;
  }
  if (distance > nearDistance) {
    return null;
  }
  return { distance, nearDistance };
}

function assertNonNegative(value: number, message: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(message);
  }
  return value;
}

import type { TransitionEvent } from "./events";

export interface TelemetryLog {
  readonly events: readonly TransitionEvent[];
}

export function createTelemetryLog(): TelemetryLog {
  return { events: [] };
}

export function recordTransition(
  log: TelemetryLog,
  event: TransitionEvent,
): TelemetryLog {
  return { events: [...log.events, event] };
}

export function lastTransition(log: TelemetryLog): TransitionEvent | null {
  if (log.events.length === 0) {
    return null;
  }
  return log.events[log.events.length - 1] ?? null;
}
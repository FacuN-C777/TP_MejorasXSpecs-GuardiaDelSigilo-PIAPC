import type { GuardState } from "../../domain/behavior/guardFsm";
import type { BehaviorTransition } from "./behaviorSimulation";

export type AlertKind = "pursue-start" | "captured" | "investigate-start" | "search-start";

export interface AlertExtreme {
  readonly kind: AlertKind;
  readonly intensity: number;
  readonly durationMs: number;
}

export const PURSUE_ALERT: AlertExtreme = {
  kind: "pursue-start",
  intensity: 0.8,
  durationMs: 450,
};

export const CAPTURED_ALERT: AlertExtreme = {
  kind: "captured",
  intensity: 1,
  durationMs: 700,
};

export const INVESTIGATE_ALERT: AlertExtreme = {
  kind: "investigate-start",
  intensity: 0.45,
  durationMs: 300,
};

export const SEARCH_ALERT: AlertExtreme = {
  kind: "search-start",
  intensity: 0.35,
  durationMs: 300,
};

const ALERTS_BY_TARGET: Readonly<Partial<Record<GuardState, AlertExtreme>>> = {
  PURSUE: PURSUE_ALERT,
  CAPTURED: CAPTURED_ALERT,
  INVESTIGATE: INVESTIGATE_ALERT,
  SEARCH: SEARCH_ALERT,
};

export function alertsForTransitions(
  transitions: readonly BehaviorTransition[],
): readonly AlertExtreme[] {
  const alerts: AlertExtreme[] = [];

  for (const transition of transitions) {
    if (transition.previousState === transition.newState) {
      continue;
    }
    const alert = ALERTS_BY_TARGET[transition.newState];
    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}

export function strongestAlert(alerts: readonly AlertExtreme[]): AlertExtreme | null {
  let strongest: AlertExtreme | null = null;

  for (const alert of alerts) {
    if (strongest === null || alert.intensity > strongest.intensity) {
      strongest = alert;
    }
  }

  return strongest;
}

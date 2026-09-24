import type { GuardEvent, GuardState, TransitionCause } from "../behavior/guardFsm";

export interface TransitionEvent {
  readonly timeMs: number;
  readonly previousState: GuardState;
  readonly event: GuardEvent;
  readonly newState: GuardState;
  readonly cause: TransitionCause;
}
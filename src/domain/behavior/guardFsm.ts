import type { GridPoint } from "../model/grid";

export type GuardState =
  | "PATROL"
  | "INVESTIGATE"
  | "PURSUE"
  | "SEARCH"
  | "RETURN"
  | "CAPTURED";

export type GuardEvent =
  | "start"
  | "vision-valid"
  | "vision-lost"
  | "sound-heard"
  | "route-completed"
  | "route-failed"
  | "target-differs"
  | "search-exhausted"
  | "patrol-advance"
  | "pause-start"
  | "look-start"
  | "patrol-continue"
  | "captured"
  | "reset";

export type TransitionCause =
  | "inicio"
  | "llegada patrulla"
  | "pausa"
  | "mirada"
  | "continua patrulla"
  | "vision"
  | "sonido"
  | "patrulla inaccesible"
  | "sonido reactualizado"
  | "investigacion sin hallazgo"
  | "destino inaccesible"
  | "actualizacion"
  | "replanificacion"
  | "perdida de vision"
  | "captura"
  | "vision recuperada"
  | "sonido durante busqueda"
  | "avance de busqueda"
  | "busqueda agotada"
  | "busqueda inaccesible"
  | "regreso completado"
  | "regreso inaccesible"
  | "vision durante regreso"
  | "sonido durante regreso"
  | "reinicio";

export type GuardAction =
  | { readonly kind: "patrol-start" }
  | { readonly kind: "patrol-advance" }
  | { readonly kind: "patrol-skip" }
  | { readonly kind: "patrol-resume" }
  | { readonly kind: "patrol-pause" }
  | { readonly kind: "patrol-look" }
  | { readonly kind: "investigate"; readonly target: GridPoint }
  | { readonly kind: "pursue"; readonly target: GridPoint }
  | { readonly kind: "search"; readonly origin: GridPoint }
  | { readonly kind: "search-step" }
  | { readonly kind: "return" }
  | { readonly kind: "keep" }
  | { readonly kind: "stop" }
  | { readonly kind: "reset" };

export interface TransitionContext {
  readonly hasValidVision: boolean;
  readonly perceivedPlayer: GridPoint | null;
  readonly soundHeard: boolean;
  readonly soundPosition: GridPoint | null;
  readonly lastKnown: GridPoint | null;
  readonly routeCompleted: boolean;
  readonly routeFailed: boolean;
  readonly targetChanged: boolean;
  readonly searchExhausted: boolean;
  readonly arrivedAtPatrolPoint: boolean;
  readonly patrolPauseElapsed: boolean;
  readonly patrolLookElapsed: boolean;
  readonly captureDistanceMet: boolean;
}

export interface TransitionResult {
  readonly state: GuardState;
  readonly action: GuardAction;
  readonly cause: TransitionCause;
}

export function transition(
  current: GuardState,
  event: GuardEvent,
  context: TransitionContext,
): TransitionResult {
  if (event === "reset") {
    return { state: "PATROL", action: { kind: "reset" }, cause: "reinicio" };
  }

  switch (current) {
    case "PATROL":
      return transitionFromPatrol(event, context);
    case "INVESTIGATE":
      return transitionFromInvestigate(event, context);
    case "PURSUE":
      return transitionFromPursue(event, context);
    case "SEARCH":
      return transitionFromSearch(event, context);
    case "RETURN":
      return transitionFromReturn(event, context);
    case "CAPTURED":
      break;
  }

  throw new Error(`Unhandled FSM transition: ${current} / ${event}.`);
}

function invalidTransition(state: GuardState, event: GuardEvent): Error {
  return new Error(`Unhandled FSM transition: ${state} / ${event}.`);
}

function requireContext(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function transitionFromPatrol(event: GuardEvent, context: TransitionContext): TransitionResult {
  switch (event) {
    case "start":
      return { state: "PATROL", action: { kind: "patrol-start" }, cause: "inicio" };
    case "patrol-advance":
      requireContext(context.arrivedAtPatrolPoint, "patrol-advance requires an arrived patrol point.");
      return { state: "PATROL", action: { kind: "patrol-advance" }, cause: "llegada patrulla" };
    case "pause-start":
      requireContext(context.arrivedAtPatrolPoint, "pause-start requires an arrived patrol point.");
      return { state: "PATROL", action: { kind: "patrol-pause" }, cause: "pausa" };
    case "look-start":
      requireContext(context.patrolPauseElapsed, "look-start requires an elapsed pause.");
      return { state: "PATROL", action: { kind: "patrol-look" }, cause: "mirada" };
    case "patrol-continue":
      requireContext(context.patrolLookElapsed, "patrol-continue requires an elapsed look.");
      return { state: "PATROL", action: { kind: "patrol-advance" }, cause: "continua patrulla" };
    case "vision-valid":
      requireContext(context.hasValidVision, "vision-valid requires a valid vision.");
      requireContext(context.perceivedPlayer !== null, "vision-valid requires a perceived player cell.");
      return {
        state: "PURSUE",
        action: { kind: "pursue", target: context.perceivedPlayer! },
        cause: "vision",
      };
    case "sound-heard":
      requireContext(context.soundHeard, "sound-heard requires an active sound.");
      return {
        state: "INVESTIGATE",
        action: { kind: "investigate", target: requireObjective(context) },
        cause: "sonido",
      };
    case "route-failed":
      requireContext(context.routeFailed, "route-failed requires a failed route.");
      return { state: "PATROL", action: { kind: "patrol-skip" }, cause: "patrulla inaccesible" };
    default:
      throw invalidTransition("PATROL", event);
  }
}

function transitionFromInvestigate(event: GuardEvent, context: TransitionContext): TransitionResult {
  switch (event) {
    case "sound-heard":
      requireContext(context.soundHeard, "sound-heard requires an active sound.");
      return {
        state: "INVESTIGATE",
        action: { kind: "investigate", target: requireObjective(context) },
        cause: "sonido reactualizado",
      };
    case "vision-valid":
      requireContext(context.hasValidVision, "vision-valid requires a valid vision.");
      requireContext(context.perceivedPlayer !== null, "vision-valid requires a perceived player cell.");
      return {
        state: "PURSUE",
        action: { kind: "pursue", target: context.perceivedPlayer! },
        cause: "vision",
      };
    case "route-completed":
      requireContext(context.routeCompleted, "route-completed requires a completed route.");
      return {
        state: "SEARCH",
        action: { kind: "search", origin: context.lastKnown ?? requireSound(context) },
        cause: "investigacion sin hallazgo",
      };
    case "route-failed":
      requireContext(context.routeFailed, "route-failed requires a failed route.");
      return { state: "RETURN", action: { kind: "return" }, cause: "destino inaccesible" };
    default:
      throw invalidTransition("INVESTIGATE", event);
  }
}

function transitionFromPursue(event: GuardEvent, context: TransitionContext): TransitionResult {
  switch (event) {
    case "vision-valid":
      requireContext(context.hasValidVision, "vision-valid requires a valid vision.");
      return { state: "PURSUE", action: { kind: "keep" }, cause: "actualizacion" };
    case "target-differs":
      requireContext(context.hasValidVision, "target-differs requires a valid vision.");
      requireContext(context.perceivedPlayer !== null, "target-differs requires a perceived player cell.");
      return {
        state: "PURSUE",
        action: { kind: "pursue", target: context.perceivedPlayer! },
        cause: "replanificacion",
      };
    case "vision-lost":
      requireContext(context.lastKnown !== null, "vision-lost requires a remembered position.");
      return {
        state: "SEARCH",
        action: { kind: "search", origin: context.lastKnown! },
        cause: "perdida de vision",
      };
    case "captured":
      requireContext(context.captureDistanceMet, "captured requires vision and proximity.");
      return { state: "CAPTURED", action: { kind: "stop" }, cause: "captura" };
    default:
      throw invalidTransition("PURSUE", event);
  }
}

function transitionFromSearch(event: GuardEvent, context: TransitionContext): TransitionResult {
  switch (event) {
    case "vision-valid":
      requireContext(context.hasValidVision, "vision-valid requires a valid vision.");
      requireContext(context.perceivedPlayer !== null, "vision-valid requires a perceived player cell.");
      return {
        state: "PURSUE",
        action: { kind: "pursue", target: context.perceivedPlayer! },
        cause: "vision recuperada",
      };
    case "sound-heard":
      requireContext(context.soundHeard, "sound-heard requires an active sound.");
      return {
        state: "INVESTIGATE",
        action: { kind: "investigate", target: requireObjective(context) },
        cause: "sonido durante busqueda",
      };
    case "patrol-advance":
      requireContext(context.routeCompleted, "patrol-advance requires a completed pattern step.");
      return { state: "SEARCH", action: { kind: "search-step" }, cause: "avance de busqueda" };
    case "search-exhausted":
      requireContext(context.searchExhausted, "search-exhausted requires an exhausted search.");
      return { state: "RETURN", action: { kind: "return" }, cause: "busqueda agotada" };
    case "route-failed":
      requireContext(context.routeFailed, "route-failed requires a failed route.");
      return { state: "RETURN", action: { kind: "return" }, cause: "busqueda inaccesible" };
    default:
      throw invalidTransition("SEARCH", event);
  }
}

function transitionFromReturn(event: GuardEvent, context: TransitionContext): TransitionResult {
  switch (event) {
    case "vision-valid":
      requireContext(context.hasValidVision, "vision-valid requires a valid vision.");
      requireContext(context.perceivedPlayer !== null, "vision-valid requires a perceived player cell.");
      return {
        state: "PURSUE",
        action: { kind: "pursue", target: context.perceivedPlayer! },
        cause: "vision durante regreso",
      };
    case "sound-heard":
      requireContext(context.soundHeard, "sound-heard requires an active sound.");
      return {
        state: "INVESTIGATE",
        action: { kind: "investigate", target: requireObjective(context) },
        cause: "sonido durante regreso",
      };
    case "route-completed":
      requireContext(context.routeCompleted, "route-completed requires a completed route.");
      return { state: "PATROL", action: { kind: "patrol-resume" }, cause: "regreso completado" };
    case "route-failed":
      requireContext(context.routeFailed, "route-failed requires a failed route.");
      return { state: "RETURN", action: { kind: "return" }, cause: "regreso inaccesible" };
    default:
      throw invalidTransition("RETURN", event);
  }
}

function requireObjective(context: TransitionContext): GridPoint {
  if (context.lastKnown) {
    return context.lastKnown;
  }
  if (context.soundPosition) {
    return context.soundPosition;
  }
  throw new Error("A sound or memory position is required to set an objective.");
}

function requireSound(context: TransitionContext): GridPoint {
  if (context.soundPosition) {
    return context.soundPosition;
  }
  throw new Error("A sound position is required to start a search.");
}
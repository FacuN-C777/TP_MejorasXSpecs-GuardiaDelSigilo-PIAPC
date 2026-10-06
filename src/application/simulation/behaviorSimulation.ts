import type { PerceptionMemory } from "../../domain/perception/memory";
import {
  transition,
  type GuardAction,
  type GuardEvent,
  type GuardState,
  type TransitionCause,
  type TransitionContext,
} from "../../domain/behavior/guardFsm";
import {
  firstPatrolPoint,
  nearestPatrolPoint,
  nextPatrolPoint,
  patrolIndexForPoint,
} from "../../domain/behavior/patrol";
import {
  applyPatrolPhaseEvent,
  duePatrolPhaseEvent,
  initialPatrolPhase,
  patrolLookDirection,
  type PatrolPhaseEvent,
  type PatrolPhaseState,
} from "../../domain/behavior/patrolPhase";
import { buildSearchPattern } from "../../domain/behavior/searchPattern";
import { cellCenter, worldToCell, type GridMap, type GridPoint } from "../../domain/model/grid";
import { distanceBetween, type Vector2 } from "../../domain/model/vector";
import { advanceAlongPath } from "../../domain/navigation/pathFollower";
import { findPathAStar, type SearchResult } from "../../domain/navigation/search";

export type ObjectiveKind = "patrol" | "investigate" | "pursue" | "search" | "return";

export type RouteStatus = "none" | "active" | "completed" | "failed";

export interface RouteState {
  readonly waypoints: readonly Vector2[];
  readonly nextWaypoint: number;
  readonly goalCell: GridPoint | null;
  readonly status: RouteStatus;
}

export interface SearchRuntime {
  readonly originCell: GridPoint;
  readonly points: readonly GridPoint[];
  readonly nextIndex: number;
  readonly startedAtMs: number;
}

export interface BehaviorRuntimeState {
  readonly fsmState: GuardState;
  readonly previousFsmState: GuardState | null;
  readonly lastCause: TransitionCause | null;
  readonly lastEvent: GuardEvent | null;
  readonly objective: GridPoint | null;
  readonly objectiveKind: ObjectiveKind | null;
  readonly patrolIndex: number;
  readonly route: RouteState;
  readonly search: SearchRuntime | null;
  readonly plannedAtMs: number;
  readonly lastPlan: SearchResult | null;
  readonly failedReturnTargets: readonly GridPoint[];
  readonly patrolPhase: PatrolPhaseState;
  readonly skipPauseOnArrival: boolean;
  readonly started: boolean;
}

export interface BehaviorInput {
  readonly map: GridMap;
  readonly tileSize: number;
  readonly patrolPoints: readonly GridPoint[];
  readonly guardPosition: Vector2;
  readonly vision: Readonly<{ visible: boolean; target: Vector2 | null }>;
  readonly soundHeard: boolean;
  readonly soundPosition: Vector2 | null;
  readonly memory: PerceptionMemory;
  readonly captureDistance: number;
  readonly speed: number;
  readonly deltaMs: number;
  readonly timeMs: number;
  readonly replanIntervalMs: number;
  readonly searchDurationMs: number;
  readonly searchRadiusCells: number;
  readonly pauseDurationMs: number;
  readonly lookDurationMs: number;
}

export interface BehaviorMovement {
  readonly position: Vector2;
  readonly nextWaypoint: number;
  readonly completed: boolean;
  readonly direction: Vector2 | null;
}

export interface BehaviorTransition {
  readonly timeMs: number;
  readonly previousState: GuardState;
  readonly event: GuardEvent;
  readonly newState: GuardState;
  readonly cause: TransitionCause;
}

export interface BehaviorFrame {
  readonly state: BehaviorRuntimeState;
  readonly movement: BehaviorMovement;
  readonly transitions: readonly BehaviorTransition[];
  readonly facing: Vector2 | null;
}

export function initialBehaviorState(): BehaviorRuntimeState {
  return {
    fsmState: "PATROL",
    previousFsmState: null,
    lastCause: null,
    lastEvent: null,
    objective: null,
    objectiveKind: null,
    patrolIndex: 0,
    route: emptyRoute(),
    search: null,
    plannedAtMs: 0,
    lastPlan: null,
    failedReturnTargets: [],
    patrolPhase: initialPatrolPhase(0),
    skipPauseOnArrival: false,
    started: false,
  };
}

export function emptyRoute(): RouteState {
  return {
    waypoints: [],
    nextWaypoint: 0,
    goalCell: null,
    status: "none",
  };
}

export function updateBehavior(
  state: BehaviorRuntimeState,
  input: BehaviorInput,
): BehaviorFrame {
  const visionCell = input.vision.visible && input.vision.target
    ? worldToCell(input.vision.target, input.tileSize)
    : null;
  const lastKnownCell = input.memory.lastKnownPosition
    ? worldToCell(input.memory.lastKnownPosition, input.tileSize)
    : null;
  const soundCell = input.soundHeard && input.soundPosition
    ? worldToCell(input.soundPosition, input.tileSize)
    : null;
  const captureDistanceMet = input.vision.visible
    && input.vision.target !== null
    && distanceBetween(input.guardPosition, input.vision.target) < input.captureDistance;

  const routeStatus = state.route.status;
  const exhausted = isSearchExhausted(state, input);
  const targetChanged = hasPursueTargetChanged(state, input, visionCell);
  const phaseConfig = {
    pauseDurationMs: input.pauseDurationMs,
    lookDurationMs: input.lookDurationMs,
  };
  const duePhaseEvent = duePatrolPhaseEvent(state.patrolPhase, input.timeMs, phaseConfig);

  let event: GuardEvent | null = null;
  if (state.fsmState !== "CAPTURED") {
    event = state.started
      ? selectEvent(state, input, captureDistanceMet, exhausted, targetChanged, duePhaseEvent)
      : "start";
  }

  const context: TransitionContext = {
    hasValidVision: input.vision.visible,
    perceivedPlayer: visionCell,
    soundHeard: input.soundHeard,
    soundPosition: soundCell,
    lastKnown: lastKnownCell ?? (state.fsmState === "INVESTIGATE" ? state.objective : null),
    routeCompleted: routeStatus === "completed",
    routeFailed: routeStatus === "failed",
    targetChanged,
    searchExhausted: exhausted,
    arrivedAtPatrolPoint: routeStatus === "completed" && state.objectiveKind === "patrol",
    patrolPauseElapsed: duePhaseEvent === "look-start",
    patrolLookElapsed: duePhaseEvent === "patrol-continue",
    captureDistanceMet,
  };

  const transitions: BehaviorTransition[] = [];
  let previous = state.fsmState;
  let fsmState = state.fsmState;
  let lastCause = state.lastCause;
  let lastEvent = state.lastEvent;
  let action: GuardAction = { kind: "keep" };

  if (event !== null) {
    const result = transition(previous, event, context);
    fsmState = result.state;
    action = result.action;
    lastCause = result.cause;
    lastEvent = event;
    transitions.push({
      timeMs: input.timeMs,
      previousState: previous,
      event,
      newState: fsmState,
      cause: result.cause,
    });
  }

  const applied = applyAction(state, input, action);
  let started = state.started || event !== null;
  if (action.kind === "reset") {
    started = false;
  }

  const movement = advanceAlongPath(
    input.guardPosition,
    applied.route.waypoints,
    applied.route.nextWaypoint,
    input.speed * input.deltaMs / 1000,
  );

  let route = applied.route;
  if (route.status === "active") {
    route = {
      ...route,
      nextWaypoint: movement.nextWaypoint,
      status: movement.completed ? "completed" : "active",
    };
  }

  let patrolPhase = state.patrolPhase;
  if (action.kind === "reset" || fsmState !== "PATROL") {
    patrolPhase = initialPatrolPhase(input.timeMs);
  } else if (isPatrolPhaseEvent(event)) {
    patrolPhase = applyPatrolPhaseEvent(event, input.timeMs);
  }

  let skipPauseOnArrival = state.skipPauseOnArrival;
  switch (action.kind) {
    case "patrol-start":
    case "patrol-advance":
    case "patrol-skip":
    case "reset":
      skipPauseOnArrival = false;
      break;
    case "patrol-resume":
      skipPauseOnArrival = true;
      break;
    default:
      break;
  }

  const facing = patrolPhase.phase === "look"
    ? patrolLookDirection(input.patrolPoints, input.map, applied.patrolIndex)
    : null;

  const next: BehaviorRuntimeState = {
    fsmState,
    previousFsmState: event !== null ? previous : state.previousFsmState,
    lastCause,
    lastEvent,
    objective: applied.objective,
    objectiveKind: applied.objectiveKind,
    patrolIndex: applied.patrolIndex,
    route,
    search: applied.search,
    plannedAtMs: applied.plannedAtMs,
    lastPlan: applied.lastPlan,
    failedReturnTargets: applied.failedReturnTargets,
    patrolPhase,
    skipPauseOnArrival,
    started,
  };

  return { state: next, movement, transitions, facing };
}

function isPatrolPhaseEvent(event: GuardEvent | null): event is PatrolPhaseEvent {
  return event === "pause-start" || event === "look-start" || event === "patrol-continue";
}

function selectEvent(
  state: BehaviorRuntimeState,
  input: BehaviorInput,
  captureDistanceMet: boolean,
  exhausted: boolean,
  targetChanged: boolean,
  duePhaseEvent: PatrolPhaseEvent | null,
): GuardEvent | null {
  switch (state.fsmState) {
    case "PATROL":
      if (input.vision.visible) {
        return "vision-valid";
      }
      if (input.soundHeard) {
        return "sound-heard";
      }
      if (state.route.status === "failed") {
        return "route-failed";
      }
      if (state.route.status === "completed" && state.objectiveKind === "patrol") {
        if (state.skipPauseOnArrival) {
          return "patrol-advance";
        }
        if (state.patrolPhase.phase === "walk") {
          return "pause-start";
        }
        return duePhaseEvent;
      }
      return null;
    case "INVESTIGATE":
      if (input.vision.visible) {
        return "vision-valid";
      }
      if (input.soundHeard) {
        return "sound-heard";
      }
      if (state.route.status === "failed") {
        return "route-failed";
      }
      if (state.route.status === "completed") {
        return "route-completed";
      }
      return null;
    case "PURSUE":
      if (captureDistanceMet) {
        return "captured";
      }
      if (input.vision.visible) {
        return targetChanged ? "target-differs" : "vision-valid";
      }
      return "vision-lost";
    case "SEARCH":
      if (input.vision.visible) {
        return "vision-valid";
      }
      if (input.soundHeard) {
        return "sound-heard";
      }
      if (state.route.status === "failed") {
        return "route-failed";
      }
      if (exhausted) {
        return "search-exhausted";
      }
      if (state.route.status === "completed" && state.objectiveKind === "search") {
        return "patrol-advance";
      }
      return null;
    case "RETURN":
      if (input.vision.visible) {
        return "vision-valid";
      }
      if (input.soundHeard) {
        return "sound-heard";
      }
      if (state.route.status === "failed") {
        return "route-failed";
      }
      if (state.route.status === "completed") {
        return "route-completed";
      }
      return null;
    case "CAPTURED":
      return null;
  }
}

function isSearchExhausted(state: BehaviorRuntimeState, input: BehaviorInput): boolean {
  if (state.fsmState !== "SEARCH" || !state.search) {
    return false;
  }
  if (input.timeMs - state.search.startedAtMs >= input.searchDurationMs) {
    return true;
  }
  return state.search.nextIndex >= state.search.points.length && state.route.status !== "active";
}

function hasPursueTargetChanged(
  state: BehaviorRuntimeState,
  input: BehaviorInput,
  visionCell: GridPoint | null,
): boolean {
  if (state.fsmState !== "PURSUE") {
    return false;
  }
  if (visionCell === null) {
    return false;
  }
  const changedCell = state.objective === null || !sameCell(visionCell, state.objective);
  const intervalExpired = input.timeMs - state.plannedAtMs >= input.replanIntervalMs;
  return changedCell || intervalExpired;
}

interface AppliedState {
  readonly route: RouteState;
  readonly objective: GridPoint | null;
  readonly objectiveKind: ObjectiveKind | null;
  readonly patrolIndex: number;
  readonly search: SearchRuntime | null;
  readonly plannedAtMs: number;
  readonly lastPlan: SearchResult | null;
  readonly failedReturnTargets: readonly GridPoint[];
}

function applyAction(
  state: BehaviorRuntimeState,
  input: BehaviorInput,
  action: GuardAction,
): AppliedState {
  let route: RouteState = state.route;
  let objective: GridPoint | null = state.objective;
  let objectiveKind: ObjectiveKind | null = state.objectiveKind;
  let patrolIndex = state.patrolIndex;
  let search = state.search;
  let plannedAtMs = state.plannedAtMs;
  let lastPlan = state.lastPlan;
  let failedReturnTargets = state.failedReturnTargets;

  switch (action.kind) {
    case "keep":
    case "patrol-pause":
    case "patrol-look":
      break;
    case "stop":
    case "reset":
      route = emptyRoute();
      objective = null;
      objectiveKind = null;
      search = null;
      failedReturnTargets = [];
      if (action.kind === "reset") {
        patrolIndex = 0;
        lastPlan = null;
      }
      break;
    case "patrol-start": {
      const selection = firstPatrolPoint(input.patrolPoints, input.map);
      if (selection) {
        patrolIndex = selection.index;
        objective = selection.point;
        objectiveKind = "patrol";
        const planned = planRoute(input, selection.point);
        route = planned.route;
        lastPlan = planned.plan;
        plannedAtMs = input.timeMs;
      }
      break;
    }
    case "patrol-advance":
    case "patrol-skip": {
      const selection = nextPatrolPoint(input.patrolPoints, input.map, patrolIndex);
      if (selection) {
        patrolIndex = selection.index;
        objective = selection.point;
        objectiveKind = "patrol";
        const planned = planRoute(input, selection.point);
        route = planned.route;
        lastPlan = planned.plan;
        plannedAtMs = input.timeMs;
      }
      break;
    }
    case "patrol-resume":
      patrolIndex = state.objective
        ? patrolIndexForPoint(input.patrolPoints, state.objective) ?? patrolIndex
        : patrolIndex;
      objectiveKind = "patrol";
      break;
    case "investigate":
      objective = action.target;
      objectiveKind = "investigate";
      plannedAtMs = input.timeMs;
      search = null;
      {
        const planned = planRoute(input, action.target);
        route = planned.route;
        lastPlan = planned.plan;
      }
      break;
    case "pursue":
      objective = action.target;
      objectiveKind = "pursue";
      plannedAtMs = input.timeMs;
      search = null;
      {
        const planned = planRoute(input, action.target);
        route = planned.route;
        lastPlan = planned.plan;
      }
      break;
    case "search": {
      const pattern = buildSearchPattern(input.map, action.origin, input.searchRadiusCells);
      const nextSearch: SearchRuntime = {
        originCell: action.origin,
        points: pattern,
        nextIndex: 0,
        startedAtMs: input.timeMs,
      };
      search = nextSearch;
      const first = pattern[0];
      if (first) {
        objective = first;
        objectiveKind = "search";
        const planned = planRoute(input, first);
        route = planned.route;
        lastPlan = planned.plan;
        plannedAtMs = input.timeMs;
        search = { ...nextSearch, nextIndex: 1 };
      } else {
        objective = null;
        objectiveKind = null;
        route = emptyRoute();
      }
      break;
    }
    case "search-step":
      if (state.search) {
        const next = state.search.points[state.search.nextIndex];
        if (next) {
          objective = next;
          objectiveKind = "search";
          const planned = planRoute(input, next);
          route = planned.route;
          lastPlan = planned.plan;
          plannedAtMs = input.timeMs;
          search = { ...state.search, nextIndex: state.search.nextIndex + 1 };
        }
      }
      break;
    case "return": {
      const from = worldToCell(input.guardPosition, input.tileSize);
      const recoveringFromFailure = state.fsmState === "RETURN"
        && state.route.status === "failed"
        && state.route.goalCell !== null;
      const excluded = recoveringFromFailure
        ? appendTarget(state.failedReturnTargets, state.route.goalCell!)
        : [];
      const selection = nearestPatrolPoint(input.patrolPoints, input.map, from, excluded);
      if (selection) {
        objective = selection.point;
        objectiveKind = "return";
        const planned = planRoute(input, selection.point);
        route = planned.route;
        lastPlan = planned.plan;
        plannedAtMs = input.timeMs;
        search = null;
        failedReturnTargets = excluded;
      } else {
        route = emptyRoute();
        objective = null;
        objectiveKind = null;
        search = null;
        failedReturnTargets = excluded;
      }
      break;
    }
  }

  return { route, objective, objectiveKind, patrolIndex, search, plannedAtMs, lastPlan, failedReturnTargets };
}

function planRoute(
  input: BehaviorInput,
  cell: GridPoint,
): { route: RouteState; plan: SearchResult } {
  const start = worldToCell(input.guardPosition, input.tileSize);
  const result = findPathAStar(input.map, start, cell);
  if (result.status === "success") {
    return {
      route: {
        waypoints: result.path.map((point) => cellCenter(point, input.tileSize)),
        nextWaypoint: 0,
        goalCell: cell,
        status: "active",
      },
      plan: result,
    };
  }
  return {
    route: { waypoints: [], nextWaypoint: 0, goalCell: cell, status: "failed" },
    plan: result,
  };
}

function sameCell(left: GridPoint, right: GridPoint): boolean {
  return left.x === right.x && left.y === right.y;
}

function appendTarget(
  targets: readonly GridPoint[],
  target: GridPoint,
): readonly GridPoint[] {
  return targets.some((candidate) => sameCell(candidate, target)) ? targets : [...targets, target];
}
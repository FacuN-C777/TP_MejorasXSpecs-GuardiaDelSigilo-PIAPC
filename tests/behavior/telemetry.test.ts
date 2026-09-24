import { describe, expect, it } from "vitest";
import {
  createTelemetryLog,
  lastTransition,
  recordTransition,
} from "../../src/domain/telemetry/log";
import type { TransitionEvent } from "../../src/domain/telemetry/events";

const EVENT: TransitionEvent = {
  timeMs: 100,
  previousState: "PATROL",
  event: "sound-heard",
  newState: "INVESTIGATE",
  cause: "sonido",
};

describe("telemetry log", () => {
  it("starts empty", () => {
    const log = createTelemetryLog();

    expect(log.events).toEqual([]);
    expect(lastTransition(log)).toBeNull();
  });

  it("appends transitions preserving order", () => {
    const log = recordTransition(
      recordTransition(createTelemetryLog(), EVENT),
      { ...EVENT, timeMs: 200, newState: "PURSUE", event: "vision-valid", cause: "vision" },
    );

    const latest = lastTransition(log);
    expect(log.events.length).toBe(2);
    expect(log.events[0]).toEqual(EVENT);
    expect(latest).toEqual({
      timeMs: 200,
      previousState: "PATROL",
      event: "vision-valid",
      newState: "PURSUE",
      cause: "vision",
    });
  });
});
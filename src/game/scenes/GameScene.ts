import Phaser from "phaser";
import {
  CAPTURE_DISTANCE,
  FIELD_OF_VIEW,
  GUARD_START,
  GRID_HEIGHT,
  GRID_WIDTH,
  LAB_MAP,
  PATROL_LOOK_MS,
  PATROL_PAUSE_MS,
  PATROL_POINTS,
  PLAYER_START,
  REPLAN_INTERVAL_MS,
  SEARCH_DURATION_MS,
  SEARCH_RADIUS_CELLS,
  TILE_SIZE,
  VISION_RANGE,
} from "../../application/simulation/labLevel";
import {
  initialBehaviorState,
  updateBehavior,
  type BehaviorRuntimeState,
} from "../../application/simulation/behaviorSimulation";
import {
  initialPerceptionState,
  updatePerceptionSimulation,
  withSoundEvent,
  type PerceptionFrame,
  type PerceptionSimulationState,
} from "../../application/simulation/perceptionSimulation";
import type { GuardState } from "../../domain/behavior/guardFsm";
import type { PatrolPhase } from "../../domain/behavior/patrolPhase";
import { cellCenter, isWalkable } from "../../domain/model/grid";
import type { Vector2 } from "../../domain/model/vector";
import { timeSinceLastPerception } from "../../domain/perception/memory";
import type { VisionReason, VisionResult } from "../../domain/perception/perception";

const PLAYER_SPEED = 190;
const GUARD_SPEED = 115;
const SOUND_RADIUS = 190;
const SOUND_DURATION_MS = 800;
const STATE_LABELS: Readonly<Record<GuardState, string>> = {
  PATROL: "PATRULLA",
  INVESTIGATE: "INVESTIGANDO",
  PURSUE: "PERSIGUIENDO",
  SEARCH: "BUSCANDO",
  RETURN: "REGRESANDO",
  CAPTURED: "CAPTURADO",
};
const PHASE_LABELS: Readonly<Record<PatrolPhase, string>> = {
  walk: "AVANCE",
  pause: "PAUSA",
  look: "MIRADA",
};
const VISION_LABELS: Readonly<Record<VisionReason, string>> = {
  visible: "VISIBLE",
  "out-of-range": "FUERA DE RANGO",
  "outside-cone": "FUERA DEL CONO",
  occluded: "OCLUIDO",
  "invalid-facing": "DIRECCION INVALIDA",
};

function coneStyle(fsmState: GuardState, visible: boolean): { color: number; alpha: number } {
  let color: number;
  let alpha: number;

  switch (fsmState) {
    case "PURSUE":
      color = 0xe16969;
      alpha = 0.3;
      break;
    case "INVESTIGATE":
    case "SEARCH":
      color = 0xe5b454;
      alpha = 0.24;
      break;
    case "CAPTURED":
      color = 0x6b8afd;
      alpha = 0.06;
      break;
    default:
      color = 0x6b8afd;
      alpha = 0.12;
  }

  if (visible) {
    color = 0x73c991;
    alpha = Math.max(alpha, 0.26);
  }

  return { color, alpha };
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private guard!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveUp!: Phaser.Input.Keyboard.Key;
  private moveDown!: Phaser.Input.Keyboard.Key;
  private moveLeft!: Phaser.Input.Keyboard.Key;
  private moveRight!: Phaser.Input.Keyboard.Key;
  private reset!: Phaser.Input.Keyboard.Key;
  private emitSound!: Phaser.Input.Keyboard.Key;
  private navigationGraphics!: Phaser.GameObjects.Graphics;
  private perceptionGraphics!: Phaser.GameObjects.Graphics;
  private lastKnownMarker!: Phaser.GameObjects.Arc;
  private navigationHud!: Phaser.GameObjects.Text;
  private guardFacing: Vector2 = { x: -1, y: 0 };
  private perceptionState: PerceptionSimulationState = initialPerceptionState();
  private behaviorState: BehaviorRuntimeState = initialBehaviorState();

  public constructor() {
    super("GameScene");
  }

  public create(): void {
    this.guardFacing = { x: -1, y: 0 };
    this.perceptionState = initialPerceptionState();
    this.behaviorState = initialBehaviorState();
    this.cameras.main.setBackgroundColor("#10161c");
    this.drawGrid();

    const walls = this.physics.add.staticGroup();
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        if (!isWalkable(LAB_MAP, { x, y })) {
          const center = cellCenter({ x, y }, TILE_SIZE);
          const wall = this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x27333d);
          wall.setStrokeStyle(1, 0x3a4c58);
          walls.add(wall);
        }
      }
    }

    const spawn = cellCenter(PLAYER_START, TILE_SIZE);
    this.player = this.add.rectangle(spawn.x, spawn.y, 20, 20, 0xe5b454);
    this.player.setStrokeStyle(2, 0xffd98a);
    this.player.setDepth(4);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, walls);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.moveUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.moveDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.moveLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.moveRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.reset = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.emitSound = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.perceptionGraphics = this.add.graphics().setDepth(1);
    this.navigationGraphics = this.add.graphics().setDepth(2);
    const guardPosition = cellCenter(GUARD_START, TILE_SIZE);
    this.guard = this.add
      .circle(guardPosition.x, guardPosition.y, 11, 0x6b8afd)
      .setStrokeStyle(2, 0xb9c5ff)
      .setDepth(4);
    this.lastKnownMarker = this.add
      .circle(0, 0, 7, 0x000000, 0)
      .setStrokeStyle(2, 0xe16969)
      .setDepth(5)
      .setVisible(false);

    this.add
      .text(16, 14, "H4 / MAQUINA DE ESTADOS", {
        color: "#9eb4c2",
        fontFamily: "monospace",
        fontSize: "14px",
      })
      .setDepth(10);

    this.navigationHud = this.add
      .text(GRID_WIDTH * TILE_SIZE - 16, 14, "", {
        align: "right",
        backgroundColor: "#10161ccc",
        color: "#d9e4ea",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.updatePerception(0, 0);
  }

  public update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.reset)) {
      this.scene.restart();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.emitSound)) {
      this.perceptionState = withSoundEvent(this.perceptionState, {
        position: { x: this.player.x, y: this.player.y },
        radius: SOUND_RADIUS,
        emittedAtMs: time,
        durationMs: SOUND_DURATION_MS,
      });
    }

    const horizontal = Number(this.cursors.right.isDown || this.moveRight.isDown)
      - Number(this.cursors.left.isDown || this.moveLeft.isDown);
    const vertical = Number(this.cursors.down.isDown || this.moveDown.isDown)
      - Number(this.cursors.up.isDown || this.moveUp.isDown);
    const velocity = new Phaser.Math.Vector2(horizontal, vertical);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(PLAYER_SPEED);
    }

    this.playerBody.setVelocity(velocity.x, velocity.y);
    this.updatePerception(time, delta);
  }

  private drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1b252d, 1);

    for (let x = 0; x <= GRID_WIDTH; x += 1) {
      graphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y += 1) {
      graphics.lineBetween(0, y * TILE_SIZE, GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
  }

  private updatePerception(time: number, delta: number): void {
    const observer = { x: this.guard.x, y: this.guard.y };
    const target = { x: this.player.x, y: this.player.y };
    const frame = updatePerceptionSimulation(this.perceptionState, {
      map: LAB_MAP,
      tileSize: TILE_SIZE,
      observer,
      facing: this.guardFacing,
      target,
      visionRange: VISION_RANGE,
      fieldOfViewRadians: FIELD_OF_VIEW,
      timeMs: time,
    });
    this.perceptionState = frame.state;

    this.updateGuardBehavior(time, delta, frame);
    this.drawBehaviorPlan();
    this.drawPerception(frame);
    this.updateTelemetry(time, frame.vision, frame.soundHeard);
  }

  private updateGuardBehavior(time: number, delta: number, frame: PerceptionFrame): void {
    const soundPosition = this.perceptionState.soundEvent
      ? {
        x: this.perceptionState.soundEvent.position.x,
        y: this.perceptionState.soundEvent.position.y,
      }
      : null;

    const result = updateBehavior(this.behaviorState, {
      map: LAB_MAP,
      tileSize: TILE_SIZE,
      patrolPoints: PATROL_POINTS,
      guardPosition: { x: this.guard.x, y: this.guard.y },
      vision: {
        visible: frame.vision.visible,
        target: { x: this.player.x, y: this.player.y },
      },
      soundHeard: frame.soundHeard,
      soundPosition,
      memory: this.perceptionState.memory,
      captureDistance: CAPTURE_DISTANCE,
      speed: GUARD_SPEED,
      deltaMs: delta,
      timeMs: time,
      replanIntervalMs: REPLAN_INTERVAL_MS,
      searchDurationMs: SEARCH_DURATION_MS,
      searchRadiusCells: SEARCH_RADIUS_CELLS,
      pauseDurationMs: PATROL_PAUSE_MS,
      lookDurationMs: PATROL_LOOK_MS,
    });
    this.behaviorState = result.state;

    this.guard.setPosition(result.movement.position.x, result.movement.position.y);
    if (result.facing) {
      this.guardFacing = result.facing;
    } else if (result.movement.direction) {
      this.guardFacing = result.movement.direction;
    }

    if (this.behaviorState.fsmState === "CAPTURED") {
      this.guard.setStrokeStyle(3, 0xff5b5b);
    } else {
      this.guard.setStrokeStyle(2, 0xb9c5ff);
    }
  }

  private drawBehaviorPlan(): void {
    this.navigationGraphics.clear();
    const plan = this.behaviorState.lastPlan;
    if (!plan) {
      return;
    }

    this.navigationGraphics.fillStyle(0x3b819c, 0.22);
    for (const point of plan.explored) {
      this.navigationGraphics.fillRect(
        point.x * TILE_SIZE + 3,
        point.y * TILE_SIZE + 3,
        TILE_SIZE - 6,
        TILE_SIZE - 6,
      );
    }

    if (plan.status !== "success") {
      return;
    }

    const firstPoint = plan.path[0];
    if (!firstPoint) {
      return;
    }

    const firstCenter = cellCenter(firstPoint, TILE_SIZE);
    this.navigationGraphics.lineStyle(4, 0x62d0e8, 0.9);
    this.navigationGraphics.beginPath();
    this.navigationGraphics.moveTo(firstCenter.x, firstCenter.y);
    for (const point of plan.path.slice(1)) {
      const center = cellCenter(point, TILE_SIZE);
      this.navigationGraphics.lineTo(center.x, center.y);
    }
    this.navigationGraphics.strokePath();
  }

  private drawPerception(frame: PerceptionFrame): void {
    this.perceptionGraphics.clear();
    const cone = frame.cone;
    const facingAngle = Math.atan2(cone.direction.y, cone.direction.x);
    const halfFieldOfView = cone.fovRadians / 2;
    const style = coneStyle(this.behaviorState.fsmState, frame.vision.visible);
    this.perceptionGraphics.fillStyle(style.color, style.alpha);
    this.perceptionGraphics.beginPath();
    this.perceptionGraphics.moveTo(cone.origin.x, cone.origin.y);
    this.perceptionGraphics.arc(
      cone.origin.x,
      cone.origin.y,
      cone.range,
      facingAngle - halfFieldOfView,
      facingAngle + halfFieldOfView,
    );
    this.perceptionGraphics.closePath();
    this.perceptionGraphics.fillPath();

    if (this.perceptionState.soundEvent) {
      this.perceptionGraphics.lineStyle(2, 0xe5b454, 0.8);
      this.perceptionGraphics.strokeCircle(
        this.perceptionState.soundEvent.position.x,
        this.perceptionState.soundEvent.position.y,
        this.perceptionState.soundEvent.radius,
      );
    }

    const lastKnown = this.perceptionState.memory.lastKnownPosition;
    this.lastKnownMarker.setVisible(lastKnown !== null);
    if (lastKnown) {
      this.lastKnownMarker.setPosition(lastKnown.x, lastKnown.y);
    }
  }

  private updateTelemetry(time: number, vision: VisionResult, soundHeard: boolean): void {
    const age = timeSinceLastPerception(this.perceptionState.memory, time);
    const memory = age === null
      ? "memoria -"
      : `memoria ${this.perceptionState.memory.source} ${(age / 1000).toFixed(1)}s`;
    const sound = this.perceptionState.soundEvent
      ? (soundHeard ? "OIDO" : "FUERA DE RANGO")
      : "-";
    const state = STATE_LABELS[this.behaviorState.fsmState];
    const previous = this.behaviorState.previousFsmState
      ? STATE_LABELS[this.behaviorState.previousFsmState]
      : "-";
    const cause = this.behaviorState.lastCause ?? "-";
    const objective = this.behaviorState.objective
      ? `objetivo ${this.behaviorState.objective.x},${this.behaviorState.objective.y}`
      : "objetivo -";

    this.navigationHud.setText([
      "estado " + state,
      "anterior " + previous,
      "causa " + cause,
      objective,
      "fase " + PHASE_LABELS[this.behaviorState.patrolPhase.phase],
      "vision " + VISION_LABELS[vision.reason],
      "sonido " + sound,
      memory,
    ]);
  }
}
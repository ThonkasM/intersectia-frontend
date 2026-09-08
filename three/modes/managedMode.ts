import * as THREE from 'three';
import {
  PLAYER,
  STATE_LABELS,
  VEHICLE_COLORS,
  type DecisionEvent,
  type Direction,
  type VehicleState,
} from '../../lib/constants';
import { BubbleLayer } from '../bubbles';
import { getActiveRig } from '../cameraRig';
import { isCollisionsEnabled } from '../collisions';
import { hudBridge } from '../hud';
import { GamepadController } from '../input/gamepadController';
import { PlayerVehicle } from '../input/playerVehicle';
import { IntersectionSocket, type RemoteVehicleDto } from '../net/socket';
import { Vehicle } from '../vehicle';
import type { SimulationMode } from './mode.interface';

const PLAYER_COLOR = 0x22d3ee;
const MAX_DECISIONS = 8;

export class ManagedMode implements SimulationMode {
  private vehicles = new Map<string, Vehicle>();
  private nextId = 0;
  private connected = false;
  private crossed = 0;
  private avgWaitSeconds: number | null = null;
  private violations = 0;
  private lastDecision: DecisionEvent | null = null;
  private decisions: DecisionEvent[] = [];
  private unsubscribers: (() => void)[] = [];
  private scene?: THREE.Scene;
  private gamepad = new GamepadController();
  private player: PlayerVehicle | null = null;
  private playerSeenOnce = false;
  private sendTimer = 0;
  private prevY = false;
  private prevX = false;
  private bubbles?: BubbleLayer;

  constructor(
    private socket: IntersectionSocket,
    private mode: 'managed' | 'managed-ai'
  ) {}

  start(scene: THREE.Scene): void {
    this.scene = scene;
    this.bubbles = new BubbleLayer(scene, () => hudBridge.labelsOn);
    this.socket.connect();
    this.socket.setMode(this.mode);
    this.socket.setCollisions(isCollisionsEnabled());
    this.fetchAvgWait();
    this.fetchSummary();

    this.unsubscribers.push(
      this.socket.onStateUpdate((snapshot) => this.applySnapshot(snapshot))
    );
    this.unsubscribers.push(
      this.socket.onStatus((connected) => {
        this.connected = connected;
        this.publish();
      })
    );
    this.unsubscribers.push(
      this.socket.onDecision((d) => {
        this.lastDecision = d;
        this.decisions = [d, ...this.decisions].slice(0, MAX_DECISIONS);
        this.publish();
      })
    );
    this.unsubscribers.push(
      this.gamepad.onStatus((connected) => this.handleGamepad(connected))
    );
    // Mando ya conectado antes de remontar el modo (cambio de modo): el scan del
    // constructor no alcanzó a notificar a este start().
    if (this.gamepad.isConnected() && !this.player) {
      this.handleGamepad(true);
    }
    this.publish();
  }

  stop(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.gamepad.dispose();
    for (const v of this.vehicles.values()) {
      this.scene?.remove(v.mesh);
      this.disposeMesh(v.mesh);
    }
    this.vehicles.clear();
    this.bubbles?.clear();
    this.bubbles = undefined;
    this.player = null;
    this.playerSeenOnce = false;
    this.socket.disconnect();
  }

  getPlayerVehicle(): Vehicle | null {
    return this.player?.vehicle ?? null;
  }

  onFrame(dt: number): void {
    for (const v of this.vehicles.values()) v.syncVisual(dt);
    if (this.player && this.gamepad.isConnected()) {
      const input = this.gamepad.read();
      if (input.y && !this.prevY) getActiveRig()?.toggleZoom();
      if (input.x && !this.prevX) this.toggleCameraMode();
      this.prevY = input.y;
      this.prevX = input.x;
      if (this.player.vehicle.crashed) {
        // Colisión: el jugador queda detenido hasta que el backend lo recupere.
        this.player.speed = 0;
      } else {
        this.player.update(input, dt);
        this.player.updateLane(input, dt);
        this.player.commitMove(dt);
      }
      this.player.syncVisual(dt);
      this.sendTimer += dt;
      if (this.sendTimer >= 1 / 15) {
        this.socket.sendPlayerState({
          id: this.player.vehicle.id,
          x: this.player.vehicle.targetPos.x,
          z: this.player.vehicle.targetPos.z,
          from: this.player.vehicle.from,
          speed: this.player.speed,
        });
        this.sendTimer = 0;
      }
    }
    this.updateBubbles();
  }

  setCollisions(enabled: boolean): void {
    this.socket.setCollisions(enabled);
  }

  private toggleCameraMode(): void {
    const rig = getActiveRig();
    if (!rig) return;
    rig.setMode(rig.mode === 'firstPerson' ? 'orbit' : 'firstPerson');
  }

  private handleGamepad(connected: boolean): void {
    if (connected && !this.player && this.scene) {
      this.player = new PlayerVehicle('S', PLAYER_COLOR);
      this.player.connected = true;
      this.playerSeenOnce = false;
      this.scene.add(this.player.vehicle.mesh);
      this.vehicles.set(PLAYER.ID, this.player.vehicle);
    } else if (!connected && this.player) {
      this.player.connected = false;
    }
    this.publish();
  }

  private applySnapshot(snapshot: RemoteVehicleDto[]): void {
    const seen = new Set<string>();
    for (const rv of snapshot) {
      seen.add(rv.id);
      if (rv.id === PLAYER.ID && this.player) {
        this.playerSeenOnce = true;
        this.player.authorized = rv.state === 'crossing';
        this.player.vehicle.setState(rv.state);
        this.player.vehicle.crashed = rv.crashed;
        if (!this.gamepad.isConnected()) {
          this.player.vehicle.setTarget(rv.x, rv.z);
        }
        continue;
      }
      const local = this.vehicles.get(rv.id) ?? this.createLocal(rv.id, rv.from, rv.x, rv.z);
      const prevState: VehicleState = local.state;
      local.setTarget(rv.x, rv.z);
      local.setState(rv.state);
      local.frozen = rv.frozen;
      local.crashed = rv.crashed;
      if (prevState !== 'gone' && rv.state === 'gone') {
        this.crossed += 1;
      }
    }

    const toRemove: string[] = [];
    for (const id of this.vehicles.keys()) {
      if (!seen.has(id)) toRemove.push(id);
    }
    for (const id of toRemove) {
      const v = this.vehicles.get(id);
      if (!v) continue;
      if (id === PLAYER.ID && this.player) {
        if (!this.playerSeenOnce) continue;
        this.playerSeenOnce = false;
        if (v.state !== 'gone') this.crossed += 1;
        this.vehicles.delete(id);
        this.scene?.remove(v.mesh);
        this.disposeMesh(v.mesh);
        this.bubbles?.remove(id);
        if (this.gamepad.isConnected()) {
          this.respawnPlayer();
        } else {
          this.player = null;
        }
        continue;
      }
      if (v.state !== 'gone') this.crossed += 1;
      this.vehicles.delete(id);
      this.scene?.remove(v.mesh);
      this.disposeMesh(v.mesh);
      this.bubbles?.remove(id);
    }

    this.publish();
  }

  private respawnPlayer(): void {
    if (!this.player || !this.scene) return;
    this.scene.remove(this.player.vehicle.mesh);
    this.disposeMesh(this.player.vehicle.mesh);
    this.player = new PlayerVehicle('S', PLAYER_COLOR);
    this.player.authorized = false;
    this.player.speed = 0;
    this.player.connected = true;
    this.playerSeenOnce = false;
    this.scene.add(this.player.vehicle.mesh);
    this.vehicles.set(PLAYER.ID, this.player.vehicle);
  }

  private createLocal(id: string, from: Direction, x: number, z: number): Vehicle {
    const v = new Vehicle(id, from, this.vehicleColor(this.nextId));
    this.nextId += 1;
    v.setTarget(x, z);
    v.mesh.position.set(x, 0, z);
    this.scene?.add(v.mesh);
    this.vehicles.set(id, v);
    return v;
  }

  private updateBubbles(): void {
    if (!this.bubbles) return;
    const firstPerson = getActiveRig()?.mode === 'firstPerson';
    for (const [id, v] of this.vehicles) {
      if (firstPerson && id === PLAYER.ID) {
        // En primera persona el globo del jugador no se muestra sobre el
        // vehículo (la info va en el minimapa). Se oculta explícitamente para
        // que el sprite creado en frames previos no quede visible.
        this.bubbles.sync(id, '', v.mesh.position.x, v.mesh.position.z);
        continue;
      }
      const label = v.crashed
        ? 'Choque'
        : v.frozen
          ? 'Detenido'
          : STATE_LABELS[v.state];
      this.bubbles.sync(id, label, v.mesh.position.x, v.mesh.position.z);
    }
  }

  pickAt(camera: THREE.Camera, ndcX: number, ndcY: number): string | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const meshes: THREE.Object3D[] = [];
    for (const [id, v] of this.vehicles) {
      if (id === PLAYER.ID) continue;
      meshes.push(v.mesh);
    }
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return null;
    const hitId = hits[0].object.id;
    for (const [id, v] of this.vehicles) {
      if (id === PLAYER.ID) continue;
      if (v.mesh.getObjectById(hitId)) return id;
    }
    return null;
  }

  toggleVehicleFreeze(id: string): void {
    const local = this.vehicles.get(id);
    if (!local || id === PLAYER.ID) return;
    local.frozen = !local.frozen;
    if (local.frozen) this.socket.freezeVehicle(id);
    else this.socket.resumeVehicle(id);
  }

  reset(): void {
    this.socket.resetSimulation();
    for (const [id, v] of this.vehicles) {
      if (id === PLAYER.ID) continue;
      this.scene?.remove(v.mesh);
      this.disposeMesh(v.mesh);
      this.bubbles?.remove(id);
    }
    this.vehicles.clear();
    if (this.player) {
      this.player.vehicle.setState('approach');
      this.player.speed = 0;
      this.player.authorized = false;
      this.playerSeenOnce = false;
      this.vehicles.set(PLAYER.ID, this.player.vehicle);
    }
    this.crossed = 0;
    this.decisions = [];
    this.lastDecision = null;
    this.publish();
  }

  private disposeMesh(group: THREE.Group): void {
    const unregister = group.userData.unregisterHeadlight as (() => void) | undefined;
    unregister?.();
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.userData.shared) return;
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        for (const material of materials) material.dispose();
      } else if (obj instanceof THREE.PointLight) {
        obj.dispose();
      }
    });
    (group.userData.beaconMat as THREE.Material | undefined)?.dispose();
  }

  private publish(): void {
    let waiting = 0;
    for (const v of this.vehicles.values()) {
      if (v.state === 'queued') waiting += 1;
    }
    hudBridge.publish({
      mode: this.mode,
      crossed: this.crossed,
      waiting,
      avgWaitSeconds: this.avgWaitSeconds,
      connected: this.connected,
      gamepadConnected: this.gamepad.isConnected(),
      playerAuthorized: this.player ? this.player.authorized : null,
      playerState: this.player ? this.player.vehicle.state : null,
      queueLength: waiting,
      violations: this.violations,
      lastDecision: this.lastDecision,
      decisions: this.decisions,
      playerLane: this.player ? this.player.lane : 0,
      playerSpeed: this.player ? this.player.speed : 0,
      labelsOn: hudBridge.labelsOn,
    });
  }

  private vehicleColor(index: number): number {
    return Number.parseInt(VEHICLE_COLORS[index % VEHICLE_COLORS.length].slice(1), 16);
  }

  private async fetchAvgWait(): Promise<void> {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    try {
      const res = await fetch(`${base}/metrics/avg?mode=${this.mode}`);
      if (!res.ok) return;
      const data = (await res.json()) as { avgWaitSeconds?: number | null; avg?: number | null };
      const avg = data.avgWaitSeconds ?? data.avg ?? null;
      if (typeof avg === 'number') {
        this.avgWaitSeconds = avg;
        this.publish();
      }
    } catch {
      // best-effort: ignore network/metrics errors
    }
  }

  private async fetchSummary(): Promise<void> {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    try {
      const res = await fetch(`${base}/metrics/summary`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        totalViolations?: number;
        totalCrossings?: number;
        avgWaitByMode?: Record<string, number | null>;
      };
      if (typeof data.totalViolations === 'number') {
        this.violations = data.totalViolations;
      }
      const avg = data.avgWaitByMode?.[this.mode];
      if (typeof avg === 'number') this.avgWaitSeconds = avg;
      this.publish();
    } catch {
      // best-effort: ignore network/metrics errors
    }
  }
}

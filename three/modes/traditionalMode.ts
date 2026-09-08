import * as THREE from 'three';
import {
  DIRECTION,
  MIN_FOLLOW_DISTANCE,
  MIN_STOP_DISTANCE,
  SIM,
  STATE_LABELS,
  VEHICLE_COLORS,
  laneOffset,
  type Direction,
  type VehicleState,
} from '../../lib/constants';
import { BubbleLayer } from '../bubbles';
import { hudBridge } from '../hud';
import { Vehicle } from '../vehicle';
import type { SimulationMode } from './mode.interface';

const RIGHT_OF: Record<Direction, Direction> = { N: 'E', E: 'S', S: 'W', W: 'N' };

const HUD_PUBLISH_INTERVAL = 0.1;

export class TraditionalMode implements SimulationMode {
  private vehicles: Vehicle[] = [];
  private queue: Vehicle[] = [];
  private occupants: Vehicle[] = [];
  private lanes = new Map<Vehicle, number>();
  private spawnCountdown = 1.2;
  private nextId = 0;
  private crossed = 0;
  private totalWaitSeconds = 0;
  private avgWaitSeconds: number | null = null;
  private scene?: THREE.Scene;
  private publishTimer = 0;
  private bubbles?: BubbleLayer;

  start(scene: THREE.Scene): void {
    this.scene = scene;
    this.bubbles = new BubbleLayer(scene, () => hudBridge.labelsOn);
    this.publishHud();
  }

  stop(): void {
    this.bubbles?.clear();
    this.bubbles = undefined;
  }

  onFrame(dt: number): void {
    this.maybeSpawn(dt);
    this.moveVehicles(dt);
    this.decide();
    this.cleanup();
    for (const v of this.vehicles) v.syncVisual(dt);
    this.updateBubbles();
    this.publishTimer += dt;
    if (this.publishTimer >= HUD_PUBLISH_INTERVAL) {
      this.publishTimer = 0;
      this.publishHud();
    }
  }

  private maybeSpawn(dt: number): void {
    this.spawnCountdown -= dt;
    if (this.spawnCountdown > 0) return;
    if (this.vehicles.length >= SIM.MAX_VEHICLES) return;

    const from = this.randomDirection();
    const lane = Math.random() < 0.5 ? 0 : 1;
    const spawn = this.spawnPosition(from, lane);
    const vehicle = new Vehicle(this.nextId.toString(), from, this.colorFor(this.nextId));
    this.nextId += 1;
    vehicle.setTarget(spawn.x, spawn.z);
    vehicle.mesh.position.set(spawn.x, 0, spawn.z);
    this.scene?.add(vehicle.mesh);
    this.vehicles.push(vehicle);
    this.lanes.set(vehicle, lane);
    this.spawnCountdown = 1.0 + Math.random() * 1.5;
  }

  private moveVehicles(dt: number): void {
    for (const v of this.vehicles) {
      if (v.frozen || v.state === 'queued' || v.state === 'gone') continue;

      const speed = this.effectiveSpeed(v);
      v.speed = speed;
      const dir = DIRECTION[v.from];
      const x = v.targetPos.x + dir.dx * speed * dt;
      const z = v.targetPos.z + dir.dz * speed * dt;
      v.setTarget(x, z);

      let state: VehicleState = v.state;

      if (state === 'approach' && this.distanceToCenter(v) <= SIM.STOP_LINE_DISTANCE) {
        v.setState('queued');
        v.speed = 0;
        state = 'queued';
        this.queue.push(v);
      }

      if (state === 'crossing' && this.distanceToCenter(v) > SIM.GONE_DISTANCE) {
        v.setState('gone');
        this.occupants = this.occupants.filter((o) => o !== v);
      }

      if (state === 'queued' || state === 'crossing') {
        v.waitedSeconds += dt;
      }
    }
  }

  pickAt(camera: THREE.Camera, ndcX: number, ndcY: number): string | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const meshes: THREE.Object3D[] = this.vehicles.map((v) => v.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return null;
    const hitId = hits[0].object.id;
    const hit = this.vehicles.find((v) => v.mesh.getObjectById(hitId));
    return hit ? hit.id : null;
  }

  toggleVehicleFreeze(id: string): void {
    const vehicle = this.vehicles.find((v) => v.id === id);
    if (!vehicle) return;
    vehicle.frozen = !vehicle.frozen;
    vehicle.speed = 0;
  }

  reset(): void {
    for (const v of this.vehicles) {
      this.scene?.remove(v.mesh);
      this.disposeMesh(v.mesh);
      this.bubbles?.remove(v.id);
      this.lanes.delete(v);
    }
    this.vehicles = [];
    this.queue = [];
    this.occupants = [];
    this.crossed = 0;
    this.totalWaitSeconds = 0;
    this.avgWaitSeconds = null;
    this.nextId = 0;
    this.spawnCountdown = 1.0;
    this.publishHud();
  }

  setCollisions(_enabled: boolean): void {
    // En modo tradicional no hay jugador; los autónomos siempre se evitan entre
    // sí mediante la separación, así que las colisiones no aplican aquí.
    void _enabled;
  }

  private effectiveSpeed(v: Vehicle): number {
    let speed = v.state === 'crossing' ? SIM.CROSSING_SPEED : SIM.APPROACH_SPEED;
    const ahead = this.findAhead(v);
    if (ahead) {
      const gap = this.progress(ahead) - this.progress(v);
      if (gap < MIN_STOP_DISTANCE) speed = 0;
      else if (gap < MIN_FOLLOW_DISTANCE) speed = Math.min(speed, ahead.speed);
    }
    return speed;
  }

  private findAhead(v: Vehicle): Vehicle | null {
    const lane = this.lanes.get(v) ?? 0;
    const myProgress = this.progress(v);
    let ahead: Vehicle | null = null;
    let minDiff = Infinity;
    for (const other of this.vehicles) {
      if (other === v || other.from !== v.from || other.state === 'gone') continue;
      if ((this.lanes.get(other) ?? 0) !== lane) continue;
      const otherProgress = this.progress(other);
      if (otherProgress <= myProgress) continue;
      const diff = otherProgress - myProgress;
      if (diff < minDiff) {
        minDiff = diff;
        ahead = other;
      }
    }
    return ahead;
  }

  private progress(v: Vehicle): number {
    switch (v.from) {
      case 'N':
        return SIM.SPAWN_DISTANCE - v.targetPos.z;
      case 'S':
        return SIM.SPAWN_DISTANCE + v.targetPos.z;
      case 'E':
        return SIM.SPAWN_DISTANCE + v.targetPos.x;
      case 'W':
        return SIM.SPAWN_DISTANCE - v.targetPos.x;
    }
  }

  private decide(): void {
    this.occupants = this.occupants.filter((o) => o.state !== 'gone');
    if (this.queue.length === 0) return;
    const winner = this.pickWinner(this.queue);
    if (winner && !this.conflictsWithOccupants(winner)) {
      this.grant(winner);
    }
    for (const vehicle of [...this.queue]) {
      if (vehicle.state === 'crossing') continue;
      if (this.conflictsWithOccupants(vehicle)) continue;
      this.grant(vehicle);
    }
  }

  private grant(v: Vehicle): void {
    v.setState('crossing');
    v.speed = SIM.CROSSING_SPEED;
    this.occupants.push(v);
    this.queue = this.queue.filter((q) => q !== v);
  }

  private conflictsWithOccupants(v: Vehicle): boolean {
    return this.occupants.some((o) => this.conflicts(o, v));
  }

  private conflicts(a: Vehicle, b: Vehicle): boolean {
    if (a.from === b.from) return false;
    const opposite: Record<Direction, Direction> = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
    };
    return opposite[a.from] !== b.from;
  }

  private cleanup(): void {
    const remaining: Vehicle[] = [];
    for (const v of this.vehicles) {
      if (v.state === 'gone') {
        this.crossed += 1;
        this.totalWaitSeconds += v.waitedSeconds;
        this.avgWaitSeconds = this.totalWaitSeconds / this.crossed;
        this.scene?.remove(v.mesh);
        this.disposeMesh(v.mesh);
        this.bubbles?.remove(v.id);
        this.lanes.delete(v);
      } else {
        remaining.push(v);
      }
    }
    this.vehicles = remaining;
  }

  private updateBubbles(): void {
    if (!this.bubbles) return;
    for (const v of this.vehicles) {
      const label = v.crashed
        ? 'Choque'
        : v.frozen
          ? 'Detenido'
          : STATE_LABELS[v.state];
      this.bubbles.sync(v.id, label, v.mesh.position.x, v.mesh.position.z);
    }
  }

  private publishHud(): void {
    hudBridge.publish({
      mode: 'traditional',
      crossed: this.crossed,
      waiting: this.queue.length,
      avgWaitSeconds: this.avgWaitSeconds,
      connected: false,
      gamepadConnected: false,
      playerAuthorized: null,
      playerState: null,
      queueLength: this.queue.length,
      violations: 0,
      lastDecision: null,
      decisions: [],
      playerLane: 0,
      playerSpeed: 0,
      labelsOn: hudBridge.labelsOn,
    });
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

  private pickWinner(queue: Vehicle[]): Vehicle {
    let winner: Vehicle | null = null;
    for (const v of queue) {
      const beatsAll = queue.every(
        (o) => o === v || this.hasPriority(v, o) || !this.hasPriority(o, v)
      );
      if (!beatsAll) continue;
      if (winner === null || this.breaksTie(v, winner)) winner = v;
    }
    return winner as Vehicle;
  }

  private breaksTie(a: Vehicle, b: Vehicle): boolean {
    if (a.waitedSeconds !== b.waitedSeconds) return a.waitedSeconds < b.waitedSeconds;
    return a.id < b.id;
  }

  private hasPriority(v: Vehicle, o: Vehicle): boolean {
    return v.from === RIGHT_OF[o.from];
  }

  private distanceToCenter(v: Vehicle): number {
    if (v.from === 'N' || v.from === 'S') return Math.abs(v.targetPos.z);
    return Math.abs(v.targetPos.x);
  }

  private spawnPosition(from: Direction, lane: number): { x: number; z: number } {
    const dir = DIRECTION[from];
    const off = laneOffset(from, lane);
    const x = off.x - dir.dx * SIM.SPAWN_DISTANCE;
    const z = off.z - dir.dz * SIM.SPAWN_DISTANCE;
    return { x, z };
  }

  private randomDirection(): Direction {
    const dirs: Direction[] = ['N', 'S', 'E', 'W'];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  private colorFor(index: number): number {
    return Number.parseInt(VEHICLE_COLORS[index % VEHICLE_COLORS.length].slice(1), 16);
  }
}

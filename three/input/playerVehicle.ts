import * as THREE from 'three';
import {
  DIRECTION,
  LANES,
  PLAYER,
  SIM,
  laneOffset,
  type Direction,
  type VehicleState,
} from '../../lib/constants';
import { getActiveRig } from '../cameraRig';
import { Vehicle } from '../vehicle';
import type { GamepadInput } from './gamepadController';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class PlayerVehicle {
  vehicle: Vehicle;
  speed = 0;
  authorized = false;
  connected = false;
  lane = 0;
  laneChangeCooldown = 0;
  private underglow?: THREE.Mesh;
  private beaconMat?: THREE.MeshStandardMaterial;
  private pulseTimer = 0;

  constructor(from: Direction, color: number) {
    this.vehicle = new Vehicle(PLAYER.ID, from, color);
    const spawn = this.spawnPosition(from);
    this.vehicle.setTarget(spawn.x, spawn.z);
    this.vehicle.mesh.position.set(spawn.x, 0, spawn.z);
    this.addRoofBeacon();
    this.addArrowIndicator();
    this.addSpoiler();
    this.addUnderglow();
  }

  update(input: GamepadInput, dt: number): void {
    if (input.throttle > 0) {
      this.speed += PLAYER.ACCEL * input.throttle * dt;
    } else if (input.brake > 0) {
      this.speed -= PLAYER.BRAKE_DECEL * input.brake * dt;
    } else {
      this.speed -= Math.sign(this.speed) * PLAYER.FRICTION * dt;
    }
    this.speed = Math.max(0, Math.min(PLAYER.MAX_SPEED, this.speed));
  }

  updateLane(input: GamepadInput, dt: number): void {
    this.laneChangeCooldown = Math.max(0, this.laneChangeCooldown - dt);
    if (input.steer === 0 || this.laneChangeCooldown > 0) return;

    // Dirección "derecha" relativa a la cámara (coincide con la orientación en
    // primera persona; en órbita es la derecha de la pantalla).
    const right = getActiveRig()?.getRightVector() ?? this.defaultRight();
    const isNS = this.vehicle.from === 'N' || this.vehicle.from === 'S';
    const latSign = isNS ? right.x : right.z;
    const dirSign = input.steer > 0 ? 1 : -1;
    const desired = dirSign * latSign;

    const offsets = LANES[this.vehicle.from];
    const currentOffset = offsets[this.lane];
    let target = this.lane;
    let best = -Infinity;
    for (let i = 0; i < offsets.length; i += 1) {
      if (i === this.lane) continue;
      const d = (offsets[i] - currentOffset) * desired;
      if (d > best) {
        best = d;
        target = i;
      }
    }
    if (best > 0) {
      this.lane = target;
      this.laneChangeCooldown = PLAYER.LANE_CHANGE_COOLDOWN;
    }
  }

  private defaultRight(): { x: number; z: number } {
    const dir = DIRECTION[this.vehicle.from];
    return { x: dir.dz, z: -dir.dx };
  }

  applyAssist(distanceToStopLine: number): void {
    if (this.authorized || distanceToStopLine > PLAYER.ASSIST_START_DIST) return;
    const severity = 1 - distanceToStopLine / PLAYER.ASSIST_START_DIST;
    this.speed *= 1 - severity * 0.85;
  }

  commitMove(dt: number): void {
    const dir = DIRECTION[this.vehicle.from];
    const lateral = this.currentLateral();
    const desired = this.desiredLateral();
    const nextLateral =
      lateral + clamp(desired - lateral, -PLAYER.LANE_CHANGE_SPEED * dt, PLAYER.LANE_CHANGE_SPEED * dt);
    const advance = this.speed * dt;
    const isNS = this.vehicle.from === 'N' || this.vehicle.from === 'S';
    const x = isNS ? nextLateral : this.vehicle.targetPos.x + dir.dx * advance;
    const z = isNS ? this.vehicle.targetPos.z + dir.dz * advance : nextLateral;
    this.vehicle.setTarget(x, z);
  }

  distanceToCenter(): number {
    if (this.vehicle.from === 'N' || this.vehicle.from === 'S') {
      return Math.abs(this.vehicle.targetPos.z);
    }
    return Math.abs(this.vehicle.targetPos.x);
  }

  distanceToStopLine(): number {
    return Math.abs(this.distanceToCenter() - SIM.STOP_LINE_DISTANCE);
  }

  syncVisual(dt: number): void {
    this.vehicle.syncVisual(dt);
    // Pulso del halo y la barra de techo para distinguir al jugador.
    this.pulseTimer += dt;
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTimer * 4);
    if (this.underglow) {
      const mat = this.underglow.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + pulse * 0.3;
    }
    if (this.beaconMat) {
      this.beaconMat.emissiveIntensity = 1.1 + pulse * 1.5;
    }
  }

  setState(state: VehicleState): void {
    this.vehicle.setState(state);
  }

  target(): THREE.Vector3 {
    return this.vehicle.targetPos;
  }

  private desiredLateral(): number {
    const off = laneOffset(this.vehicle.from, this.lane);
    return this.vehicle.from === 'N' || this.vehicle.from === 'S' ? off.x : off.z;
  }

  private currentLateral(): number {
    return this.vehicle.from === 'N' || this.vehicle.from === 'S'
      ? this.vehicle.targetPos.x
      : this.vehicle.targetPos.z;
  }

  private spawnPosition(from: Direction): { x: number; z: number } {
    const dir = DIRECTION[from];
    const off = laneOffset(from, 0);
    const x = off.x - dir.dx * PLAYER.SPAWN_DISTANCE;
    const z = off.z - dir.dz * PLAYER.SPAWN_DISTANCE;
    return { x, z };
  }

  private addArrowIndicator(): void {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.55, 4),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    arrow.position.set(0, 2.3, 0);
    arrow.rotation.x = Math.PI;
    this.vehicle.mesh.add(arrow);
  }

  private addRoofBeacon(): void {
    this.beaconMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.4,
    });
    const beacon = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.16, 0.32),
      this.beaconMat
    );
    beacon.position.y = 1.58;
    this.vehicle.mesh.add(beacon);
  }

  // Alerón trasero: ayuda a reconocer al jugador de perfil y desde atrás.
  private addSpoiler(): void {
    const dark = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      roughness: 0.4,
      metalness: 0.3,
    });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.38), dark);
    wing.position.set(0, 1.08, -1.05);
    this.vehicle.mesh.add(wing);
    for (const sx of [-0.52, 0.52]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.1), dark);
      support.position.set(sx, 0.92, -1.05);
      this.vehicle.mesh.add(support);
    }
  }

  // Halo cian bajo el auto: lo hace muy visible en la vista orbital.
  private addUnderglow(): void {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 3.0),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    this.underglow = glow;
    this.vehicle.mesh.add(glow);
  }
}

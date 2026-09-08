import * as THREE from 'three';
import { DIRECTION, SIM, type Direction, type VehicleState } from '../lib/constants';

export class Vehicle {
  id: string;
  from: Direction;
  state: VehicleState = 'approach';
  speed: number = SIM.APPROACH_SPEED;
  waitedSeconds = 0;
  targetPos: THREE.Vector3;
  mesh: THREE.Group;

  constructor(id: string, from: Direction, color: number) {
    this.id = id;
    this.from = from;
    this.targetPos = new THREE.Vector3();
    this.mesh = buildVehicleMesh(color);
    this.faceDirection(from);
  }

  faceDirection(from: Direction): void {
    this.mesh.rotation.y = Math.atan2(DIRECTION[from].dx, DIRECTION[from].dz);
  }

  setTarget(x: number, z: number): void {
    this.targetPos.set(x, 0, z);
  }

  setState(state: VehicleState): void {
    this.state = state;
  }

  syncVisual(dt: number): void {
    this.mesh.position.lerp(this.targetPos, Math.min(1, dt * 10));
    const beaconColor = this.state === 'crossing' ? 0x34d399 : this.state === 'queued' ? 0xf87171 : 0x445266;
    const beacon = this.mesh.userData.beacon as THREE.Mesh | undefined;
    if (beacon) {
      (beacon.material as THREE.MeshBasicMaterial).color.setHex(beaconColor);
    }
  }
}

function buildVehicleMesh(color: number): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.9, 1.15),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 })
  );
  body.position.y = 0.55;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.8 })
  );
  cabin.position.set(0, 0.95, -0.1);
  group.add(cabin);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xf87171 })
  );
  beacon.position.set(0.9, 0.95, 0);
  group.add(beacon);

  group.userData.beacon = beacon;
  return group;
}
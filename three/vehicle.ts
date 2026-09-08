import * as THREE from 'three';
import { DIRECTION, SIM, type Direction, type VehicleState } from '../lib/constants';
import { registerHeadlight } from './vehicleLights';

// ---------- Recursos compartidos (se crean una vez; no se liberan por vehículo) ----------
const BODY_GEO = new THREE.BoxGeometry(1.3, 0.7, 2.4);
const CABIN_GEO = new THREE.BoxGeometry(0.9, 0.5, 1.3);
const WHEEL_GEO = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10);
const HEAD_GEO = new THREE.BoxGeometry(0.24, 0.14, 0.1);
const TAIL_GEO = new THREE.BoxGeometry(0.24, 0.12, 0.08);
const BEACON_GEO = new THREE.SphereGeometry(0.14, 8, 8);

const bodyMats = new Map<number, THREE.MeshStandardMaterial>();

function bodyMaterialFor(color: number): THREE.MeshStandardMaterial {
  let mat = bodyMats.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.2,
    });
    bodyMats.set(color, mat);
  }
  return mat;
}

const CABIN_MAT = new THREE.MeshStandardMaterial({
  color: 0x11161d,
  roughness: 0.15,
  metalness: 0.4,
});

const WHEEL_MAT = new THREE.MeshStandardMaterial({
  color: 0x15181d,
  roughness: 0.9,
});

// Faros (el brillo y la luz real se activan con gráficos avanzados + noche).
const HEAD_MAT = new THREE.MeshStandardMaterial({
  color: 0xfff3c4,
  roughness: 0.3,
  emissive: 0xffe9b0,
  emissiveIntensity: 0,
});

const TAIL_MAT = new THREE.MeshStandardMaterial({
  color: 0x7a1212,
  roughness: 0.4,
  emissive: 0xff2222,
  emissiveIntensity: 0.8,
});

export class Vehicle {
  id: string;
  from: Direction;
  state: VehicleState = 'approach';
  speed: number = SIM.APPROACH_SPEED;
  waitedSeconds = 0;
  frozen = false;
  crashed = false;
  private blinkTimer = 0;
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
    let beaconColor: number;
    if (this.crashed) {
      this.blinkTimer += dt;
      beaconColor = Math.sin(this.blinkTimer * 18) > 0 ? 0xff4444 : 0x8a1111;
    } else {
      beaconColor = this.frozen
        ? 0x38bdf8
        : this.state === 'crossing'
          ? 0x34d399
          : this.state === 'queued'
            ? 0xf87171
            : 0x445266;
    }
    const beacon = this.mesh.userData.beacon as THREE.Mesh | undefined;
    if (beacon) {
      (beacon.material as THREE.MeshBasicMaterial).color.setHex(beaconColor);
    }
  }
}

function buildVehicleMesh(color: number): THREE.Group {
  const group = new THREE.Group();

  // Carrocería alargada en su sentido de avance (local +z).
  const body = new THREE.Mesh(BODY_GEO, bodyMaterialFor(color));
  body.position.y = 0.55;
  body.userData.shared = true;
  group.add(body);

  // Cabina con vidrios, ligeramente retrasada.
  const cabin = new THREE.Mesh(CABIN_GEO, CABIN_MAT);
  cabin.position.set(0, 1.0, -0.15);
  cabin.userData.shared = true;
  group.add(cabin);

  // Ruedas.
  for (const wx of [-0.6, 0.6]) {
    for (const wz of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.28, wz);
      wheel.userData.shared = true;
      group.add(wheel);
    }
  }

  // Faros delanteros.
  for (const hx of [-0.38, 0.38]) {
    const head = new THREE.Mesh(HEAD_GEO, HEAD_MAT);
    head.position.set(hx, 0.66, 1.22);
    head.userData.shared = true;
    group.add(head);
  }

  // Luz real delantera (ilumina el asfalto justo delante del auto).
  const headlight = new THREE.PointLight(0xfff0c0, 25, 12, 2);
  headlight.position.set(0, 0.65, 1.6);
  headlight.visible = false;
  group.add(headlight);
  group.userData.unregisterHeadlight = registerHeadlight(HEAD_MAT, headlight);

  // Luces traseras.
  for (const tx of [-0.38, 0.38]) {
    const tail = new THREE.Mesh(TAIL_GEO, TAIL_MAT);
    tail.position.set(tx, 0.68, -1.22);
    tail.userData.shared = true;
    group.add(tail);
  }

  // Baliza de estado: geometría compartida, material propio (color dinámico).
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });
  const beacon = new THREE.Mesh(BEACON_GEO, beaconMat);
  beacon.position.set(0, 1.4, 0);
  beacon.userData.shared = true;
  group.add(beacon);

  group.userData.beacon = beacon;
  group.userData.beaconMat = beaconMat;
  return group;
}
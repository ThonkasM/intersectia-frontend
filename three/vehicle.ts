import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  DIRECTION,
  SIM,
  type Direction,
  type Turn,
  type VehicleKind,
  type VehicleState,
} from '../lib/constants';
import { registerHeadlight } from './vehicleLights';

// ---------- Recursos compartidos (se crean una vez; no se liberan por vehículo) ----------
const BODY_GEO = new THREE.BoxGeometry(1.3, 0.7, 2.4);
const CABIN_GEO = new THREE.BoxGeometry(0.9, 0.5, 1.3);
const WHEEL_GEO = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10);
const HEAD_GEO = new THREE.BoxGeometry(0.24, 0.14, 0.1);
const TAIL_GEO = new THREE.BoxGeometry(0.24, 0.12, 0.08);
const BEACON_GEO = new THREE.SphereGeometry(0.14, 8, 8);

// Ambulancia: caja más alta y ancha, con franja y cruz rojas.
const AMB_BODY_GEO = new THREE.BoxGeometry(1.4, 1.0, 2.6);
const AMB_WINDSHIELD_GEO = new THREE.BoxGeometry(1.15, 0.5, 0.08);
const SIREN_BASE_GEO = new THREE.BoxGeometry(1.0, 0.1, 0.3);
const SIREN_LENS_GEO = new THREE.BoxGeometry(0.42, 0.16, 0.24);

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

const AMB_BODY_MAT = new THREE.MeshStandardMaterial({
  color: 0xf2f4f7,
  roughness: 0.5,
  metalness: 0.1,
});

const AMB_STRIPE_MAT = new THREE.MeshStandardMaterial({
  color: 0xd42a2a,
  roughness: 0.5,
});

// Guiñadores (intermitentes): una tira por lado con la luz delantera y trasera
// fusionadas; se muestran/ocultan alternando para parpadear. Material sin
// iluminación (lámpara) para que se lea siempre, de día y de noche.
const INDICATOR_MAT = new THREE.MeshBasicMaterial({
  color: 0xffa21e,
  toneMapped: false,
});

function buildSideIndicator(sign: number): THREE.BufferGeometry {
  const front = new THREE.BoxGeometry(0.24, 0.16, 0.08);
  front.translate(sign * 0.68, 0.62, 1.2);
  const rear = new THREE.BoxGeometry(0.24, 0.16, 0.08);
  rear.translate(sign * 0.68, 0.62, -1.2);
  const merged = mergeGeometries([front, rear], false);
  front.dispose();
  rear.dispose();
  return merged ?? new THREE.BoxGeometry(0.24, 0.16, 0.08);
}

// La nariz del auto es local +z y arriba +y: el lado derecho del conductor es
// local -x. El guiñador "derecho" va en -x y el "izquierdo" en +x.
const INDICATOR_RIGHT_GEO = buildSideIndicator(-1);
const INDICATOR_LEFT_GEO = buildSideIndicator(1);

// Franja lateral roja de la ambulancia (una barra por lado, fusionadas).
function buildSideStripe(): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  for (const sx of [-0.71, 0.71]) {
    const bar = new THREE.BoxGeometry(0.04, 0.18, 2.5);
    bar.translate(sx, 0.95, 0);
    geos.push(bar);
  }
  const merged = mergeGeometries(geos, false);
  for (const geo of geos) geo.dispose();
  return merged ?? new THREE.BoxGeometry(0.04, 0.18, 2.5);
}

// Cruz roja en cada lateral (barra vertical + horizontal, fusionadas).
function buildSideCross(): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  for (const sx of [-0.71, 0.71]) {
    const vertical = new THREE.BoxGeometry(0.04, 0.44, 0.14);
    vertical.translate(sx, 0.72, 0.42);
    const horizontal = new THREE.BoxGeometry(0.04, 0.14, 0.44);
    horizontal.translate(sx, 0.72, 0.42);
    geos.push(vertical, horizontal);
  }
  const merged = mergeGeometries(geos, false);
  for (const geo of geos) geo.dispose();
  return merged ?? new THREE.BoxGeometry(0.04, 0.44, 0.14);
}

const AMB_STRIPE_GEO = buildSideStripe();
const AMB_CROSS_GEO = buildSideCross();

function shortestAngle(current: number, target: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function addWheels(group: THREE.Group): void {
  for (const wx of [-0.6, 0.6]) {
    for (const wz of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.28, wz);
      wheel.userData.shared = true;
      group.add(wheel);
    }
  }
}

function addHeadlights(group: THREE.Group, x: number, y: number, z: number): void {
  for (const hx of [-x, x]) {
    const head = new THREE.Mesh(HEAD_GEO, HEAD_MAT);
    head.position.set(hx, y, z);
    head.userData.shared = true;
    group.add(head);
  }
}

function addTailLights(group: THREE.Group, x: number, y: number, z: number): void {
  for (const tx of [-x, x]) {
    const tail = new THREE.Mesh(TAIL_GEO, TAIL_MAT);
    tail.position.set(tx, y, z);
    tail.userData.shared = true;
    group.add(tail);
  }
}

// Ancla del faro: el pool compartido de luces (vehicleLights) la sigue para
// iluminar el asfalto delante del auto sin crear/apagar luces por vehículo.
function addHeadlightAnchor(group: THREE.Group): void {
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.65, 1.6);
  group.add(anchor);
  group.userData.unregisterHeadlight = registerHeadlight(HEAD_MAT, anchor);
}

// Baliza de estado + guiñadores (comunes a todos los vehículos).
function addStateParts(group: THREE.Group, beaconY: number): void {
  const leftIndicator = new THREE.Mesh(INDICATOR_LEFT_GEO, INDICATOR_MAT);
  leftIndicator.visible = false;
  leftIndicator.userData.shared = true;
  group.add(leftIndicator);

  const rightIndicator = new THREE.Mesh(INDICATOR_RIGHT_GEO, INDICATOR_MAT);
  rightIndicator.visible = false;
  rightIndicator.userData.shared = true;
  group.add(rightIndicator);

  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });
  const beacon = new THREE.Mesh(BEACON_GEO, beaconMat);
  beacon.position.set(0, beaconY, 0);
  beacon.userData.shared = true;
  group.add(beacon);

  group.userData.beacon = beacon;
  group.userData.beaconMat = beaconMat;
  group.userData.leftIndicator = leftIndicator;
  group.userData.rightIndicator = rightIndicator;
  group.userData.ownedMaterials = [beaconMat];
}

function buildCarMesh(color: number): THREE.Group {
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

  addWheels(group);
  addHeadlights(group, 0.38, 0.66, 1.22);
  addHeadlightAnchor(group);
  addTailLights(group, 0.38, 0.68, -1.22);
  addStateParts(group, 1.4);
  return group;
}

function buildAmbulanceMesh(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(AMB_BODY_GEO, AMB_BODY_MAT);
  body.position.y = 0.75;
  body.userData.shared = true;
  group.add(body);

  const windshield = new THREE.Mesh(AMB_WINDSHIELD_GEO, CABIN_MAT);
  windshield.position.set(0, 1.05, 1.31);
  windshield.userData.shared = true;
  group.add(windshield);

  const stripe = new THREE.Mesh(AMB_STRIPE_GEO, AMB_STRIPE_MAT);
  stripe.userData.shared = true;
  group.add(stripe);

  const cross = new THREE.Mesh(AMB_CROSS_GEO, AMB_STRIPE_MAT);
  cross.userData.shared = true;
  group.add(cross);

  addWheels(group);
  addHeadlights(group, 0.45, 0.62, 1.31);
  addHeadlightAnchor(group);
  addTailLights(group, 0.45, 0.6, -1.31);

  // Sirena: base oscura + dos lentes (rojo/azul) que destellan alternados.
  const sirenBase = new THREE.Mesh(SIREN_BASE_GEO, WHEEL_MAT);
  sirenBase.position.y = 1.34;
  sirenBase.userData.shared = true;
  group.add(sirenBase);

  const sirenRedMat = new THREE.MeshStandardMaterial({
    color: 0xff3b3b,
    emissive: 0xff2b2b,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const sirenBlueMat = new THREE.MeshStandardMaterial({
    color: 0x3b7bff,
    emissive: 0x2b6bff,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const redLens = new THREE.Mesh(SIREN_LENS_GEO, sirenRedMat);
  redLens.position.set(-0.26, 1.4, 0);
  redLens.userData.shared = true;
  group.add(redLens);
  const blueLens = new THREE.Mesh(SIREN_LENS_GEO, sirenBlueMat);
  blueLens.position.set(0.26, 1.4, 0);
  blueLens.userData.shared = true;
  group.add(blueLens);

  addStateParts(group, 1.72);
  (group.userData.ownedMaterials as THREE.Material[]).push(
    sirenRedMat,
    sirenBlueMat,
  );
  group.userData.sirenMats = [sirenRedMat, sirenBlueMat];
  return group;
}

function buildVehicleMesh(color: number, kind: VehicleKind): THREE.Group {
  return kind === 'ambulance' ? buildAmbulanceMesh() : buildCarMesh(color);
}

export class Vehicle {
  id: string;
  from: Direction;
  kind: VehicleKind;
  state: VehicleState = 'approach';
  speed: number = SIM.APPROACH_SPEED;
  waitedSeconds = 0;
  frozen = false;
  crashed = false;
  turn: Turn = 'straight';
  private blinkTimer = 0;
  private sirenTimer = 0;
  targetPos: THREE.Vector3;
  mesh: THREE.Group;

  constructor(
    id: string,
    from: Direction,
    color: number,
    kind: VehicleKind = 'car',
  ) {
    this.id = id;
    this.from = from;
    this.kind = kind;
    this.targetPos = new THREE.Vector3();
    this.mesh = buildVehicleMesh(color, kind);
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
    const dx = this.targetPos.x - this.mesh.position.x;
    const dz = this.targetPos.z - this.mesh.position.z;
    this.mesh.position.lerp(this.targetPos, Math.min(1, dt * 10));
    // Orienta el vehiculo segun su direccion de avance: hace que gire de forma
    // suave al tomar una curva en la interseccion.
    if (dx * dx + dz * dz > 0.0004) {
      const desired = Math.atan2(dx, dz);
      this.mesh.rotation.y +=
        shortestAngle(this.mesh.rotation.y, desired) * Math.min(1, dt * 6);
    }
    let beaconColor: number;
    if (this.crashed) {
      this.blinkTimer += dt;
      beaconColor = Math.sin(this.blinkTimer * 18) > 0 ? 0xff4444 : 0x8a1111;
    } else {
      beaconColor = this.frozen
        ? 0x38bdf8
        : this.state === 'crossing'
          ? 0x34d399
          : this.state === 'success'
            ? 0xfacc15
            : this.state === 'queued'
              ? 0xf87171
              : 0x445266;
    }
    const beacon = this.mesh.userData.beacon as THREE.Mesh | undefined;
    if (beacon) {
      (beacon.material as THREE.MeshBasicMaterial).color.setHex(beaconColor);
    }

    // Sirena de ambulancia: lentes rojo/azul destellando alternados.
    if (this.kind === 'ambulance') {
      this.sirenTimer += dt;
      const flash = Math.sin(this.sirenTimer * 12) > 0;
      const siren = this.mesh.userData.sirenMats as
        | [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]
        | undefined;
      if (siren) {
        siren[0].emissiveIntensity = flash ? 2.4 : 0.15;
        siren[1].emissiveIntensity = flash ? 0.15 : 2.4;
      }
    }

    // Guiñador: parpadea en el lado del giro previsto (aproximación/cola/cruce).
    this.blinkTimer += dt;
    const blinkOn = Math.sin((this.blinkTimer * Math.PI * 2) / 0.7) > 0;
    const turning = this.state !== 'gone' && this.turn !== 'straight';
    const left = this.mesh.userData.leftIndicator as THREE.Mesh | undefined;
    const right = this.mesh.userData.rightIndicator as THREE.Mesh | undefined;
    if (left) left.visible = turning && this.turn === 'left' && blinkOn;
    if (right) right.visible = turning && this.turn === 'right' && blinkOn;
  }
}

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DIRECTION } from '../lib/constants';
import type { Vehicle } from './vehicle';

export type CameraMode = 'orbit' | 'firstPerson';

// Capa Three.js usada por las burbujas de estado: se ocultan en el minimapa.
export const BUBBLE_LAYER = 1;

const MINIMAP_SIZE = 220;
const MINIMAP_MARGIN = 16;
const SATELLITE_HEIGHT = 150;
const SAT_VIEW_SIZE = 130;
const FOLLOW_BACK = 9;
const FOLLOW_HEIGHT = 4.5;
const LOOK_AHEAD = 8;
const ORBIT_POS = { x: 34, y: 30, z: 34 };

let activeRig: CameraRig | null = null;

export function setActiveRig(rig: CameraRig | null): void {
  activeRig = rig;
}

export function getActiveRig(): CameraRig | null {
  return activeRig;
}

export class CameraRig {
  readonly mainCamera: THREE.PerspectiveCamera;
  readonly satelliteCamera: THREE.OrthographicCamera;
  mode: CameraMode = 'orbit';
  private readonly orbitControls: OrbitControls;
  private follow: Vehicle | null = null;

  constructor(container: HTMLElement) {
    const aspect = container.clientWidth / container.clientHeight;

    this.mainCamera = new THREE.PerspectiveCamera(42, aspect, 0.1, 500);
    this.mainCamera.position.set(34, 30, 34);
    this.mainCamera.layers.enable(BUBBLE_LAYER);

    // Cámara satelital ortográfica: vista cenital real (minimapa tipo mapa de satélite).
    const half = SAT_VIEW_SIZE / 2;
    this.satelliteCamera = new THREE.OrthographicCamera(
      -half,
      half,
      half,
      -half,
      0.1,
      400,
    );
    this.satelliteCamera.position.set(0, SATELLITE_HEIGHT, 0.001);
    this.satelliteCamera.lookAt(0, 0, 0);

    this.orbitControls = new OrbitControls(this.mainCamera, container);
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 15;
    this.orbitControls.maxDistance = 250;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.08;
  }

  setMode(mode: CameraMode): void {
    if (mode === 'orbit' && this.mode === 'firstPerson') {
      this.returnToOrbit();
    }
    this.mode = mode;
  }

  update(getPlayer: () => Vehicle | null): void {
    if (this.mode === 'firstPerson') {
      this.follow = getPlayer();
      if (this.follow) {
        this.followFirstPerson(this.follow);
        return;
      }
      this.returnToOrbit();
    }
    this.follow = null;
    this.orbitControls.update();
  }

  // Vector "derecha" de la cámara principal proyectado al plano del suelo.
  getRightVector(): { x: number; z: number } {
    this.mainCamera.updateMatrixWorld();
    const v = new THREE.Vector3().setFromMatrixColumn(
      this.mainCamera.matrixWorld,
      0,
    );
    const len = Math.hypot(v.x, v.z);
    if (len < 1e-6) return { x: 0, z: 1 };
    return { x: v.x / len, z: v.z / len };
  }

  hasFollowTarget(): boolean {
    return this.mode === 'firstPerson' && this.follow !== null;
  }

  private returnToOrbit(): void {
    this.mainCamera.position.set(ORBIT_POS.x, ORBIT_POS.y, ORBIT_POS.z);
    this.orbitControls.target.set(0, 0, 0);
    this.follow = null;
  }

  private followFirstPerson(player: Vehicle): void {
    const pos = player.mesh.position;
    const dir = DIRECTION[player.from];
    this.mainCamera.position.set(
      pos.x - dir.dx * FOLLOW_BACK,
      FOLLOW_HEIGHT,
      pos.z - dir.dz * FOLLOW_BACK,
    );
    this.mainCamera.lookAt(
      pos.x + dir.dx * LOOK_AHEAD,
      1.2,
      pos.z + dir.dz * LOOK_AHEAD,
    );

    this.satelliteCamera.position.set(
      pos.x,
      SATELLITE_HEIGHT,
      pos.z + 0.001,
    );
    this.satelliteCamera.lookAt(pos.x, 0, pos.z);
  }

  dispose(): void {
    this.orbitControls.dispose();
  }
}

export const minimapRect = {
  size: MINIMAP_SIZE,
  margin: MINIMAP_MARGIN,
};
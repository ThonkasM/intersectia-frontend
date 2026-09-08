import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DIRECTION } from '../lib/constants';
import type { Vehicle } from './vehicle';

export type CameraMode = 'orbit' | 'firstPerson';

// Capa Three.js usada por las burbujas de estado: se ocultan en el minimapa.
export const BUBBLE_LAYER = 1;

const MINIMAP_SIZE = 220;
const MINIMAP_MARGIN = 16;
const DEFAULT_VIEW = 50;
const MIN_VIEW = 16;
const MAX_VIEW = 220;
const FOLLOW_HEIGHT = 4.5;

// Rango dinámico de la cámara según velocidad del vehículo.
// Ajustá MAX_SPEED contra tu SIM real (ej. la velocidad de crossing/máxima).
const MIN_SPEED = 0;
const MAX_SPEED = 6; // <-- poné acá tu velocidad "rápida" real de SIM

const MIN_FOLLOW_BACK = 8;
const MAX_FOLLOW_BACK = 12;
const MIN_LOOK_AHEAD = 6;
const MAX_LOOK_AHEAD = 14;
const BASE_FOV = 42;
const MAX_FOV_BOOST = 8;

// Suavizado de la cámara en tercera persona (0-1). Más bajo = más flotante/cinematográfico.
const FOLLOW_POS_LERP = 0.06;
const FOLLOW_LOOKAT_LERP = 0.1;

// Suavizado del retorno a órbita.
const RETURN_LERP = 0.08;
const RETURN_SNAP_DIST = 0.05; // debajo de esto, se considera "llegó"

// Inclinación del minimapa (estilo navegador). Ángulo respecto a la horizontal.
const MINIMAP_TILT_DEG = 45;
const MINIMAP_DISTANCE = 10; // distancia de la cámara del minimapa al jugador
// % del alto total del minimapa que se ve por delante del vehículo (vs. detrás).
// Estilo GTA: el vehículo queda cerca del borde inferior, la mayoría de la
// pantalla muestra lo que hay adelante.
const MINIMAP_AHEAD_RATIO = 0.72;

const ORBIT_POS = { x: 34, y: 30, z: 34 };
const ORBIT_TARGET = { x: 0, y: 0, z: 0 };

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
  zoom = DEFAULT_VIEW;
  private readonly orbitControls: OrbitControls;
  private readonly zoomLevels: number[];
  private follow: Vehicle | null = null;
  private currentLookAt: THREE.Vector3 | null = null;
  private returning = false;

  constructor(container: HTMLElement) {
    const aspect = container.clientWidth / container.clientHeight;
    this.zoomLevels = this.buildZoomLevels();

    this.mainCamera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.1, 500);
    this.mainCamera.position.set(ORBIT_POS.x, ORBIT_POS.y, ORBIT_POS.z);
    this.mainCamera.layers.enable(BUBBLE_LAYER);

    // Cámara satelital ortográfica: minimapa inclinado (estilo navegador moderno).
    const half = this.zoom / 2;
    this.satelliteCamera = new THREE.OrthographicCamera(
      -half,
      half,
      half,
      -half,
      0.1,
      400,
    );
    this.satelliteCamera.position.set(0, 60, 0.001);
    this.satelliteCamera.lookAt(0, 0, 0);

    this.orbitControls = new OrbitControls(this.mainCamera, container);
    this.orbitControls.target.set(ORBIT_TARGET.x, ORBIT_TARGET.y, ORBIT_TARGET.z);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 15;
    this.orbitControls.maxDistance = 250;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.08;
  }

  setMode(mode: CameraMode): void {
    if (mode === 'orbit' && this.mode === 'firstPerson') {
      // Retorno suave: se resuelve gradualmente en update(), no instantáneo.
      this.returning = true;
    }
    this.mode = mode;
  }

  zoomIn(): void {
    this.zoom = Math.max(MIN_VIEW, this.zoom * 0.75);
  }

  zoomOut(): void {
    this.zoom = Math.min(MAX_VIEW, this.zoom / 0.75);
  }

  // Alterna el zoom del minimapa ciclando por los niveles predefinidos (botón Y del mando).
  toggleZoom(): void {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.zoomLevels.length; i += 1) {
      const d = Math.abs(this.zoomLevels[i] - this.zoom);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    this.zoom = this.zoomLevels[(best + 1) % this.zoomLevels.length];
  }

  private buildZoomLevels(): number[] {
    const levels: number[] = [];
    let z = DEFAULT_VIEW;
    for (;;) {
      levels.push(Math.max(MIN_VIEW, Math.round(z * 100) / 100));
      z *= 0.75;
      if (z < MIN_VIEW) break;
    }
    return levels;
  }

  getZoomState(): { value: number; min: number; max: number } {
    return { value: this.zoom, min: MIN_VIEW, max: MAX_VIEW };
  }

  update(getPlayer: () => Vehicle | null): void {
    if (this.mode === 'firstPerson') {
      this.follow = getPlayer();
      if (this.follow) {
        this.followFirstPerson(this.follow);
        return;
      }
      // Se quedó sin vehículo a seguir: iniciar retorno suave en vez de snap.
      this.returning = true;
      this.follow = null;
    }

    if (this.returning) {
      this.stepReturnToOrbit();
    }

    this.orbitControls.update();
  }

  private stepReturnToOrbit(): void {
    const targetPos = new THREE.Vector3(ORBIT_POS.x, ORBIT_POS.y, ORBIT_POS.z);
    this.lerpVec3(this.mainCamera.position, targetPos, RETURN_LERP);
    this.lerpVec3(
      this.orbitControls.target,
      new THREE.Vector3(ORBIT_TARGET.x, ORBIT_TARGET.y, ORBIT_TARGET.z),
      RETURN_LERP,
    );

    this.mainCamera.fov = THREE.MathUtils.lerp(this.mainCamera.fov, BASE_FOV, RETURN_LERP);
    this.mainCamera.updateProjectionMatrix();

    if (this.mainCamera.position.distanceTo(targetPos) < RETURN_SNAP_DIST) {
      this.mainCamera.position.copy(targetPos);
      this.orbitControls.target.set(ORBIT_TARGET.x, ORBIT_TARGET.y, ORBIT_TARGET.z);
      this.currentLookAt = null;
      this.returning = false;
    }
  }

  private lerpVec3(current: THREE.Vector3, target: THREE.Vector3, t: number): void {
    current.x += (target.x - current.x) * t;
    current.y += (target.y - current.y) * t;
    current.z += (target.z - current.z) * t;
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

  private followFirstPerson(player: Vehicle): void {
    const pos = player.mesh.position;
    const dir = DIRECTION[player.from];

    const speedFactor = THREE.MathUtils.clamp(
      (player.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED),
      0,
      1,
    );

    const followBack = THREE.MathUtils.lerp(MIN_FOLLOW_BACK, MAX_FOLLOW_BACK, speedFactor);
    const lookAhead = THREE.MathUtils.lerp(MIN_LOOK_AHEAD, MAX_LOOK_AHEAD, speedFactor);

    const desiredPos = new THREE.Vector3(
      pos.x - dir.dx * followBack,
      FOLLOW_HEIGHT,
      pos.z - dir.dz * followBack,
    );
    const desiredLookAt = new THREE.Vector3(
      pos.x + dir.dx * lookAhead,
      1.2,
      pos.z + dir.dz * lookAhead,
    );

    this.lerpVec3(this.mainCamera.position, desiredPos, FOLLOW_POS_LERP);

    if (!this.currentLookAt) this.currentLookAt = desiredLookAt.clone();
    this.lerpVec3(this.currentLookAt, desiredLookAt, FOLLOW_LOOKAT_LERP);
    this.mainCamera.lookAt(this.currentLookAt);

    this.mainCamera.fov = THREE.MathUtils.lerp(
      this.mainCamera.fov,
      BASE_FOV + speedFactor * MAX_FOV_BOOST,
      0.1,
    );
    this.mainCamera.updateProjectionMatrix();

    // Minimapa inclinado tipo navegador: el jugador queda cerca del borde
    // inferior y la cámara, situada detrás y encima, inclinada hacia su
    // frente, deja ver principalmente lo que tiene delante (el avance apunta
    // hacia "arriba" en el minimapa).
    this.satelliteCamera.up.set(0, 1, 0);
    const tilt = (MINIMAP_TILT_DEG * Math.PI) / 180;
    const height = Math.sin(tilt) * MINIMAP_DISTANCE;
    const back = Math.cos(tilt) * MINIMAP_DISTANCE;
    this.satelliteCamera.position.set(
      pos.x - dir.dx * back,
      height,
      pos.z - dir.dz * back,
    );
    this.satelliteCamera.lookAt(pos.x, 0, pos.z);

    const halfWidth = this.zoom / 2;
    const aheadSpan = this.zoom * MINIMAP_AHEAD_RATIO;
    const behindSpan = this.zoom - aheadSpan;
    this.satelliteCamera.left = -halfWidth;
    this.satelliteCamera.right = halfWidth;
    this.satelliteCamera.top = aheadSpan;
    this.satelliteCamera.bottom = -behindSpan;
    this.satelliteCamera.updateProjectionMatrix();
  }

  dispose(): void {
    this.orbitControls.dispose();
  }
}

export const minimapRect = {
  size: MINIMAP_SIZE,
  margin: MINIMAP_MARGIN,
};
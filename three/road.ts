import * as THREE from 'three';
import { getPalette, type RoadMaterials } from './theme';

const ROAD_HALF_WIDTH = 4.5;
const LANE_WIDTH = ROAD_HALF_WIDTH;
const ROAD_LENGTH = 200;
const DASH_LENGTH = 1.8;
const DASH_GAP = 6;
const DASH_WIDTH = 0.16;
const CENTER_LINE_WIDTH = 0.14;

export function buildRoad(scene: THREE.Scene): RoadMaterials {
  const p = getPalette();

  const groundMat = new THREE.MeshStandardMaterial({
    color: p.ground,
    roughness: 1,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: p.asphalt,
    roughness: 0.9,
  });

  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, ROAD_LENGTH), asphaltMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.y = 0;
  roadNS.receiveShadow = true;
  scene.add(roadNS);

  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_HALF_WIDTH * 2), asphaltMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.y = 0;
  roadEW.receiveShadow = true;
  scene.add(roadEW);

  const centerLineMat = new THREE.MeshStandardMaterial({ color: p.centerLine, roughness: 0.6 });

  const centerLineNS = new THREE.Mesh(
    new THREE.PlaneGeometry(CENTER_LINE_WIDTH, ROAD_LENGTH),
    centerLineMat,
  );
  centerLineNS.rotation.x = -Math.PI / 2;
  centerLineNS.position.y = 0.015;
  scene.add(centerLineNS);

  const centerLineEW = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_LENGTH, CENTER_LINE_WIDTH),
    centerLineMat,
  );
  centerLineEW.rotation.x = -Math.PI / 2;
  centerLineEW.position.y = 0.015;
  scene.add(centerLineEW);

  const dashMat = new THREE.MeshStandardMaterial({ color: p.laneLine, roughness: 0.7 });
  addDashedMarks(scene, ROAD_LENGTH / 2, LANE_WIDTH / 2, DASH_LENGTH, DASH_WIDTH, ROAD_HALF_WIDTH, dashMat);

  const zebraMat = new THREE.MeshStandardMaterial({ color: p.zebra, roughness: 0.95 });
  addZebraCrossings(scene, zebraMat);

  return {
    ground: groundMat,
    asphalt: asphaltMat,
    laneLine: dashMat,
    centerLine: centerLineMat,
    zebra: zebraMat,
  };
}

function addDashedMarks(
  scene: THREE.Scene,
  halfLength: number,
  offset: number,
  dashLength: number,
  dashWidth: number,
  skipHalf: number,
  dashMaterial: THREE.MeshStandardMaterial,
): void {
  const geometryNS = new THREE.PlaneGeometry(dashWidth, dashLength);
  const geometryEW = new THREE.PlaneGeometry(dashLength, dashWidth);

  for (const laneX of [-offset, offset]) {
    for (let z = -halfLength; z <= halfLength; z += DASH_GAP) {
      if (Math.abs(z) < skipHalf) continue;
      const dash = new THREE.Mesh(geometryNS, dashMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(laneX, 0.015, z);
      scene.add(dash);
    }
  }

  for (const laneZ of [-offset, offset]) {
    for (let x = -halfLength; x <= halfLength; x += DASH_GAP) {
      if (Math.abs(x) < skipHalf) continue;
      const dash = new THREE.Mesh(geometryEW, dashMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.015, laneZ);
      scene.add(dash);
    }
  }
}

const STOP_LINE_DISTANCE = 10;
const INTERSECTION_HALF = 6;
const ZEBRA_STRIPE_WIDTH = 0.5;
const ZEBRA_STRIPE_GAP = 1.3;

// Pasos de cebra en los 4 accesos: una franja angosta que va desde el borde del
// nodo (INTERSECTION_HALF) hasta la línea de detención (STOP_LINE_DISTANCE).
function addZebraCrossings(scene: THREE.Scene, material: THREE.MeshStandardMaterial): void {
  const depth = STOP_LINE_DISTANCE - INTERSECTION_HALF; // 4
  const center = INTERSECTION_HALF + depth / 2; // 8
  const offsets: number[] = [];
  for (let c = -3.9; c <= 3.9; c += ZEBRA_STRIPE_GAP) offsets.push(c);

  // Calles N-S: franjas que se extienden en z desde 6 hasta 10, repartidas en x.
  const geoNS = new THREE.PlaneGeometry(ZEBRA_STRIPE_WIDTH, depth);
  for (const s of [1, -1]) {
    for (const x of offsets) {
      const stripe = new THREE.Mesh(geoNS, material);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.02, s * center);
      scene.add(stripe);
    }
  }

  // Calles E-W: franjas que se extienden en x desde 6 hasta 10, repartidas en z.
  const geoEW = new THREE.PlaneGeometry(depth, ZEBRA_STRIPE_WIDTH);
  for (const s of [1, -1]) {
    for (const z of offsets) {
      const stripe = new THREE.Mesh(geoEW, material);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(s * center, 0.02, z);
      scene.add(stripe);
    }
  }
}
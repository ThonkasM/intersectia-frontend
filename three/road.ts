import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getPalette, type RoadMaterials } from './theme';

const ROAD_HALF_WIDTH = 4.5;
const LANE_WIDTH = ROAD_HALF_WIDTH;
const ROAD_LENGTH = 200;
const DASH_LENGTH = 1.8;
const DASH_GAP = 6;
const DASH_WIDTH = 0.16;
const CENTER_LINE_WIDTH = 0.14;

// Plano horizontal (mirando hacia arriba) ya rotado y trasladado, listo para
// fusionar con el resto de marcas en una sola geometria.
function horizontalPlane(
  width: number,
  height: number,
  x: number,
  z: number,
  y: number,
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, y, z);
  return geometry;
}

function mergeOrFirst(
  geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry {
  return mergeGeometries(geometries, false) ?? geometries[0];
}

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
  ground.position.y = -0.05;
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

  const centerLineMat = new THREE.MeshStandardMaterial({
    color: p.centerLine,
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const centerLines = new THREE.Mesh(
    mergeOrFirst([
      horizontalPlane(CENTER_LINE_WIDTH, ROAD_LENGTH, 0, 0, 0.015),
      horizontalPlane(ROAD_LENGTH, CENTER_LINE_WIDTH, 0, 0, 0.015),
    ]),
    centerLineMat,
  );
  scene.add(centerLines);

  const dashMat = new THREE.MeshStandardMaterial({
    color: p.laneLine,
    roughness: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const dashes = new THREE.Mesh(buildDashes(), dashMat);
  scene.add(dashes);

  const zebraMat = new THREE.MeshStandardMaterial({
    color: p.zebra,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const zebra = new THREE.Mesh(buildZebraCrossings(), zebraMat);
  scene.add(zebra);

  return {
    ground: groundMat,
    asphalt: asphaltMat,
    laneLine: dashMat,
    centerLine: centerLineMat,
    zebra: zebraMat,
  };
}

// Una sola geometria con todas las lineas discontinuas de ambos ejes.
function buildDashes(): THREE.BufferGeometry {
  const halfLength = ROAD_LENGTH / 2;
  const offset = LANE_WIDTH / 2;
  const geometries: THREE.BufferGeometry[] = [];

  for (const laneX of [-offset, offset]) {
    for (let z = -halfLength; z <= halfLength; z += DASH_GAP) {
      if (Math.abs(z) < ROAD_HALF_WIDTH) continue;
      geometries.push(horizontalPlane(DASH_WIDTH, DASH_LENGTH, laneX, z, 0.015));
    }
  }
  for (const laneZ of [-offset, offset]) {
    for (let x = -halfLength; x <= halfLength; x += DASH_GAP) {
      if (Math.abs(x) < ROAD_HALF_WIDTH) continue;
      geometries.push(horizontalPlane(DASH_LENGTH, DASH_WIDTH, x, laneZ, 0.015));
    }
  }
  return mergeOrFirst(geometries);
}

const STOP_LINE_DISTANCE = 10;
const INTERSECTION_HALF = 6;
const ZEBRA_STRIPE_WIDTH = 0.5;
const ZEBRA_STRIPE_GAP = 1.3;

// Una sola geometria con los pasos de cebra de los 4 accesos.
function buildZebraCrossings(): THREE.BufferGeometry {
  const depth = STOP_LINE_DISTANCE - INTERSECTION_HALF;
  const center = INTERSECTION_HALF + depth / 2;
  const offsets: number[] = [];
  for (let c = -3.9; c <= 3.9; c += ZEBRA_STRIPE_GAP) offsets.push(c);
  const geometries: THREE.BufferGeometry[] = [];

  for (const s of [1, -1]) {
    for (const x of offsets) {
      geometries.push(
        horizontalPlane(ZEBRA_STRIPE_WIDTH, depth, x, s * center, 0.02),
      );
    }
  }
  for (const s of [1, -1]) {
    for (const z of offsets) {
      geometries.push(
        horizontalPlane(depth, ZEBRA_STRIPE_WIDTH, s * center, z, 0.02),
      );
    }
  }
  return mergeOrFirst(geometries);
}

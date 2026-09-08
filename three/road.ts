import * as THREE from 'three';
import { SCENE_PALETTES, themeBridge } from './theme';

const ROAD_HALF_WIDTH = 4.5;
const LANE_WIDTH = ROAD_HALF_WIDTH;
const ROAD_LENGTH = 200;
const DASH_LENGTH = 1.8;
const DASH_GAP = 6;
const DASH_WIDTH = 0.16;
const CENTER_LINE_WIDTH = 0.14;

export type RoadMaterials = {
  ground: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  centerLine: THREE.MeshStandardMaterial;
  dash: THREE.MeshStandardMaterial;
};

export function buildRoad(scene: THREE.Scene): RoadMaterials {
  const palette = SCENE_PALETTES[themeBridge.current];

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: palette.ground,
    roughness: 1,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);

  const asphaltMaterial = new THREE.MeshStandardMaterial({
    color: palette.asphalt,
    roughness: 0.9,
  });

  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, ROAD_LENGTH), asphaltMaterial);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.y = 0;
  scene.add(roadNS);

  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_HALF_WIDTH * 2), asphaltMaterial);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.y = 0;
  scene.add(roadEW);

  const centerLineMaterial = new THREE.MeshStandardMaterial({ color: palette.centerLine, roughness: 0.6 });

  const centerLineNS = new THREE.Mesh(
    new THREE.PlaneGeometry(CENTER_LINE_WIDTH, ROAD_LENGTH),
    centerLineMaterial
  );
  centerLineNS.rotation.x = -Math.PI / 2;
  centerLineNS.position.y = 0.015;
  scene.add(centerLineNS);

  const centerLineEW = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_LENGTH, CENTER_LINE_WIDTH),
    centerLineMaterial
  );
  centerLineEW.rotation.x = -Math.PI / 2;
  centerLineEW.position.y = 0.015;
  scene.add(centerLineEW);

  const dashMaterial = new THREE.MeshStandardMaterial({ color: palette.dash, roughness: 0.7 });

  addDashedMarks(scene, ROAD_LENGTH / 2, LANE_WIDTH / 2, DASH_LENGTH, DASH_WIDTH, ROAD_HALF_WIDTH, dashMaterial);

  return {
    ground: groundMaterial,
    asphalt: asphaltMaterial,
    centerLine: centerLineMaterial,
    dash: dashMaterial,
  };
}

function addDashedMarks(
  scene: THREE.Scene,
  halfLength: number,
  offset: number,
  dashLength: number,
  dashWidth: number,
  skipHalf: number,
  dashMaterial: THREE.MeshStandardMaterial
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

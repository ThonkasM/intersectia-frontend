import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getSceneTheme, onThemeChange, type SceneTheme } from './theme';

let advanced = false;
let ambient = false;
let lighting = false;
let shadow = false;
let pedestrians = false;
let trees = false;
const listeners: (() => void)[] = [];

function notify(): void {
  for (const fn of listeners) fn();
}

export function setAdvancedGraphics(v: boolean): void {
  advanced = v;
  notify();
}
export function isAdvancedGraphicsOn(): boolean {
  return advanced;
}

// Efectos ambientales (cielo: sol/nubes o luna/estrellas).
export function setAmbientEffects(v: boolean): void {
  ambient = v;
  notify();
}
export function isAmbientEffectsOn(): boolean {
  return ambient;
}

// Iluminación de faros de vehículos y farolas.
export function setLightingEffects(v: boolean): void {
  lighting = v;
  notify();
}
export function isLightingEffectsOn(): boolean {
  return lighting;
}

// Sombras estáticas del entorno (casas, faroles, etc.).
export function setShadows(v: boolean): void {
  shadow = v;
  notify();
}
export function isShadowsOn(): boolean {
  return shadow;
}

// Peatones en el entorno (caminan por el césped, charlan en las bancas).
export function setPedestrians(v: boolean): void {
  pedestrians = v;
  notify();
}
export function isPedestriansOn(): boolean {
  return pedestrians;
}

// Árboles y palmeras del entorno.
export function setTrees(v: boolean): void {
  trees = v;
  notify();
}
export function isTreesOn(): boolean {
  return trees;
}

export function onGraphicsChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export interface NeighborhoodHandle {
  setTheme(theme: SceneTheme): void;
  dispose(): void;
}

export interface TreesHandle {
  setTheme(theme: SceneTheme): void;
  dispose(): void;
}

const GRASS_THEME: Record<SceneTheme, number> = {
  dark: 0x234a2b,
  light: 0x9ccb7a,
};

const CANOPY_THEME: Record<SceneTheme, number> = {
  dark: 0x2f6b3f,
  light: 0x7bbf6a,
};

const HOUSE_COLORS = [0xb08060, 0xa89070, 0x9aa7b4, 0xc09868, 0x8a7d68];

// Copia una geometría aplicando una matriz (rotación + traslación) para poder
// fusionar muchas piezas en una sola geometría.
function bake(
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
): THREE.BufferGeometry {
  const clone = geo.clone();
  clone.applyMatrix4(matrix);
  return clone;
}

function partMatrix(
  x: number,
  y: number,
  z: number,
  rotationY = 0,
): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationY(rotationY).setPosition(x, y, z);
}

// Fusiona una lista de geometrías ya transformadas en un único mesh. Devuelve
// null si la lista está vacía.
function mergedMesh(
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  options: { castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.Mesh | null {
  if (geometries.length === 0) return null;
  const merged = mergeGeometries(geometries, false) ?? geometries[0];
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  return mesh;
}

export function buildNeighborhood(scene: THREE.Scene): NeighborhoodHandle {
  const group = new THREE.Group();
  scene.add(group);

  const disposables: THREE.BufferGeometry[] = [];

  // Césped en los 4 cuadrantes (una sola geometría fusionada).
  const grassGeo = new THREE.PlaneGeometry(190, 190);
  const grassMat = new THREE.MeshStandardMaterial({
    color: GRASS_THEME[getSceneTheme()],
    roughness: 1,
  });
  const grassParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const geo = grassGeo.clone();
      geo.rotateX(-Math.PI / 2);
      geo.translate(sx * 102, -0.005, sz * 102);
      grassParts.push(geo);
    }
  }
  const grass = mergedMesh(grassParts, grassMat, { receiveShadow: true });
  if (grass) group.add(grass);

  // Casas: se fusionan por material (cuerpo por color, techo, puerta, ventanas).
  const houseBodyGeo = new THREE.BoxGeometry(6, 3, 5);
  const houseRoofGeo = new THREE.ConeGeometry(4.6, 2.2, 4);
  const houseDoorGeo = new THREE.BoxGeometry(1, 1.8, 0.1);
  const windowGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
  const houseBodyMats = HOUSE_COLORS.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
  );
  const houseRoofMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 });
  const houseDoorMat = new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.9 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1a2634,
    roughness: 0.4,
    emissive: 0xffd9a0,
    emissiveIntensity: 0,
  });

  const housePositions: [number, number][] = [
    [28, -22], [40, -34], [24, -42],
    [-28, -22], [-40, -34], [-24, -42],
    [28, 22], [40, 34], [24, 42],
    [-28, 22], [-40, 34], [-24, 42],
  ];
  const bodiesByColor: THREE.BufferGeometry[][] = HOUSE_COLORS.map(() => []);
  const roofParts: THREE.BufferGeometry[] = [];
  const doorParts: THREE.BufferGeometry[] = [];
  const windowParts: THREE.BufferGeometry[] = [];

  housePositions.forEach(([hx, hz], i) => {
    const rotY = Math.atan2(hx, hz) + Math.PI;
    const base = partMatrix(hx, 0, hz, rotY);
    bodiesByColor[i % houseBodyMats.length].push(
      bake(houseBodyGeo, base.clone().multiply(partMatrix(0, 1.5, 0))),
    );
    roofParts.push(
      bake(
        houseRoofGeo,
        base.clone().multiply(partMatrix(0, 4.1, 0, Math.PI / 4)),
      ),
    );
    for (const wx of [-1.4, 1.4]) {
      windowParts.push(bake(windowGeo, base.clone().multiply(partMatrix(wx, 1.8, 2.51))));
    }
    doorParts.push(bake(houseDoorGeo, base.clone().multiply(partMatrix(0, 0.9, 2.51))));
  });

  bodiesByColor.forEach((parts, i) => {
    const mesh = mergedMesh(parts, houseBodyMats[i], { castShadow: true });
    if (mesh) group.add(mesh);
  });
  const roof = mergedMesh(roofParts, houseRoofMat, { castShadow: true });
  if (roof) group.add(roof);
  const doors = mergedMesh(doorParts, houseDoorMat);
  if (doors) group.add(doors);
  const windows = mergedMesh(windowParts, windowMat);
  if (windows) group.add(windows);

  // Bancas (una sola geometría, material de madera).
  const seatGeo = new THREE.BoxGeometry(2, 0.12, 0.6);
  const backGeo = new THREE.BoxGeometry(2, 0.5, 0.1);
  const legGeo = new THREE.BoxGeometry(0.12, 0.55, 0.5);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.8 });
  const benchParts: THREE.BufferGeometry[] = [];
  for (const [bx, bz] of [[14, 14], [-14, 14], [14, -14], [-14, -14]] as [number, number][]) {
    const base = partMatrix(bx, 0, bz, Math.atan2(bx, bz) + Math.PI / 2);
    benchParts.push(bake(seatGeo, base.clone().multiply(partMatrix(0, 0.55, 0))));
    benchParts.push(bake(backGeo, base.clone().multiply(partMatrix(0, 0.85, -0.3))));
    for (const lx of [-0.8, 0.8]) {
      benchParts.push(bake(legGeo, base.clone().multiply(partMatrix(lx, 0.27, 0))));
    }
  }
  const benches = mergedMesh(benchParts, woodMat, { castShadow: true });
  if (benches) group.add(benches);

  // Farolas: postes y cabezas fusionados; solo las 4 esquinas llevan luz real.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3c4654, roughness: 0.6 });
  const headGeo = new THREE.SphereGeometry(0.35, 12, 10);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x2a3340,
    roughness: 0.5,
    emissive: 0xffd9a0,
    emissiveIntensity: 0,
  });
  const lampLights: THREE.PointLight[] = [];

  const roadLampSpots: [number, number][] = [];
  for (const off of [-7, 7]) {
    for (const p of [-55, 35]) {
      roadLampSpots.push([off, p]);
      roadLampSpots.push([p, off]);
    }
  }
  const cornerLampSpots: [number, number][] = [[9, 9], [-9, 9], [9, -9], [-9, -9]];
  const allLampSpots = [...roadLampSpots, ...cornerLampSpots];

  const poleParts: THREE.BufferGeometry[] = [];
  const headParts: THREE.BufferGeometry[] = [];
  for (const [lx, lz] of allLampSpots) {
    const base = partMatrix(lx, 0, lz);
    poleParts.push(bake(poleGeo, base.clone().multiply(partMatrix(0, 2.5, 0))));
    headParts.push(bake(headGeo, base.clone().multiply(partMatrix(0, 5, 0))));
  }
  const poles = mergedMesh(poleParts, poleMat, { castShadow: true });
  if (poles) group.add(poles);
  const heads = mergedMesh(headParts, headMat);
  if (heads) group.add(heads);

  for (const [lx, lz] of cornerLampSpots) {
    const light = new THREE.PointLight(0xffc47a, 40, 22, 2);
    light.position.set(lx, 4.6, lz);
    light.visible = false;
    group.add(light);
    lampLights.push(light);
  }

  disposables.push(grassGeo, houseBodyGeo, houseRoofGeo, houseDoorGeo, windowGeo, seatGeo, backGeo, legGeo, poleGeo, headGeo);

  const applyTheme = (theme: SceneTheme): void => {
    grassMat.color.setHex(GRASS_THEME[theme]);
    const lit = theme === 'dark' && isLightingEffectsOn();
    if (lit) {
      headMat.emissive.setHex(0xffd9a0);
      headMat.emissiveIntensity = 1.8;
    } else {
      headMat.emissive.setHex(0x000000);
      headMat.emissiveIntensity = 0;
    }
    for (const l of lampLights) {
      l.visible = lit;
    }
    windowMat.emissiveIntensity = theme === 'dark' ? 0.9 : 0;
  };

  applyTheme(getSceneTheme());
  const unsub = onThemeChange(applyTheme);
  const unsubGraphics = onGraphicsChange(() => applyTheme(getSceneTheme()));

  return {
    setTheme: applyTheme,
    dispose(): void {
      unsub();
      unsubGraphics();
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        } else if (obj instanceof THREE.PointLight) {
          obj.dispose();
        }
      });
      for (const geo of disposables) geo.dispose();
      for (const mat of [
        grassMat,
        ...houseBodyMats,
        houseRoofMat,
        houseDoorMat,
        windowMat,
        woodMat,
        poleMat,
        headMat,
      ]) {
        mat.dispose();
      }
      scene.remove(group);
    },
  };
}

// Árboles y palmeras: troncos y copas/frondas fusionados por material.
export function buildTrees(scene: THREE.Scene): TreesHandle {
  const group = new THREE.Group();
  scene.add(group);

  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8);
  const canopyGeo = new THREE.SphereGeometry(1.6, 10, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: CANOPY_THEME[getSceneTheme()],
    roughness: 1,
  });

  const treeSpots: [number, number][] = [
    [30, 18], [46, 30], [18, 46],
    [-30, 18], [-46, 30], [-18, 46],
    [30, -18], [46, -30], [18, -46],
    [-30, -18], [-46, -30], [-18, -46],
  ];
  const treeTrunks: THREE.BufferGeometry[] = [];
  const treeCanopies: THREE.BufferGeometry[] = [];
  for (const [tx, tz] of treeSpots) {
    treeTrunks.push(bake(trunkGeo, partMatrix(tx, 1.1, tz)));
    treeCanopies.push(bake(canopyGeo, partMatrix(tx, 2.6, tz)));
  }
  const trunks = mergedMesh(treeTrunks, trunkMat, { castShadow: true });
  if (trunks) group.add(trunks);
  const canopies = mergedMesh(treeCanopies, canopyMat, { castShadow: true });
  if (canopies) group.add(canopies);

  // Palmeras a lo largo de las veredas.
  const palmTrunkGeo = buildPalmTrunkMerged();
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x9c7a52, roughness: 0.9 });
  const frondGeo = new THREE.BoxGeometry(0.12, 0.14, 2.6);
  const frondMat = new THREE.MeshStandardMaterial({
    color: CANOPY_THEME[getSceneTheme()],
    roughness: 1,
  });
  const frondsMerged = buildFrondsMerged(frondGeo);

  const palmSpots: [number, number][] = [
    [7.5, -70], [-7.5, -25], [7.5, 20], [-7.5, 65],
    [-70, 7.5], [-25, -7.5], [20, 7.5], [65, -7.5],
  ];
  const palmTrunks: THREE.BufferGeometry[] = [];
  const palmFronds: THREE.BufferGeometry[] = [];
  for (const [px, pz] of palmSpots) {
    const base = partMatrix(px, 0, pz);
    palmTrunks.push(bake(palmTrunkGeo, base));
    palmFronds.push(bake(frondsMerged, base.clone()));
  }
  const palms = mergedMesh(palmTrunks, palmTrunkMat, { castShadow: true });
  if (palms) group.add(palms);
  const palmsFronds = mergedMesh(palmFronds, frondMat, { castShadow: true });
  if (palmsFronds) group.add(palmsFronds);

  const applyTheme = (theme: SceneTheme): void => {
    canopyMat.color.setHex(CANOPY_THEME[theme]);
    frondMat.color.setHex(CANOPY_THEME[theme]);
  };
  applyTheme(getSceneTheme());
  const unsub = onThemeChange(applyTheme);

  return {
    setTheme: applyTheme,
    dispose(): void {
      unsub();
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      for (const geo of [trunkGeo, canopyGeo, palmTrunkGeo, frondGeo, frondsMerged]) {
        geo.dispose();
      }
      trunkMat.dispose();
      canopyMat.dispose();
      palmTrunkMat.dispose();
      frondMat.dispose();
      scene.remove(group);
    },
  };
}

// Tronco de palmera con leve curva: 3 segmentos inclinados fusionados.
function buildPalmTrunkMerged(): THREE.BufferGeometry {
  const segGeo = new THREE.CylinderGeometry(0.2, 0.32, 1.5, 8);
  const segs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i += 1) {
    const geo = segGeo.clone();
    const tilt = (i - 1) * 0.14;
    const m = new THREE.Matrix4()
      .makeRotationZ(tilt)
      .setPosition(0, 0.75 + i * 1.45, 0);
    geo.applyMatrix4(m);
    segs.push(geo);
  }
  const merged = mergeGeometries(segs);
  segGeo.dispose();
  if (merged) {
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    return merged;
  }
  return new THREE.CylinderGeometry(0.2, 0.32, 4.5, 8);
}

// Une todas las frondas de una palmera en una sola geometría.
function buildFrondsMerged(frondGeo: THREE.BoxGeometry): THREE.BufferGeometry {
  const count = 8;
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i += 1) {
    const geo = frondGeo.clone();
    const angle = (i / count) * Math.PI * 2;
    const m = new THREE.Matrix4()
      .makeRotationY(angle)
      .multiply(new THREE.Matrix4().makeRotationZ(-0.85))
      .setPosition(0, 3.4, 0);
    geo.applyMatrix4(m);
    geos.push(geo);
  }
  const merged = mergeGeometries(geos);
  if (merged) {
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    return merged;
  }
  return frondGeo.clone();
}

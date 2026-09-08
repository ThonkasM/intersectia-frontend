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

export function buildNeighborhood(scene: THREE.Scene): NeighborhoodHandle {
  const group = new THREE.Group();
  scene.add(group);

  // Geometrías/materiales compartidos para reducir memoria y cambios de estado.
  const grassGeo = new THREE.PlaneGeometry(190, 190);
  const grassMat = new THREE.MeshStandardMaterial({
    color: GRASS_THEME[getSceneTheme()],
    roughness: 1,
  });

  // Césped en los 4 cuadrantes alrededor del cruce.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(sx * 102, -0.005, sz * 102);
      grass.receiveShadow = true;
      group.add(grass);
    }
  }

  // Casas alrededor (comparten geometrías; un material por color).
  const houseBodyGeo = new THREE.BoxGeometry(6, 3, 5);
  const houseRoofGeo = new THREE.ConeGeometry(4.6, 2.2, 4);
  const houseDoorGeo = new THREE.BoxGeometry(1, 1.8, 0.1);
  const windowGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
  const houseBodyMats = HOUSE_COLORS.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
  );
  const houseRoofMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 });
  const houseDoorMat = new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.9 });

  // Material compartido de ventanas (brilla de noche, se apaga de día).
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
  for (let i = 0; i < housePositions.length; i += 1) {
    const [hx, hz] = housePositions[i];
    const house = buildHouse(
      houseBodyGeo,
      houseRoofGeo,
      houseDoorGeo,
      windowGeo,
      houseBodyMats[i % houseBodyMats.length],
      houseRoofMat,
      houseDoorMat,
      windowMat,
    );
    house.position.set(hx, 0, hz);
    house.rotation.y = Math.atan2(hx, hz) + Math.PI;
    group.add(house);
  }

  // Bancas cerca de las esquinas (comparten geometrías y material).
  const seatGeo = new THREE.BoxGeometry(2, 0.12, 0.6);
  const backGeo = new THREE.BoxGeometry(2, 0.5, 0.1);
  const legGeo = new THREE.BoxGeometry(0.12, 0.55, 0.5);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.8 });
  for (const [bx, bz] of [[14, 14], [-14, 14], [14, -14], [-14, -14]] as [number, number][]) {
    const bench = buildBench(seatGeo, backGeo, legGeo, woodMat);
    bench.position.set(bx, 0, bz);
    bench.rotation.y = Math.atan2(bx, bz) + Math.PI / 2;
    group.add(bench);
  }

  // Farolas: comparten poste/cabeza; solo las de las esquinas llevan luz real
  // (reducir PointLights mejora el rendimiento del shader).
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
      roadLampSpots.push([off, p]); // calles N-S
      roadLampSpots.push([p, off]); // calles E-W
    }
  }
  for (const [lx, lz] of roadLampSpots) {
    const lamp = buildLamp(poleGeo, poleMat, headGeo, headMat, false);
    lamp.mesh.position.set(lx, 0, lz);
    group.add(lamp.mesh);
  }

  // Farolas en las 4 esquinas de la intersección (iluminan los pasos de cebra).
  for (const [lx, lz] of [[9, 9], [-9, 9], [9, -9], [-9, -9]] as [number, number][]) {
    const lamp = buildLamp(poleGeo, poleMat, headGeo, headMat, true);
    lamp.mesh.position.set(lx, 0, lz);
    group.add(lamp.mesh);
    if (lamp.light) lampLights.push(lamp.light);
  }

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
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) m.dispose();
        } else if (obj instanceof THREE.PointLight) {
          obj.dispose();
        }
      });
      scene.remove(group);
    },
  };
}

// Árboles regulares en los cuadrantes y palmeras junto a las veredas.
// Geometrías y materiales compartidos (y frondas de palmera fusionadas en un
// solo mesh) para mantener bajo el costo.
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
  for (const [tx, tz] of treeSpots) {
    const tree = buildTree(trunkGeo, canopyGeo, trunkMat, canopyMat);
    tree.position.set(tx, 0, tz);
    group.add(tree);
  }

  // Palmeras a lo largo de las veredas (fuera de la calzada, junto a las farolas).
  const palmTrunkGeo = buildPalmTrunkMerged();
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x9c7a52, roughness: 0.9 });
  const frondGeo = new THREE.BoxGeometry(0.12, 0.14, 2.6);
  const frondMat = new THREE.MeshStandardMaterial({
    color: CANOPY_THEME[getSceneTheme()],
    roughness: 1,
  });
  const frondsMerged = buildFrondsMerged(frondGeo);

  const palmSpots: [number, number][] = [
    // Distribución alternada a lo largo de ambas calles (evita farolas y bancas).
    [7.5, -70],
    [-7.5, -25],
    [7.5, 20],
    [-7.5, 65],
    [-70, 7.5],
    [-25, -7.5],
    [20, 7.5],
    [65, -7.5],
  ];
  for (const [px, pz] of palmSpots) {
    const palm = buildPalm(palmTrunkGeo, palmTrunkMat, frondsMerged, frondMat);
    palm.position.set(px, 0, pz);
    group.add(palm);
  }

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
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) m.dispose();
        }
      });
      scene.remove(group);
    },
  };
}

// Tronco de palmera con leve curva: 3 segmentos inclinados fusionados (1 mesh).
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
  if (merged) {
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    return merged;
  }
  return segGeo;
}

// Une todas las frondas de una palmera en una sola geometría (1 mesh por palmera).
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

function buildPalm(
  trunkGeo: THREE.BufferGeometry,
  trunkMat: THREE.MeshStandardMaterial,
  frondsGeo: THREE.BufferGeometry,
  frondMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  g.add(trunk);

  const fronds = new THREE.Mesh(frondsGeo, frondMat);
  fronds.castShadow = true;
  g.add(fronds);

  return g;
}

function buildHouse(
  bodyGeo: THREE.BoxGeometry,
  roofGeo: THREE.ConeGeometry,
  doorGeo: THREE.BoxGeometry,
  windowGeo: THREE.BoxGeometry,
  bodyMat: THREE.MeshStandardMaterial,
  roofMat: THREE.MeshStandardMaterial,
  doorMat: THREE.MeshStandardMaterial,
  windowMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.5;
  body.castShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3 + 1.1;
  roof.castShadow = true;
  g.add(roof);

  for (const wx of [-1.4, 1.4]) {
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(wx, 1.8, 2.51);
    g.add(win);
  }

  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.9, 2.51);
  g.add(door);

  return g;
}

function buildBench(
  seatGeo: THREE.BoxGeometry,
  backGeo: THREE.BoxGeometry,
  legGeo: THREE.BoxGeometry,
  woodMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();

  const seat = new THREE.Mesh(seatGeo, woodMat);
  seat.position.y = 0.55;
  seat.castShadow = true;
  g.add(seat);

  const back = new THREE.Mesh(backGeo, woodMat);
  back.position.set(0, 0.85, -0.3);
  back.castShadow = true;
  g.add(back);

  for (const lx of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0.27, 0);
    leg.castShadow = true;
    g.add(leg);
  }

  return g;
}

function buildTree(
  trunkGeo: THREE.CylinderGeometry,
  canopyGeo: THREE.SphereGeometry,
  trunkMat: THREE.MeshStandardMaterial,
  canopyMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  g.add(trunk);

  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = 2.6;
  canopy.castShadow = true;
  g.add(canopy);

  return g;
}

function buildLamp(
  poleGeo: THREE.CylinderGeometry,
  poleMat: THREE.MeshStandardMaterial,
  headGeo: THREE.SphereGeometry,
  headMat: THREE.MeshStandardMaterial,
  withLight: boolean,
): { mesh: THREE.Group; light: THREE.PointLight | null } {
  const g = new THREE.Group();

  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 2.5;
  pole.castShadow = true;
  g.add(pole);

  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 5;
  g.add(head);

  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight(0xffc47a, 40, 22, 2);
    light.position.set(0, 4.6, 0);
    light.visible = false;
    g.add(light);
  }

  return { mesh: g, light };
}
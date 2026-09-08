import * as THREE from 'three';

export type SceneTheme = 'dark' | 'light';

interface ScenePalette {
  background: number;
  fog: number;
  ground: number;
  asphalt: number;
  laneLine: number;
  centerLine: number;
  zebra: number;
  fogNear: number;
  fogFar: number;
}

export interface RoadMaterials {
  ground: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  laneLine: THREE.MeshStandardMaterial;
  centerLine: THREE.MeshStandardMaterial;
  zebra: THREE.MeshStandardMaterial;
}

const PALETTES: Record<SceneTheme, ScenePalette> = {
  dark: {
    background: 0x0a0e14,
    fog: 0x0a0e14,
    ground: 0x0c1117,
    asphalt: 0x1b2431,
    laneLine: 0x3a4a5e,
    centerLine: 0xf5a623,
    zebra: 0xd9e0e8,
    fogNear: 60,
    fogFar: 140,
  },
  light: {
    background: 0xdce5ec,
    fog: 0xdce5ec,
    ground: 0xe9eef3,
    asphalt: 0x9aa7b4,
    laneLine: 0xffffff,
    centerLine: 0xf5a623,
    zebra: 0xffffff,
    fogNear: 60,
    fogFar: 140,
  },
};

let activeTheme: SceneTheme = 'dark';
let activeScene: THREE.Scene | null = null;
let activeMaterials: RoadMaterials | null = null;
const themeListeners: ((theme: SceneTheme) => void)[] = [];

export function getSceneTheme(): SceneTheme {
  return activeTheme;
}

export function getPalette(): ScenePalette {
  return PALETTES[activeTheme];
}

export function onThemeChange(fn: (theme: SceneTheme) => void): () => void {
  themeListeners.push(fn);
  return () => {
    const i = themeListeners.indexOf(fn);
    if (i !== -1) themeListeners.splice(i, 1);
  };
}

export function setSceneTheme(theme: SceneTheme): void {
  activeTheme = theme;
  applyTheme();
  for (const fn of themeListeners) fn(theme);
}

export function registerScene(
  scene: THREE.Scene,
  materials: RoadMaterials,
): void {
  activeScene = scene;
  activeMaterials = materials;
  applyTheme();
}

export function unregisterScene(): void {
  activeScene = null;
  activeMaterials = null;
}

function applyTheme(): void {
  const scene = activeScene;
  const materials = activeMaterials;
  if (!scene || !materials) return;
  const p = PALETTES[activeTheme];
  if (scene.background instanceof THREE.Color) {
    scene.background.setHex(p.background);
  }
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.setHex(p.fog);
    scene.fog.near = p.fogNear;
    scene.fog.far = p.fogFar;
  }
  materials.ground.color.setHex(p.ground);
  materials.asphalt.color.setHex(p.asphalt);
  materials.laneLine.color.setHex(p.laneLine);
  materials.centerLine.color.setHex(p.centerLine);
  materials.zebra.color.setHex(p.zebra);
}
import * as THREE from 'three';
import {
  isAdvancedGraphicsOn,
  isLightingEffectsOn,
  onGraphicsChange,
} from './advancedGraphics';
import { getSceneTheme, onThemeChange } from './theme';

interface HeadlightUnit {
  mat: THREE.MeshStandardMaterial;
  anchor: THREE.Object3D;
}

const units: HeadlightUnit[] = [];

let enabled = false;
let pool: THREE.PointLight[] = [];
let poolGroup: THREE.Group | null = null;
let unsubscribers: (() => void)[] = [];
let activeUnits: HeadlightUnit[] = [];

// Pool fijo de faros reales (PointLight). Se crea una sola vez y se reasigna a
// los vehiculos mas cercanos sin ocultar/mostrar luces: mantener constante el
// numero de luces evita recompilar shaders y elimina el parpadeo.
const MAX_HEADLIGHTS = 6;
// Margen de puestos para no cambiar de faros ante temblores de camara.
const HYSTERESIS_RANKS = 2;
const HEADLIGHT_INTENSITY = 25;
const HEADLIGHT_DISTANCE = 12;

function computeEnabled(): boolean {
  return (
    isAdvancedGraphicsOn() && isLightingEffectsOn() && getSceneTheme() === 'dark'
  );
}

function applyMaterials(): void {
  const intensity = enabled ? 1.6 : 0;
  for (const unit of units) unit.mat.emissiveIntensity = intensity;
}

function updateEnabled(): void {
  enabled = computeEnabled();
  applyMaterials();
  for (const light of pool) {
    light.visible = enabled;
    if (!enabled) light.intensity = 0;
  }
  if (!enabled) activeUnits = [];
}

// Crea el pool de luces en la escena; devuelve la funcion de limpieza.
export function initVehicleLighting(scene: THREE.Scene): () => void {
  poolGroup = new THREE.Group();
  pool = [];
  for (let i = 0; i < MAX_HEADLIGHTS; i += 1) {
    const light = new THREE.PointLight(0xfff0c0, 0, HEADLIGHT_DISTANCE, 2);
    light.visible = false;
    poolGroup.add(light);
    pool.push(light);
  }
  scene.add(poolGroup);

  unsubscribers = [
    onThemeChange(() => updateEnabled()),
    onGraphicsChange(() => updateEnabled()),
  ];
  updateEnabled();

  return () => {
    for (const unsub of unsubscribers) unsub();
    unsubscribers = [];
    for (const light of pool) light.dispose();
    pool = [];
    if (poolGroup) {
      scene.remove(poolGroup);
      poolGroup = null;
    }
    units.length = 0;
    activeUnits = [];
    enabled = false;
  };
}

// Registra el ancla de un faro; devuelve la funcion para desregistrarla.
export function registerHeadlight(
  mat: THREE.MeshStandardMaterial,
  anchor: THREE.Object3D,
): () => void {
  const unit: HeadlightUnit = { mat, anchor };
  units.push(unit);
  applyMaterials();
  return () => {
    const i = units.indexOf(unit);
    if (i !== -1) units.splice(i, 1);
    const j = activeUnits.indexOf(unit);
    if (j !== -1) activeUnits.splice(j, 1);
  };
}

const scratchPos = new THREE.Vector3();
const scratch: { unit: HeadlightUnit; dist: number }[] = [];

// Reasigna el pool a los MAX_HEADLIGHTS faros mas cercanos a la camara.
export function updateHeadlights(cameraPosition: THREE.Vector3): void {
  if (!enabled || units.length === 0) return;

  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    unit.anchor.getWorldPosition(scratchPos);
    const dist = scratchPos.distanceToSquared(cameraPosition);
    const entry = scratch[i];
    if (entry) {
      entry.unit = unit;
      entry.dist = dist;
    } else {
      scratch[i] = { unit, dist };
    }
  }
  const ranked = scratch.slice(0, units.length).sort((a, b) => a.dist - b.dist);

  const chosen: HeadlightUnit[] = [];
  const activeSet = new Set(activeUnits);
  // Conservar los faros ya encendidos mientras sigan dentro del margen.
  for (let i = 0; i < ranked.length; i += 1) {
    if (chosen.length >= MAX_HEADLIGHTS) break;
    if (i >= MAX_HEADLIGHTS + HYSTERESIS_RANKS) break;
    if (activeSet.has(ranked[i].unit)) chosen.push(ranked[i].unit);
  }
  // Completar con los mas cercanos que falten.
  for (let i = 0; i < ranked.length; i += 1) {
    if (chosen.length >= MAX_HEADLIGHTS) break;
    const unit = ranked[i].unit;
    if (!chosen.includes(unit)) chosen.push(unit);
  }

  activeUnits = chosen;

  for (let i = 0; i < pool.length; i += 1) {
    const light = pool[i];
    const unit = chosen[i];
    if (!unit) {
      light.intensity = 0;
      continue;
    }
    unit.anchor.getWorldPosition(light.position);
    light.intensity = HEADLIGHT_INTENSITY;
  }
}

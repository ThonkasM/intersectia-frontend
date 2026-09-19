import * as THREE from 'three';
import {
  isAdvancedGraphicsOn,
  isLightingEffectsOn,
  onGraphicsChange,
} from './advancedGraphics';
import { getSceneTheme, onThemeChange } from './theme';

interface HeadlightUnit {
  mat: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
}

const units: HeadlightUnit[] = [];

let enabled = false;
let initialized = false;

// Maximo de faros reales (PointLight) encendidos a la vez. El resto de los
// vehiculos conservan el brillo emisivo, pero sin coste de luz dinamica.
const MAX_HEADLIGHTS = 6;

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
  if (!enabled) {
    for (const unit of units) unit.light.visible = false;
  }
}

export function initVehicleLighting(): void {
  if (initialized) return;
  initialized = true;
  onThemeChange(() => updateEnabled());
  onGraphicsChange(() => updateEnabled());
  updateEnabled();
}

// Registra los faros de un vehiculo; devuelve la funcion para desregistrarlos.
export function registerHeadlight(
  mat: THREE.MeshStandardMaterial,
  light: THREE.PointLight,
): () => void {
  const unit: HeadlightUnit = { mat, light };
  units.push(unit);
  light.visible = false;
  applyMaterials();
  return () => {
    const i = units.indexOf(unit);
    if (i !== -1) units.splice(i, 1);
  };
}

const scratchPos = new THREE.Vector3();
const scratch: { unit: HeadlightUnit; dist: number }[] = [];

// Enciende solo los MAX_HEADLIGHTS faros mas cercanos a la camara.
export function updateHeadlights(cameraPosition: THREE.Vector3): void {
  if (!enabled) return;
  if (units.length <= MAX_HEADLIGHTS) {
    for (const unit of units) unit.light.visible = true;
    return;
  }
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    unit.light.getWorldPosition(scratchPos);
    const entry = scratch[i];
    const dist = scratchPos.distanceTo(cameraPosition);
    if (entry) {
      entry.unit = unit;
      entry.dist = dist;
    } else {
      scratch[i] = { unit, dist };
    }
  }
  scratch
    .slice(0, units.length)
    .sort((a, b) => a.dist - b.dist)
    .forEach((entry, i) => {
      entry.unit.light.visible = i < MAX_HEADLIGHTS;
    });
}

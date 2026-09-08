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

function apply(): void {
  // Faros encendidos solo con gráficos avanzados + iluminación activa + noche.
  const on =
    isAdvancedGraphicsOn() &&
    isLightingEffectsOn() &&
    getSceneTheme() === 'dark';
  for (const u of units) {
    u.light.visible = on;
    u.mat.emissiveIntensity = on ? 1.6 : 0;
  }
}

let initialized = false;

export function initVehicleLighting(): void {
  if (initialized) return;
  initialized = true;
  onThemeChange(() => apply());
  onGraphicsChange(() => apply());
}

// Registra los faros de un vehículo; devuelve la función para desregistrarlos.
export function registerHeadlight(
  mat: THREE.MeshStandardMaterial,
  light: THREE.PointLight,
): () => void {
  const unit: HeadlightUnit = { mat, light };
  units.push(unit);
  apply();
  return () => {
    const i = units.indexOf(unit);
    if (i !== -1) units.splice(i, 1);
  };
}
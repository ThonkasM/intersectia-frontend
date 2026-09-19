import * as THREE from 'three';
import { isShadowsOn, onGraphicsChange } from './advancedGraphics';

interface ShadowTarget {
  renderer: THREE.WebGLRenderer;
  light: THREE.DirectionalLight;
}

let target: ShadowTarget | null = null;
let unsub: (() => void) | null = null;

function apply(): void {
  if (!target) return;
  const on = isShadowsOn();
  target.renderer.shadowMap.enabled = on;
  target.light.castShadow = on;
  if (on) target.renderer.shadowMap.needsUpdate = true;
}

export function markShadowsDirty(): void {
  if (target && target.renderer.shadowMap.enabled) {
    target.renderer.shadowMap.needsUpdate = true;
  }
}

export function registerShadows(
  renderer: THREE.WebGLRenderer,
  light: THREE.DirectionalLight,
): void {
  target = { renderer, light };
  if (!unsub) unsub = onGraphicsChange(() => apply());
  apply();
}

export function unregisterShadows(): void {
  if (unsub) {
    unsub();
    unsub = null;
  }
  target = null;
}
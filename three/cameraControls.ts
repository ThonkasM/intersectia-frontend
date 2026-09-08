import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function attachCameraControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): {
  controls: OrbitControls;
  update: () => void;
  dispose: () => void;
} {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 15;
  controls.maxDistance = 250;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;

  return {
    controls,
    update: () => controls.update(),
    dispose: () => controls.dispose(),
  };
}
import * as THREE from 'three';
import { isShadowsOn } from './advancedGraphics';
import { SUN_POSITION } from './sky';
import { getPalette } from './theme';

export function createScene(container: HTMLElement): {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sunLight: THREE.DirectionalLight;
} {
  const p = getPalette();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(p.background);
  scene.fog = new THREE.Fog(p.fog, p.fogNear, p.fogFar);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = isShadowsOn();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x2a3648, 1.1);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xbfd4ff, 0.9);
  // La luz viene desde la posición del sol (coherente con el cielo y las sombras).
  sunLight.position.set(SUN_POSITION.x, SUN_POSITION.y, SUN_POSITION.z);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight.target);
  sunLight.castShadow = isShadowsOn();
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.bias = -0.0005;
  const d = 70;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 220;
  sunLight.shadow.camera.updateProjectionMatrix();
  scene.add(sunLight);

  return { scene, renderer, sunLight };
}
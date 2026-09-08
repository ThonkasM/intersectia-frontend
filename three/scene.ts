import * as THREE from 'three';

export function createScene(container: HTMLElement): {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e14);
  scene.fog = new THREE.Fog(0x0a0e14, 60, 140);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x2a3648, 1.1);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xbfd4ff, 0.9);
  directional.position.set(30, 45, 10);
  scene.add(directional);

  return { scene, renderer };
}
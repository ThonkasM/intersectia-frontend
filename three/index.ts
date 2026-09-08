import * as THREE from 'three';
import { CameraRig, minimapRect, setActiveRig } from './cameraRig';
import type { SimulationMode } from './modes/mode.interface';
import { buildRoad } from './road';
import { createScene } from './scene';

export function initDemo(container: HTMLElement, mode: SimulationMode): () => void {
  const { scene, renderer } = createScene(container);
  buildRoad(scene);
  const cameraRig = new CameraRig(container);
  setActiveRig(cameraRig);
  mode.start(scene);

  let raf = 0;
  let lastT = performance.now();
  function loop(): void {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    mode.onFrame(dt);
    cameraRig.update(() => mode.getPlayerVehicle?.() ?? null);

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
    renderer.render(scene, cameraRig.mainCamera);

    if (cameraRig.hasFollowTarget()) {
      const { size, margin } = minimapRect;
      // Sin fog: desde la cámara cenital el suelo quedaría oculto por la niebla.
      const fog = scene.fog;
      scene.fog = null;
      renderer.setScissorTest(true);
      renderer.setViewport(margin, margin, size, size);
      renderer.setScissor(margin, margin, size, size);
      renderer.render(scene, cameraRig.satelliteCamera);
      renderer.setScissorTest(false);
      scene.fog = fog;
    }
  }
  loop();

  return function cleanup() {
    cancelAnimationFrame(raf);
    mode.stop();
    cameraRig.dispose();
    setActiveRig(null);
    renderer.dispose();
    renderer.forceContextLoss();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) material.dispose();
      }
    });
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
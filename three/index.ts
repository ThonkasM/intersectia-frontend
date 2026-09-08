import * as THREE from 'three';
import {
  buildNeighborhood,
  buildTrees,
  isAdvancedGraphicsOn,
  isAmbientEffectsOn,
  isPedestriansOn,
  isTreesOn,
  onGraphicsChange,
  type NeighborhoodHandle,
  type TreesHandle,
} from './advancedGraphics';
import { CameraRig, minimapRect, setActiveRig } from './cameraRig';
import { recordFrame } from './fps';
import type { SimulationMode } from './modes/mode.interface';
import { buildPedestrians, type PedestriansHandle } from './pedestrians';
import { buildRoad } from './road';
import { createScene } from './scene';
import { registerShadows, unregisterShadows } from './shadows';
import { buildSky, type SkyHandle } from './sky';
import { getSceneTheme, registerScene, unregisterScene } from './theme';
import { initVehicleLighting } from './vehicleLights';

initVehicleLighting();

let activeMode: SimulationMode | null = null;

export function getActiveMode(): SimulationMode | null {
  return activeMode;
}

export function initDemo(container: HTMLElement, mode: SimulationMode): () => void {
  const { scene, renderer, sunLight } = createScene(container);
  const roadMaterials = buildRoad(scene);
  registerScene(scene, roadMaterials);
  registerShadows(renderer, sunLight);
  const cameraRig = new CameraRig(container);
  setActiveRig(cameraRig);
  activeMode = mode;
  mode.start(scene);

  // Vecindario, cielo, peatones y árboles opcionales (gráficos avanzados + subajustes).
  let neighborhood: NeighborhoodHandle | null = null;
  let sky: SkyHandle | null = null;
  let pedestrians: PedestriansHandle | null = null;
  let trees: TreesHandle | null = null;
  const syncGraphics = (): void => {
    const advanced = isAdvancedGraphicsOn();
    if (advanced && !neighborhood) {
      neighborhood = buildNeighborhood(scene);
      neighborhood.setTheme(getSceneTheme());
    } else if (!advanced && neighborhood) {
      neighborhood.dispose();
      neighborhood = null;
    }
    const showSky = advanced && isAmbientEffectsOn();
    if (showSky && !sky) {
      sky = buildSky(scene);
    } else if (!showSky && sky) {
      sky.dispose();
      sky = null;
    }
    const showPedestrians = advanced && isPedestriansOn();
    if (showPedestrians && !pedestrians) {
      pedestrians = buildPedestrians(scene);
    } else if (!showPedestrians && pedestrians) {
      pedestrians.dispose();
      pedestrians = null;
    }
    const showTrees = advanced && isTreesOn();
    if (showTrees && !trees) {
      trees = buildTrees(scene);
      trees.setTheme(getSceneTheme());
    } else if (!showTrees && trees) {
      trees.dispose();
      trees = null;
    }
  };
  syncGraphics();
  const unsubGraphics = onGraphicsChange(syncGraphics);

  let raf = 0;
  let lastT = performance.now();
  function loop(): void {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    mode.onFrame(dt);
    pedestrians?.update(dt);
    recordFrame();
    cameraRig.update(() => mode.getPlayerVehicle?.() ?? null);

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
    renderer.render(scene, cameraRig.mainCamera);

    if (cameraRig.hasFollowTarget()) {
      const { size, margin } = minimapRect;
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

  // Click para detener/reanudar vehículos autónomos (ignora arrastres de órbita).
  let pointerDownX = 0;
  let pointerDownY = 0;
  const onPointerDown = (e: PointerEvent): void => {
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
  };
  const onClick = (e: MouseEvent): void => {
    const moved = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
    if (moved > 6) return;
    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const id = mode.pickAt?.(cameraRig.mainCamera, ndcX, ndcY);
    if (id) mode.toggleVehicleFreeze?.(id);
  };
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('click', onClick);

  return function cleanup() {
    cancelAnimationFrame(raf);
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('click', onClick);
    unsubGraphics();
    neighborhood?.dispose();
    neighborhood = null;
    sky?.dispose();
    sky = null;
    pedestrians?.dispose();
    pedestrians = null;
    trees?.dispose();
    trees = null;
    unregisterShadows();
    mode.stop();
    cameraRig.dispose();
    setActiveRig(null);
    activeMode = null;
    unregisterScene();
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
import * as THREE from 'three';
import { getSceneTheme, onThemeChange, type SceneTheme } from './theme';

export interface SkyHandle {
  setTheme(theme: SceneTheme): void;
  dispose(): void;
}

const DOME_RADIUS = 320;

// Posición mundial del sol (compartida con la luz direccional de sombras).
// Más alto reduce el ángulo de las sombras (más naturales).
export const SUN_POSITION = { x: 140, y: 70, z: 150 };

function makeSkyTexture(theme: SceneTheme): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('[IntersectIA] Could not create 2D context for sky');
  }
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  if (theme === 'dark') {
    g.addColorStop(0, '#04070f');
    g.addColorStop(0.55, '#0a1220');
    g.addColorStop(1, '#121c30');
  } else {
    g.addColorStop(0, '#2f6fd6');
    g.addColorStop(0.65, '#8fc0f7');
    g.addColorStop(1, '#dbeafe');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildStars(): THREE.Points {
  const count = 350;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.15 + Math.random() * 0.85); // hemisferio superior
    const r = DOME_RADIUS - 8;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    fog: false,
  });
  return new THREE.Points(geo, mat);
}

function buildClouds(): THREE.Group {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    fog: false,
  });
  // Geometrías compartidas por tamaño de bloque (estilo Minecraft).
  const blockGeo: Record<number, THREE.BoxGeometry> = {};
  const geoFor = (s: number): THREE.BoxGeometry => {
    if (!blockGeo[s]) blockGeo[s] = new THREE.BoxGeometry(s, s * 0.4, s);
    return blockGeo[s];
  };
  const spots: [number, number, number][] = [
    [150, 55, 0], [140, 50, 70], [100, 60, 130], [40, 62, 160],
    [-50, 58, 160], [-110, 55, 135], [-155, 50, 70], [-160, 52, 0],
    [-140, 58, -80], [-90, 64, -145], [-30, 60, -165], [45, 62, -155],
    [110, 56, -125], [160, 52, -55], [70, 65, 60],
  ];
  for (const [cx, cy, cz] of spots) {
    const cloud = new THREE.Group();
    const blocks: [number, number, number, number][] = [
      [0, 0, 0, 14],
      [16, 0, 4, 11],
      [-16, 0, -3, 11],
      [6, 5, -8, 11],
      [-6, 5, 6, 10],
    ];
    for (const [bx, by, bz, s] of blocks) {
      const block = new THREE.Mesh(geoFor(s), cloudMat);
      block.position.set(bx, by, bz);
      cloud.add(block);
    }
    cloud.position.set(cx, cy, cz);
    g.add(cloud);
  }
  return g;
}

export function buildSky(scene: THREE.Scene): SkyHandle {
  const group = new THREE.Group();
  scene.add(group);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_RADIUS, 32, 18),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      fog: false,
    }),
  );
  group.add(dome);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(12, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }),
  );
  // Delante del jugador (que mira hacia +z): visible en el horizonte en primera persona.
  sun.position.set(SUN_POSITION.x, SUN_POSITION.y, SUN_POSITION.z);
  group.add(sun);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(11, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe6ecf5, fog: false }),
  );
  moon.position.set(150, 46, 130);
  group.add(moon);

  const stars = buildStars();
  group.add(stars);

  const clouds = buildClouds();
  group.add(clouds);

  // Leve iluminación de luna sobre el entorno (de noche).
  const moonlight = new THREE.DirectionalLight(0x8fa3cc, 0.15);
  moonlight.position.set(150, 46, 130);
  group.add(moonlight);

  const applyTheme = (theme: SceneTheme): void => {
    const mat = dome.material as THREE.MeshBasicMaterial;
    if (mat.map) mat.map.dispose();
    mat.map = makeSkyTexture(theme);
    mat.needsUpdate = true;
    const dark = theme === 'dark';
    sun.visible = !dark;
    clouds.visible = !dark;
    moon.visible = dark;
    stars.visible = dark;
    moonlight.visible = dark;
  };

  applyTheme(getSceneTheme());
  const unsub = onThemeChange(applyTheme);

  return {
    setTheme: applyTheme,
    dispose(): void {
      unsub();
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) m.dispose();
        }
      });
      (dome.material as THREE.MeshBasicMaterial).map?.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.PointsMaterial).dispose();
      scene.remove(group);
    },
  };
}
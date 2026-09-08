import * as THREE from 'three';
import { BUBBLE_LAYER } from './cameraRig';

const SPRITE_W = 140;
const SPRITE_H = 56;
const SPRITE_SCALE_X = 3.1;
const SPRITE_SCALE_Y = (SPRITE_SCALE_X * SPRITE_H) / SPRITE_W;
const BUBBLE_Y = 1.75;
const TAIL_H = 10;

const LABEL_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Avanzando: { bg: '#1e3a5f', border: '#60a5fa', text: '#dbeafe' },
  Espera: { bg: '#7f1d1d', border: '#f87171', text: '#fee2e2' },
  Cruzando: { bg: '#064e3b', border: '#34d399', text: '#d1fae5' },
};

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getLabelTexture(label: string): THREE.CanvasTexture {
  const cached = textureCache.get(label);
  if (cached) return cached;
  const texture = buildLabelTexture(label);
  textureCache.set(label, texture);
  return texture;
}

function buildLabelTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H + TAIL_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('[IntersectIA] Could not create 2D canvas context for label sprite');
  }

  const style = LABEL_STYLES[label] ?? LABEL_STYLES.Avanzando;
  const bodyH = SPRITE_H;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const radius = 16;
  roundRect(ctx, 0, 0, SPRITE_W, bodyH, radius);
  ctx.fillStyle = style.bg;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = style.border;
  roundRect(ctx, 1.25, 1.25, SPRITE_W - 2.5, bodyH - 2.5, radius - 1);
  ctx.stroke();

  // cola del globo apuntando al vehículo
  ctx.beginPath();
  ctx.moveTo(SPRITE_W / 2 - 9, bodyH - 1);
  ctx.lineTo(SPRITE_W / 2, bodyH + TAIL_H);
  ctx.lineTo(SPRITE_W / 2 + 9, bodyH - 1);
  ctx.closePath();
  ctx.fillStyle = style.bg;
  ctx.fill();
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = style.text;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, SPRITE_W / 2, bodyH / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createLabelSprite(label: string): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: getLabelTexture(label),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.layers.set(BUBBLE_LAYER);
  sprite.scale.set(SPRITE_SCALE_X, SPRITE_SCALE_Y, 1);
  sprite.position.y = BUBBLE_Y;
  return sprite;
}

export class BubbleLayer {
  private sprites = new Map<string, THREE.Sprite>();

  constructor(
    private scene: THREE.Scene,
    private labelsOn: () => boolean
  ) {}

  sync(id: string, label: string, x: number, z: number): void {
    const sprite = this.getSprite(id);
    sprite.position.set(x, BUBBLE_Y, z);
    if (label === '') {
      sprite.visible = false;
      return;
    }
    const material = sprite.material as THREE.SpriteMaterial;
    const texture = getLabelTexture(label);
    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }
    sprite.visible = this.labelsOn();
  }

  remove(id: string): void {
    const sprite = this.sprites.get(id);
    if (!sprite) return;
    this.scene.remove(sprite);
    (sprite.material as THREE.SpriteMaterial).dispose();
    this.sprites.delete(id);
  }

  clear(): void {
    for (const id of Array.from(this.sprites.keys())) this.remove(id);
  }

  private getSprite(id: string): THREE.Sprite {
    const existing = this.sprites.get(id);
    if (existing) return existing;
    const sprite = createLabelSprite('Avanzando');
    this.scene.add(sprite);
    this.sprites.set(id, sprite);
    return sprite;
  }
}
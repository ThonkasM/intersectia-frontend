import type { GamepadInput } from './gamepadController';

const THROTTLE_KEYS = new Set(['KeyW', 'ArrowUp']);
const BRAKE_KEYS = new Set(['KeyS', 'ArrowDown']);
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);
const CAMERA_KEYS = new Set(['KeyC']);
const ZOOM_KEYS = new Set(['KeyZ']);

const CONTROL_KEYS = new Set([
  ...THROTTLE_KEYS,
  ...BRAKE_KEYS,
  ...LEFT_KEYS,
  ...RIGHT_KEYS,
  ...CAMERA_KEYS,
  ...ZOOM_KEYS,
]);

const PREVENT_DEFAULT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export class KeyboardController {
  private pressed = new Set<string>();
  private active = false;
  private listeners: ((active: boolean) => void)[] = [];

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  isActive(): boolean {
    return this.active;
  }

  read(): GamepadInput {
    const has = (keys: Set<string>): boolean => {
      for (const key of keys) if (this.pressed.has(key)) return true;
      return false;
    };
    const left = has(LEFT_KEYS);
    const right = has(RIGHT_KEYS);
    return {
      throttle: has(THROTTLE_KEYS) ? 1 : 0,
      brake: has(BRAKE_KEYS) ? 1 : 0,
      steer: right === left ? 0 : right ? 1 : -1,
      y: has(ZOOM_KEYS),
      x: has(CAMERA_KEYS),
    };
  }

  onStatus(fn: (active: boolean) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  dispose(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.pressed.clear();
    this.listeners = [];
    this.active = false;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (!CONTROL_KEYS.has(e.code)) return;
    if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
    this.pressed.add(e.code);
    if (!this.active) {
      this.active = true;
      for (const fn of this.listeners) fn(true);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code);
  };

  // Al perder el foco (cambio de pestaña) se sueltan las teclas para no dejar
  // el vehículo acelerando o girando indefinidamente.
  private onBlur = (): void => {
    this.pressed.clear();
  };
}

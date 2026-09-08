export type GamepadInput = {
  throttle: number;
  brake: number;
  steer: number;
  y: boolean;
  x: boolean;
};

export class GamepadController {
  private index: number | null = null;
  private connected = false;
  private listeners: ((connected: boolean) => void)[] = [];

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('gamepadconnected', this.handleConnect);
    window.addEventListener('gamepaddisconnected', this.handleDisconnect);
    // Un mando ya conectado no re-dispara `gamepadconnected` al remontar el
    // modo (cambio de modo, StrictMode). Se detecta escaneando el estado actual.
    this.scan();
  }

  private scan(): void {
    if (typeof navigator === 'undefined') return;
    const pads = navigator.getGamepads();
    for (const gp of pads) {
      if (gp) {
        this.index = gp.index;
        this.connected = true;
        for (const fn of this.listeners) fn(true);
        return;
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  read(): GamepadInput {
    if (this.index === null || typeof navigator === 'undefined') {
      return { throttle: 0, brake: 0, steer: 0, y: false, x: false };
    }
    const gp = navigator.getGamepads()[this.index];
    if (!gp) return { throttle: 0, brake: 0, steer: 0, y: false, x: false };
    const axisX = gp.axes[0] ?? 0;
    const right = (gp.buttons[5]?.value ?? 0) > 0.5 || axisX > 0.5;
    const left = (gp.buttons[4]?.value ?? 0) > 0.5 || axisX < -0.5;
    return {
      throttle: Math.max(0, gp.buttons[7]?.value ?? 0),
      brake: Math.max(0, gp.buttons[6]?.value ?? 0),
      steer: right ? 1 : left ? -1 : 0,
      y: gp.buttons[3]?.pressed ?? false,
      x: gp.buttons[2]?.pressed ?? false,
    };
  }

  onStatus(fn: (connected: boolean) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  dispose(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('gamepadconnected', this.handleConnect);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnect);
    this.listeners = [];
  }

  private handleConnect = (e: GamepadEvent): void => {
    this.index = e.gamepad.index;
    this.connected = true;
    for (const fn of this.listeners) fn(true);
  };

  private handleDisconnect = (): void => {
    this.index = null;
    this.connected = false;
    for (const fn of this.listeners) fn(false);
  };
}
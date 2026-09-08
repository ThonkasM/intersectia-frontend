import type { DecisionEvent, SimMode, VehicleState } from '../lib/constants';

export type HudSnapshot = {
  mode: SimMode;
  crossed: number;
  waiting: number;
  avgWaitSeconds: number | null;
  connected: boolean;
  gamepadConnected: boolean;
  playerAuthorized: boolean | null;
  playerState: VehicleState | null;
  queueLength: number;
  violations: number;
  lastDecision: DecisionEvent | null;
  decisions: DecisionEvent[];
  playerLane: number;
  playerSpeed: number;
  labelsOn: boolean;
};

export class HudBridge {
  labelsOn = false;
  private listeners: ((s: HudSnapshot) => void)[] = [];
  private last: HudSnapshot | null = null;

  subscribe(fn: (s: HudSnapshot) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  publish(s: HudSnapshot) {
    this.last = s;
    this.listeners.forEach((fn) => fn(s));
  }

  setLabelsOn(on: boolean) {
    this.labelsOn = on;
    if (this.last) {
      this.publish({ ...this.last, labelsOn: on });
    }
  }
}

export const hudBridge = new HudBridge();

import type { Scene } from 'three';
import type { Vehicle } from '../vehicle';

export interface SimulationMode {
  start(scene: Scene): void;
  stop(): void;
  onFrame(dt: number): void;
  getPlayerVehicle?(): Vehicle | null;
}
export type { SimMode } from '../../lib/constants';
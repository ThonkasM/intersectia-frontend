import type * as THREE from 'three';
import type { Vehicle } from '../vehicle';

export interface SimulationMode {
  start(scene: THREE.Scene): void;
  stop(): void;
  onFrame(dt: number): void;
  getPlayerVehicle?(): Vehicle | null;
  pickAt?(camera: THREE.Camera, ndcX: number, ndcY: number): string | null;
  toggleVehicleFreeze?(id: string): void;
  reset?(): void;
  setCollisions?(enabled: boolean): void;
}
export type { SimMode } from '../../lib/constants';
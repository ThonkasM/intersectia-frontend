export type Direction = 'N' | 'S' | 'E' | 'W';
export type VehicleState = 'approach' | 'queued' | 'crossing' | 'gone';
export type SimMode = 'traditional' | 'managed' | 'managed-ai';
export type DecisionEngine = 'fifo' | 'right-priority' | 'ai';

export const SIM = {
  LANE_HALF_OFFSET: 2.25,
  SPAWN_DISTANCE: 90,
  STOP_LINE_DISTANCE: 10,
  INTERSECTION_HALF: 6,
  GONE_DISTANCE: 12,
  APPROACH_SPEED: 6,
  CROSSING_SPEED: 9,
  MAX_VEHICLES: 14,
};

// Vector unitario de avance por dirección (sin desvío lateral).
export const DIRECTION: Record<Direction, { dx: number; dz: number }> = {
  N: { dx: 0, dz: -1 },
  S: { dx: 0, dz: 1 },
  E: { dx: 1, dz: 0 },
  W: { dx: -1, dz: 0 },
};

// Dos carriles por sentido. Índice 0 = carril exterior (derecho, el de marcha normal),
// índice 1 = carril interior (junto al separador central, de sobrepaso).
// Para N/S el desvío es en x; para E/W es en z.
export const LANES: Record<Direction, [number, number]> = {
  N: [3.375, 1.125],
  S: [-3.375, -1.125],
  E: [-3.375, -1.125],
  W: [3.375, 1.125],
};

export const LANE_COUNT = 2;
export const MIN_FOLLOW_DISTANCE = 4.5;
export const MIN_STOP_DISTANCE = 2.0;

export function laneOffset(from: Direction, lane: number): { x: number; z: number } {
  const offset = LANES[from][lane] ?? LANES[from][0];
  if (from === 'N' || from === 'S') return { x: offset, z: 0 };
  return { x: 0, z: offset };
}

export function laneFromPosition(from: Direction, x: number, z: number): number {
  const lateral = from === 'N' || from === 'S' ? x : z;
  const lanes = LANES[from];
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < lanes.length; i += 1) {
    const d = Math.abs(lateral - lanes[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export const VEHICLE_COLORS = ['#f87171', '#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#f472b6'];

export const PLAYER = {
  ID: 'player',
  MAX_SPEED: 12,
  ACCEL: 8,
  BRAKE_DECEL: 14,
  FRICTION: 3,
  ASSIST_START_DIST: 12,
  SPAWN_DISTANCE: 40,
  LANE_CHANGE_SPEED: 4,
  LANE_CHANGE_COOLDOWN: 0.4,
};

export const STATE_LABELS: Record<VehicleState, string> = {
  approach: 'Avanzando',
  queued: 'Espera',
  crossing: 'Cruzando',
  gone: '',
};

export const ENGINE_LABELS: Record<DecisionEngine, string> = {
  fifo: 'FIFO (determinista)',
  'right-priority': 'Prioridad a la derecha',
  ai: 'IA (política)',
};

export type DecisionEvent = {
  vehicleId: string;
  from: Direction;
  waitSeconds: number;
  engine: DecisionEngine;
  at: number;
};

import { io, type Socket } from 'socket.io-client';
import type {
  DecisionEvent,
  Direction,
  Turn,
  VehicleState,
} from '../../lib/constants';

export type RemoteVehicleDto = {
  id: string;
  x: number;
  z: number;
  from: Direction;
  state: VehicleState;
  frozen: boolean;
  crashed: boolean;
  turn: Turn;
};

const SESSION_STORAGE_KEY = 'intersectia-session';

function resolveSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      const random =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      id = random.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'anon';
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export class IntersectionSocket {
  private socket?: Socket;
  private mode: 'managed' | 'managed-ai' = 'managed';
  private onConnect?: () => void;
  readonly sessionId = resolveSessionId();

  constructor(private url = process.env.NEXT_PUBLIC_WS_URL ?? '') {}

  connect(): void {
    if (!this.url) {
      console.warn('[IntersectIA] No NEXT_PUBLIC_WS_URL configured; skipping socket connection.');
      return;
    }
    if (this.socket?.connected) return;
    const socket = io(this.url, {
      transports: ['websocket'],
      auth: { sessionId: this.sessionId },
    });
    this.socket = socket;
    this.onConnect = () => {
      this.setMode(this.mode);
    };
    socket.on('connect', this.onConnect);
  }

  disconnect(): void {
    if (this.socket && this.onConnect) {
      this.socket.off('connect', this.onConnect);
    }
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = undefined;
    this.onConnect = undefined;
  }

  setMode(mode: 'managed' | 'managed-ai'): void {
    this.mode = mode;
    this.socket?.emit('setMode', { mode });
  }

  onStateUpdate(fn: (vehicles: RemoteVehicleDto[]) => void): () => void {
    this.socket?.on('state', fn);
    return () => {
      this.socket?.off('state', fn);
    };
  }

  onDecision(fn: (d: DecisionEvent) => void): () => void {
    this.socket?.on('decision', fn);
    return () => {
      this.socket?.off('decision', fn);
    };
  }

  onStatus(fn: (connected: boolean) => void): () => void {
    const socket = this.socket;
    if (!socket) return () => undefined;
    const onConnect = () => fn(true);
    const onDisconnect = () => fn(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }

  sendPlayerState(state: { id: string; x: number; z: number; from: Direction; speed: number }): void {
    this.socket?.emit('playerState', state);
  }

  freezeVehicle(id: string): void {
    this.socket?.emit('freezeVehicle', { id });
  }

  resumeVehicle(id: string): void {
    this.socket?.emit('resumeVehicle', { id });
  }

  resetSimulation(): void {
    this.socket?.emit('reset');
  }

  setCollisions(enabled: boolean): void {
    this.socket?.emit('setCollisions', { enabled });
  }

  setTurns(enabled: boolean): void {
    this.socket?.emit('setTurns', { enabled });
  }
}

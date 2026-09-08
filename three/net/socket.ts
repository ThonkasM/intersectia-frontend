import { io, type Socket } from 'socket.io-client';
import type { DecisionEvent, Direction, VehicleState } from '../../lib/constants';

export type RemoteVehicleDto = {
  id: string;
  x: number;
  z: number;
  from: Direction;
  state: VehicleState;
  frozen: boolean;
  crashed: boolean;
};

export class IntersectionSocket {
  private socket?: Socket;
  private mode: 'managed' | 'managed-ai' = 'managed';

  constructor(private url = process.env.NEXT_PUBLIC_WS_URL ?? '') {}

  connect(): void {
    if (!this.url) {
      console.warn('[IntersectIA] No NEXT_PUBLIC_WS_URL configured; skipping socket connection.');
      return;
    }
    if (this.socket?.connected) return;
    const socket = io(this.url, { transports: ['websocket'] });
    this.socket = socket;
    socket.on('connect', () => {
      this.setMode(this.mode);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
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
}

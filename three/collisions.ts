let enabled = false;

export function setCollisionsState(v: boolean): void {
  enabled = v;
}

export function isCollisionsEnabled(): boolean {
  return enabled;
}
let enabled = false;

export function setTurnsState(v: boolean): void {
  enabled = v;
}

export function isTurnsEnabled(): boolean {
  return enabled;
}

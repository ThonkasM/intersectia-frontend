// Rumbo (bearing) de la cámara en grados: 0° = Norte (-Z), 90° = Este (+X).
// Registro a nivel de módulo, igual que fps.ts: el CameraRig publica cada frame
// y la UI se suscribe. No se publica si el valor no cambió lo suficiente.
let heading = 0;
const listeners: ((heading: number) => void)[] = [];

export function getHeading(): number {
  return heading;
}

export function onHeading(fn: (heading: number) => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export function publishHeading(next: number): void {
  const normalized = ((next % 360) + 360) % 360;
  const delta = Math.abs(((normalized - heading + 540) % 360) - 180);
  if (delta < 0.5) return;
  heading = normalized;
  for (const fn of listeners) fn(heading);
}

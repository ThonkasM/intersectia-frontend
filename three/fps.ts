let fps = 0;
let frames = 0;
let lastTime = performance.now();
const listeners: ((fps: number) => void)[] = [];

// Llama cada frame; cada ~500ms publica el FPS calculado.
export function recordFrame(): void {
  frames += 1;
  const now = performance.now();
  if (now - lastTime >= 500) {
    fps = Math.round((frames * 1000) / (now - lastTime));
    frames = 0;
    lastTime = now;
    for (const fn of listeners) fn(fps);
  }
}

export function onFps(fn: (fps: number) => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}
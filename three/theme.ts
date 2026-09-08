export type SceneTheme = 'light' | 'dark';

export type ScenePalette = {
  background: number;
  ambient: number;
  ambientIntensity: number;
  directional: number;
  directionalIntensity: number;
  ground: number;
  asphalt: number;
  centerLine: number;
  dash: number;
};

export const SCENE_PALETTES: Record<SceneTheme, ScenePalette> = {
  dark: {
    background: 0x0a0e14,
    ambient: 0x2a3648,
    ambientIntensity: 1.1,
    directional: 0xbfd4ff,
    directionalIntensity: 0.9,
    ground: 0x0c1117,
    asphalt: 0x1b2431,
    centerLine: 0xf5a623,
    dash: 0x3a4a5e,
  },
  light: {
    background: 0xd7e0ea,
    ambient: 0xffffff,
    ambientIntensity: 0.85,
    directional: 0xffffff,
    directionalIntensity: 0.95,
    ground: 0xc3ced9,
    asphalt: 0x8b98a8,
    centerLine: 0xb45309,
    dash: 0xf1f5f9,
  },
};

class ThemeBridge {
  current: SceneTheme = 'dark';
  private listeners = new Set<(theme: SceneTheme) => void>();

  constructor() {
    if (typeof document === 'undefined') return;
    this.current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    const observer = new MutationObserver(() => {
      const next: SceneTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      if (next !== this.current) {
        this.current = next;
        this.listeners.forEach((listener) => listener(next));
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  subscribe(listener: (theme: SceneTheme) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const themeBridge = new ThemeBridge();

"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import ThreeCanvas from '@/components/three/ThreeCanvas';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ENGINE_LABELS, STATE_LABELS, type SimMode } from '@/lib/constants';
import { getActiveMode } from '@/three';
import {
  isAdvancedGraphicsOn,
  isAmbientEffectsOn,
  isLightingEffectsOn,
  isPedestriansOn,
  isShadowsOn,
  isTreesOn,
  setAdvancedGraphics,
  setAmbientEffects,
  setLightingEffects,
  setPedestrians as setPedestriansSetting,
  setShadows,
  setTrees as setTreesSetting,
} from '@/three/advancedGraphics';
import { getActiveRig } from '@/three/cameraRig';
import { setCollisionsState } from '@/three/collisions';
import { onFps } from '@/three/fps';
import { hudBridge, type HudSnapshot } from '@/three/hud';
import { setSceneTheme } from '@/three/theme';

const MODES: { key: SimMode; label: string }[] = [
  { key: 'traditional', label: 'Tradicional' },
  { key: 'managed', label: 'IoT gestionado' },
  { key: 'managed-ai', label: 'IoT + IA' },
];

type PanelView =
  | 'menu'
  | 'modos'
  | 'opciones'
  | 'graficos'
  | 'apariencia'
  | 'metricas'
  | 'decisiones';

const VIEW_LABELS: Record<Exclude<PanelView, 'menu'>, string> = {
  modos: 'Modos',
  opciones: 'Opciones',
  graficos: 'Gráficos',
  apariencia: 'Apariencia',
  metricas: 'Métricas',
  decisiones: 'Decisiones',
};

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 ${className}`}
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MenuRow({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-2 rounded-lg border border-overlay-border px-2.5 py-2 text-left transition-colors hover:border-foreground/30 hover:bg-surface-strong"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-foreground">{label}</span>
        {hint ? <span className="block truncate text-xs text-muted">{hint}</span> : null}
      </span>
      <ChevronIcon className="shrink-0 text-muted transition-colors group-hover:text-foreground" />
    </button>
  );
}

function SwitchPill({
  on,
  label,
  onToggle,
  disabled = false,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
        on
          ? 'border-emerald-400/70 bg-emerald-400/25'
          : 'border-overlay-border bg-surface-strong'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span
        className={`size-3.5 rounded-full shadow transition-transform duration-200 ${
          on ? 'translate-x-[20px] bg-emerald-300' : 'translate-x-0.5 bg-muted'
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  active,
  onToggle,
  disabled = false,
  title,
  nested = false,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title?: string;
  nested?: boolean;
}) {
  return (
    <div
      title={title}
      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors ${
        disabled ? '' : 'hover:bg-surface-strong'
      } ${nested ? 'pl-4' : ''}`}
    >
      <span
        className={`text-sm ${
          disabled ? 'text-faint' : active ? 'text-foreground' : 'text-muted'
        }`}
      >
        {label}
      </span>
      <SwitchPill on={active} label={label} onToggle={onToggle} disabled={disabled} />
    </div>
  );
}

export default function DemoPage() {
  // La demo es 100% interactiva (WebGL, WebSocket, mando, tema): se monta solo
  // en el cliente para evitar mismatches de hidratación (server vs client).
  const [mounted, setMounted] = useState(false);
  const [, setZoomTick] = useState(0);
  const { theme } = useTheme();
  useEffect(() => {
    setSceneTheme(theme === 'light' ? 'light' : 'dark');
  }, [theme]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [mode, setMode] = useState<SimMode>('traditional');
  const [advanced, setAdvanced] = useState(isAdvancedGraphicsOn());
  const [ambient, setAmbient] = useState(isAmbientEffectsOn());
  const [lighting, setLighting] = useState(isLightingEffectsOn());
  const [shadow, setShadow] = useState(isShadowsOn());
  const [pedestrians, setPedestrians] = useState(isPedestriansOn());
  const [trees, setTrees] = useState(isTreesOn());
  const [collisions, setCollisions] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<PanelView>('menu');
  const [fps, setFps] = useState(0);
  useEffect(() => onFps(setFps), []);
  const [hud, setHud] = useState<HudSnapshot>({
    mode: 'traditional',
    crossed: 0,
    waiting: 0,
    avgWaitSeconds: null,
    connected: false,
    gamepadConnected: false,
    playerAuthorized: null,
    playerState: null,
    queueLength: 0,
    violations: 0,
    lastDecision: null,
    decisions: [],
    playerLane: 0,
    playerSpeed: 0,
    labelsOn: false,
  });

  useEffect(() => hudBridge.subscribe(setHud), []);

  const isManaged = mode !== 'traditional';
  const firstPersonAvailable = isManaged && hud.gamepadConnected;
  // El modo de cámara lo posee el CameraRig (el botón de la UI y el mando (X) lo cambian).
  const effectiveFirstPerson =
    firstPersonAvailable && getActiveRig()?.mode === 'firstPerson';

  const toggleFirstPerson = () => {
    const rig = getActiveRig();
    if (!rig) return;
    rig.setMode(rig.mode === 'firstPerson' ? 'orbit' : 'firstPerson');
  };

  const handleMiniZoom = (dir: 1 | -1) => {
    const rig = getActiveRig();
    if (!rig) return;
    if (dir === 1) rig.zoomIn();
    else rig.zoomOut();
    setZoomTick((t) => t + 1);
  };
  const zoom = getActiveRig()?.getZoomState();

  const handleReset = () => {
    getActiveRig()?.setMode('orbit');
    getActiveMode()?.reset?.();
  };

  const toggleAdvanced = () => {
    const next = !advanced;
    setAdvanced(next);
    setAdvancedGraphics(next);
  };

  const toggleAmbient = () => {
    const next = !ambient;
    setAmbient(next);
    setAmbientEffects(next);
  };

  const toggleLighting = () => {
    const next = !lighting;
    setLighting(next);
    setLightingEffects(next);
  };

  const toggleShadow = () => {
    const next = !shadow;
    setShadow(next);
    setShadows(next);
  };

  const togglePedestrians = () => {
    const next = !pedestrians;
    setPedestrians(next);
    setPedestriansSetting(next);
  };

  const toggleTrees = () => {
    const next = !trees;
    setTrees(next);
    setTreesSetting(next);
  };

  const toggleCollisions = () => {
    const next = !collisions;
    setCollisions(next);
    setCollisionsState(next);
    getActiveMode()?.setCollisions?.(next);
  };

  const renderPanelBody = () => {
    if (view === 'menu') {
      return (
        <div className="space-y-1.5 p-3">
          <MenuRow
            label="Modos"
            hint={`Actual: ${MODES.find((m) => m.key === mode)?.label ?? '—'}`}
            onClick={() => setView('modos')}
          />
          <MenuRow
            label="Opciones"
            hint={`Globos ${hud.labelsOn ? 'on' : 'off'} · Colisiones ${collisions ? 'on' : 'off'}`}
            onClick={() => setView('opciones')}
          />
          <MenuRow
            label="Gráficos"
            hint={advanced ? 'Avanzados on' : 'Avanzados off'}
            onClick={() => setView('graficos')}
          />
          <MenuRow
            label="Apariencia"
            hint={theme === 'light' ? 'Tema claro' : 'Tema oscuro'}
            onClick={() => setView('apariencia')}
          />
        </div>
      );
    }

    if (view === 'modos') {
      return (
        <div className="space-y-1.5 p-3">
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                  active
                    ? 'border-amber-400/70 bg-amber-400/10 text-accent-text'
                    : 'border-overlay-border text-muted hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    active ? 'bg-amber-400' : 'bg-muted/40'
                  }`}
                />
              </button>
            );
          })}
        </div>
      );
    }

    if (view === 'opciones') {
      return (
        <div className="space-y-1.5 p-3">
          <ToggleRow
            label="Mostrar globos"
            active={hud.labelsOn}
            onToggle={() => hudBridge.setLabelsOn(!hud.labelsOn)}
          />
          <ToggleRow
            label="Activar colisiones"
            title="Si el jugador choca con un vehículo, ambos se detienen unos segundos y se recuperan"
            active={collisions}
            onToggle={toggleCollisions}
          />
          <ToggleRow
            label="Primera persona"
            title={
              firstPersonAvailable
                ? 'Vista del conductor + minimapa'
                : 'Conecta un mando en modo gestionado para usar esta vista'
            }
            active={effectiveFirstPerson}
            onToggle={toggleFirstPerson}
            disabled={!firstPersonAvailable}
          />
        </div>
      );
    }

    if (view === 'graficos') {
      return (
        <div className="space-y-1.5 p-3">
          <ToggleRow
            label="Gráficos avanzados"
            active={advanced}
            onToggle={toggleAdvanced}
          />
          {advanced && (
            <div className="space-y-1.5">
              <ToggleRow
                nested
                label="Efectos ambientales"
                title="Cielo: sol y nubes (claro) o luna y estrellas con luz lunar (oscuro)"
                active={ambient}
                onToggle={toggleAmbient}
              />
              <ToggleRow
                nested
                label="Iluminación"
                title="Iluminación de faros de vehículos y farolas (solo de noche)"
                active={lighting}
                onToggle={toggleLighting}
              />
<ToggleRow
                    nested
                    label="Sombra"
                    title="Sombras estáticas de casas, faroles y objetos del entorno"
                    active={shadow}
                    onToggle={toggleShadow}
                  />
                  <ToggleRow
                    nested
                    label="Peatones"
                    title="Personas caminando por el césped y conversando en las bancas"
                    active={pedestrians}
                    onToggle={togglePedestrians}
                  />
                  <ToggleRow
                    nested
                    label="Arboles"
                    title="Árboles en el césped y palmeras junto a las veredas"
                    active={trees}
                    onToggle={toggleTrees}
                  />
                </div>
              )}
        </div>
      );
    }

    if (view === 'apariencia') {
      return (
        <div className="space-y-1.5 p-3">
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
            <span className="text-sm text-muted">Tema claro / oscuro</span>
            <ThemeToggle />
          </div>
        </div>
      );
    }

    return null;
  };

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0e14]">
        <p className="text-sm text-white/50">Cargando demo…</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0e14]">
      <ThreeCanvas mode={mode} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4">
        <Link
          href="/"
          className="pointer-events-auto rounded-lg border border-overlay-border bg-overlay px-3 py-2 text-sm text-foreground transition-colors hover:border-foreground/40"
        >
          ← Volver
        </Link>

        <div className="hidden flex-col items-center gap-1 sm:flex">
          <h1 className="text-sm font-medium text-foreground">
            Demo · Gestión autónoma de intersección
          </h1>
          <span className="rounded-full border border-overlay-border bg-overlay px-2 py-0.5 font-mono text-[11px] text-muted">
            {fps} fps
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-controls="demo-panel"
            aria-label={panelOpen ? 'Cerrar panel de control' : 'Abrir panel de control'}
            title={panelOpen ? 'Cerrar panel' : 'Abrir panel'}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              panelOpen
                ? 'border-amber-400/60 bg-amber-400/10 text-accent-text'
                : 'border-overlay-border text-muted hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {panelOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M4 21v-7" />
                <path d="M4 10V3" />
                <path d="M12 21v-9" />
                <path d="M12 8V3" />
                <path d="M20 21v-5" />
                <path d="M20 12V3" />
                <path d="M2 14h4" />
                <path d="M10 8h4" />
                <path d="M18 16h4" />
              </svg>
            )}
            <span>Panel</span>
          </button>
        </div>
      </div>

      {/* Métricas abajo a la derecha. En primera persona el minimapa ya muestra
          estado, velocidad y carril del jugador, así que ese bloque se omite. */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-2">

        <div className="pointer-events-auto rounded-xl border border-overlay-border bg-overlay p-3 text-xs text-muted backdrop-blur">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Métricas
          </p>
          <dl className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted">Cruzados</dt>
              <dd className="font-semibold text-foreground">{hud.crossed}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted">En espera</dt>
              <dd className="font-semibold text-foreground">{hud.waiting}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted">En cola</dt>
              <dd className="font-semibold text-foreground">{hud.queueLength}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted">Violaciones</dt>
              <dd className="font-semibold text-foreground">{hud.violations}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted">Espera media</dt>
              <dd className="font-semibold text-foreground">
                {hud.avgWaitSeconds === null ? '—' : `${hud.avgWaitSeconds.toFixed(2)}s`}
              </dd>
            </div>
            {isManaged && (
              <div className="flex items-center justify-between gap-2 border-t border-overlay-border/70 pt-1">
                <dt className="flex items-center gap-2 text-muted">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      hud.connected ? 'bg-emerald-400' : 'bg-red-500'
                    }`}
                  />
                  Backend
                </dt>
                <dd className="text-muted">{hud.connected ? 'conectado' : 'desconectado'}</dd>
              </div>
            )}
            {isManaged && hud.gamepadConnected && !effectiveFirstPerson && (
              <div className="space-y-1 border-t border-overlay-border/70 pt-1">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Jugador · carril {hud.playerLane}</dt>
                  <dd className="font-mono font-semibold text-foreground">
                    {hud.playerSpeed.toFixed(1)} u/s
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Estado</dt>
                  <dd className="font-semibold text-accent-text">
                    {hud.playerState ? STATE_LABELS[hud.playerState] : '—'}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Panel lateral colapsable con navegación interna */}
      {panelOpen && (
        <aside
          id="demo-panel"
          className="absolute bottom-[16rem] right-3 top-20 z-20 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-overlay-border bg-overlay shadow-2xl backdrop-blur"
        >
          <header className="flex items-center gap-2 border-b border-overlay-border/70 px-3 py-2.5">
            {view !== 'menu' && (
              <button
                type="button"
                onClick={() => setView('menu')}
                aria-label="Volver al panel"
                title="Volver al panel"
                className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-strong hover:text-foreground"
              >
                <ChevronIcon className="rotate-180" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {view === 'menu' ? 'Panel de control' : VIEW_LABELS[view]}
              </p>
              <p className="truncate text-[11px] text-faint">
                {view === 'menu' ? 'Navegación de la demo' : `Panel › ${VIEW_LABELS[view]}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Ocultar panel"
              title="Ocultar panel"
              className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-strong hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">{renderPanelBody()}</div>

          <footer className="border-t border-overlay-border/70 p-3">
            {isManaged && (
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      hud.connected ? 'bg-emerald-400' : 'bg-red-500'
                    }`}
                  />
                  Backend
                </span>
                <span>{hud.connected ? 'conectado' : 'desconectado'}</span>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    !isManaged
                      ? 'bg-amber-400'
                      : hud.gamepadConnected
                        ? 'bg-emerald-400'
                        : 'bg-red-500'
                  }`}
                />
                Mando
              </span>
              <span>
                {!isManaged
                  ? 'disponible en gestionado'
                  : hud.gamepadConnected
                    ? `conectado${hud.playerState ? ` · ${STATE_LABELS[hud.playerState]}` : ''}`
                    : 'presiona un botón para conectar'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-400/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reiniciar simulación
            </button>
          </footer>
        </aside>
      )}

      {isManaged && !hud.connected && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full border border-overlay-border bg-overlay px-4 py-1.5 text-sm text-muted backdrop-blur">
          Conectando al gestor de intersección…
        </div>
      )}

      {effectiveFirstPerson && (
        <>
          <div className="pointer-events-none absolute bottom-4 left-4 h-[220px] w-[220px] overflow-hidden rounded-xl border border-white/25 bg-black/20 shadow-lg" />

          {/* Info del jugador dentro del minimapa */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex w-[220px] justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1 backdrop-blur">
              <span
                className={`h-2 w-2 rounded-full ${
                  hud.playerState === 'crossing'
                    ? 'bg-emerald-400'
                    : hud.playerState === 'queued'
                      ? 'bg-red-400'
                      : 'bg-sky-400'
                }`}
              />
              <span className="text-[11px] font-semibold text-white">
                {hud.playerState ? STATE_LABELS[hud.playerState] : '—'}
              </span>
              <span className="h-3 w-px bg-white/25" />
              <span className="font-mono text-[11px] text-white/85">
                {hud.playerSpeed.toFixed(1)} u/s
              </span>
              <span className="h-3 w-px bg-white/25" />
              <span className="font-mono text-[11px] text-amber-300">C{hud.playerLane}</span>
            </div>
          </div>

          {/* Botones de zoom junto al minimapa */}
          <div className="absolute bottom-4 left-[236px] flex flex-col gap-1.5">
            <button
              onClick={() => handleMiniZoom(1)}
              disabled={zoom ? zoom.value <= zoom.min : false}
              aria-label="Acercar minimapa"
              title="Acercar (o Y en el mando)"
              className={`flex h-9 w-9 items-center justify-center rounded-full border bg-overlay text-lg font-bold shadow-md transition-colors ${
                zoom && zoom.value > zoom.min
                  ? 'border-overlay-border text-foreground hover:border-amber-400 hover:text-accent-text'
                  : 'cursor-not-allowed border-overlay-border text-muted opacity-40'
              }`}
            >
              +
            </button>
            <button
              onClick={() => handleMiniZoom(-1)}
              disabled={zoom ? zoom.value >= zoom.max : false}
              aria-label="Alejar minimapa"
              title="Alejar"
              className={`flex h-9 w-9 items-center justify-center rounded-full border bg-overlay text-lg font-bold shadow-md transition-colors ${
                zoom && zoom.value < zoom.max
                  ? 'border-overlay-border text-foreground hover:border-amber-400 hover:text-accent-text'
                  : 'cursor-not-allowed border-overlay-border text-muted opacity-40'
              }`}
            >
              −
            </button>
          </div>
        </>
      )}

      {/* Decisiones: panel centrado en la parte inferior */}
      <div
        className={`pointer-events-auto absolute bottom-4 left-1/2 z-10 w-96 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 overflow-y-auto rounded-xl border border-overlay-border bg-overlay p-3 text-xs text-muted backdrop-blur ${
          effectiveFirstPerson ? 'max-h-32' : 'max-h-48'
        }`}
      >
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-accent-text">
          Decisiones
        </p>
        {hud.decisions.length === 0 ? (
          <p className="text-faint">Sin decisiones aún</p>
        ) : (
          <ul className="space-y-1">
            {hud.decisions.slice(0, 8).map((d) => (
              <li key={`${d.vehicleId}-${d.at}`} className="truncate">
                <span className="font-medium text-accent-text">{ENGINE_LABELS[d.engine]}</span>
                <span className="text-muted">
                  {' '}
                  · vehículo {d.from} · {d.waitSeconds}s
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!effectiveFirstPerson && (
        <p className="pointer-events-none absolute bottom-4 left-4 text-xs text-faint">
          Arrastra para orbitar · Rueda para zoom · Clic en un vehículo para detenerlo/reanudarlo
        </p>
      )}
    </div>
  );
}

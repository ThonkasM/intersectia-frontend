"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ThreeCanvas from '@/components/three/ThreeCanvas';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { ENGINE_LABELS, STATE_LABELS, type SimMode } from '@/lib/constants';
import { getActiveRig } from '@/three/cameraRig';
import { hudBridge, type HudSnapshot } from '@/three/hud';

const MODES: { key: SimMode; label: string }[] = [
  { key: 'traditional', label: 'Tradicional' },
  { key: 'managed', label: 'IoT gestionado' },
  { key: 'managed-ai', label: 'IoT + IA' },
];

export default function DemoPage() {
  // La demo es 100% interactiva (WebGL, WebSocket, mando, tema): se monta solo
  // en el cliente para evitar mismatches de hidratación (server vs client).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [mode, setMode] = useState<SimMode>('traditional');
  const [firstPerson, setFirstPerson] = useState(false);
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
  const effectiveFirstPerson = firstPerson && firstPersonAvailable;

  // Sincroniza la cámara con el toggle (sistema externo). Si el mando se
  // desconecta, la vista cae a órbita automáticamente.
  useEffect(() => {
    getActiveRig()?.setMode(effectiveFirstPerson ? 'firstPerson' : 'orbit');
  }, [effectiveFirstPerson]);

  const toggleFirstPerson = () => {
    setFirstPerson((prev) => !prev);
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

        <h1 className="hidden text-sm font-medium text-foreground sm:block">
          Demo · Gestión autónoma de intersección
        </h1>

        <div className="pointer-events-auto flex items-center gap-2">
          <ThemeToggle />
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`rounded-lg border bg-overlay px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-amber-400 text-accent-text'
                    : 'border-overlay-border text-muted hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {m.label}
              </button>
            );
          })}
          <button
            onClick={() => hudBridge.setLabelsOn(!hud.labelsOn)}
            className={`rounded-lg border bg-overlay px-3 py-2 text-sm transition-colors ${
              hud.labelsOn
                ? 'border-amber-400 text-accent-text'
                : 'border-overlay-border text-muted hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            Etiquetas {hud.labelsOn ? 'on' : 'off'}
          </button>
          <button
            onClick={toggleFirstPerson}
            disabled={!firstPersonAvailable}
            title={
              firstPersonAvailable
                ? 'Vista del conductor + minimapa'
                : 'Conecta un mando en modo gestionado para usar esta vista'
            }
            className={`rounded-lg border bg-overlay px-3 py-2 text-sm transition-colors ${
              effectiveFirstPerson
                ? 'border-amber-400 text-accent-text'
                : 'border-overlay-border text-muted'
            } ${
              firstPersonAvailable
                ? 'hover:border-foreground/40 hover:text-foreground'
                : 'cursor-not-allowed opacity-40'
            }`}
          >
            Primera persona {effectiveFirstPerson ? 'on' : 'off'}
          </button>
        </div>
      </div>

      {isManaged && !hud.connected && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full border border-overlay-border bg-overlay px-4 py-1.5 text-sm text-muted backdrop-blur">
          Conectando al gestor de intersección…
        </div>
      )}

      {effectiveFirstPerson && (
        <div className="pointer-events-none absolute bottom-4 left-4 h-[220px] w-[220px] rounded-xl border border-white/20 bg-black/10" />
      )}

      {!effectiveFirstPerson && (
        <div className="absolute bottom-4 left-4 rounded-xl border border-overlay-border bg-overlay p-4 text-sm text-muted backdrop-blur">
        <p>
          Cruzados: <span className="font-semibold text-foreground">{hud.crossed}</span>
        </p>
        <p>
          En espera: <span className="font-semibold text-foreground">{hud.waiting}</span>
        </p>
        <p>
          En cola: <span className="font-semibold text-foreground">{hud.queueLength}</span>
        </p>
        <p>
          Violaciones: <span className="font-semibold text-foreground">{hud.violations}</span>
        </p>
        <p>
          Espera media:{' '}
          <span className="font-semibold text-foreground">
            {hud.avgWaitSeconds === null ? '—' : `${hud.avgWaitSeconds.toFixed(2)}s`}
          </span>
        </p>
        {isManaged && (
          <p className="mt-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                hud.connected ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <span>{hud.connected ? 'conectado' : 'desconectado — ¿backend en ejecución?'}</span>
          </p>
        )}
        {isManaged && hud.gamepadConnected && (
          <div className="mt-1">
            <p>
              Jugador: carril {hud.playerLane},{' '}
              <span className="font-semibold text-foreground">{hud.playerSpeed.toFixed(1)} u/s</span>
            </p>
            <p>
              Estado:{' '}
              <span className="font-semibold text-accent-text">
                {hud.playerState ? STATE_LABELS[hud.playerState] : '—'}
              </span>
            </p>
          </div>
        )}
      </div>
      )}

      <div className="absolute bottom-12 right-4 w-64 rounded-xl border border-overlay-border bg-overlay p-4 text-xs text-muted backdrop-blur">
        <p className="mb-2 text-sm font-semibold text-accent-text">Decisiones</p>
        {hud.decisions.length === 0 ? (
          <p className="text-faint">Sin decisiones aún</p>
        ) : (
          <ul className="space-y-1">
            {hud.decisions.slice(0, 5).map((d) => (
              <li key={`${d.vehicleId}-${d.at}`} className="truncate">
                <span className="text-accent-text">{ENGINE_LABELS[d.engine]}</span>
                <span className="text-muted">
                  {' '}
                  · vehículo {d.from} · {d.waitSeconds}s
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-overlay-border bg-overlay px-4 py-3 text-sm text-muted backdrop-blur">
        {!isManaged ? (
          <p className="text-muted">Vehículo por mando disponible en modo gestionado</p>
        ) : !hud.gamepadConnected ? (
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>Presiona cualquier botón del mando para conectarlo</span>
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium text-foreground">Mando conectado</span>
            </span>
            <span className="h-4 w-px bg-foreground/30" />
            {hud.playerState ? (
              <span className="font-medium text-accent-text">
                {STATE_LABELS[hud.playerState]}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
        )}
      </div>

      <p className="pointer-events-none absolute bottom-4 right-4 text-xs text-faint">
        Arrastra para orbitar · Rueda para zoom
      </p>
    </div>
  );
}

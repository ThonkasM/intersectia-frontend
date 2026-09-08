"use client";

import { useEffect, useRef } from 'react';
import type { SimMode } from '@/lib/constants';
import { initDemo } from '@/three';
import { ManagedMode } from '@/three/modes/managedMode';
import type { SimulationMode } from '@/three/modes/mode.interface';
import { TraditionalMode } from '@/three/modes/traditionalMode';
import { IntersectionSocket } from '@/three/net/socket';

export default function ThreeCanvas({ mode }: { mode: SimMode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const modeInstance: SimulationMode =
      mode === 'traditional'
        ? new TraditionalMode()
        : new ManagedMode(new IntersectionSocket(), mode);

    const cleanup = initDemo(el, modeInstance);
    return cleanup;
  }, [mode]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
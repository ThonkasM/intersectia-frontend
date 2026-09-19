"use client";

import { useEffect, useState } from "react";
import { onHeading } from "@/three/heading";

const CARDINAL_LABELS = ["N", "E", "S", "W"] as const;

export default function Compass() {
  const [heading, setHeading] = useState(0);

  useEffect(() => onHeading(setHeading), []);

  const rounded = ((Math.round(heading) % 360) + 360) % 360;
  const facing = CARDINAL_LABELS[Math.round(heading / 90) % 4];

  const cardinalClass = (label: string) =>
    `absolute text-[10px] font-semibold transition-colors ${
      label === facing ? "text-accent-text" : "text-muted"
    }`;

  return (
    <div
      role="img"
      aria-label={`Orientación de la cámara: ${rounded}° ${facing}`}
      className="pointer-events-none absolute left-4 top-20 z-10 select-none"
    >
      <div className="relative flex size-16 items-center justify-center rounded-full border border-overlay-border bg-overlay shadow-lg backdrop-blur">
        {/* Aguja: marca hacia dónde mira la cámara sobre la rosa fija. */}
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${heading}deg)` }}
        >
          <span className="absolute left-1/2 top-[16px] h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[5px] border-x-transparent border-b-accent-text" />
          <span className="absolute left-1/2 top-[21px] h-[11px] w-[2px] -translate-x-1/2 rounded-full bg-accent-text" />
        </div>

        <span className={`${cardinalClass("N")} left-1/2 top-0.5 -translate-x-1/2`}>
          N
        </span>
        <span className={`${cardinalClass("E")} right-1 top-1/2 -translate-y-1/2`}>
          E
        </span>
        <span
          className={`${cardinalClass("S")} bottom-0.5 left-1/2 -translate-x-1/2`}
        >
          S
        </span>
        <span className={`${cardinalClass("W")} left-1 top-1/2 -translate-y-1/2`}>
          W
        </span>

        <span className="size-1.5 rounded-full bg-accent-text" />
      </div>

      <p className="mt-1 text-center font-mono text-[10px] text-muted">
        {rounded}° {facing}
      </p>
    </div>
  );
}

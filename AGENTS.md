# IntersectIA Frontend

## Project

IntersectIA is a landing page about IoT & Autonomous Vehicles plus a client-side 3D demo (Three.js) of an autonomous intersection. The frontend is built with Next.js configured with `output: 'export'` for static deployment on S3 + CloudFront. The Three.js demo renders vehicles whose positions are interpolated from messages received over a WebSocket connection to the NestJS backend. The simulation runs server-side; the frontend only renders.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the dev server
- `npm run build` — build the static export (`out/`)
- `npm run lint` — run ESLint

## Architectural conventions

- **Separate state from view**: `three/scene.ts`, `three/road.ts`, and `three/vehicle.ts` MUST NOT import from `three/modes/` or `three/net/`. Dependency flows one way: modes drive vehicles, net provides state.
- **Always interpolate vehicle positions**: remote positions are set via `mesh.position.lerp(targetPos, ...)`, never assigned directly, so movement stays smooth regardless of WebSocket frequency (~20Hz).
- **`initDemo(container, mode)` returns a `cleanup()` function** that cancels the RAF loop, disposes renderer/scene/materials/geometries, and removes the canvas. React `useEffect` MUST call it on unmount — critical to prevent WebGL context leaks ("too many WebGL contexts").
- **Cap pixel ratio**: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — never raw `devicePixelRatio`.
- **Never create `THREE.Geometry`/`Material` inside the render loop.**
- **`SimulationMode` interface**: `{ start(): void; stop(): void; onFrame(dt: number): void }`. `traditionalMode` (local, priority-to-the-right rule, Art. 52 Bolivia) and `managedMode` (delegates to the backend via WebSocket) both implement it and are interchangeable without touching scene/road/vehicle.
- **The frontend NEVER decides who crosses**: in managed mode it only transcribes backend messages to `targetPos`/`state`.
- **HUD communicates with React via a bridge/subscription**, not direct DOM manipulation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

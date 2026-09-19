# IntersectIA Frontend

## Project

Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript, built with `output: 'export'` for static S3 + CloudFront. Two surfaces: a Spanish marketing landing (`app/(marketing)`) and a full-screen interactive Three.js demo at `/demo`. The demo runs a local `traditional` mode and server-authoritative `managed` / `managed-ai` modes over **socket.io** (not raw WebSocket) to the NestJS backend. In managed modes the frontend never decides who crosses — it transcribes backend messages.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the dev server
- `npm run build` — static export to `out/`; this is also the only typecheck
- `npm run lint` — ESLint flat config (`eslint` with no args)
- Verification: `npm run lint && npm run build`. There is **no test framework** in this repo — do not invent `npm test`.

Gotcha: `npm run start` is defined in `package.json` but incompatible with `output: 'export'` (there is no server build). Serve `out/` with a static file server instead.

## Environment

`.env.local` (gitignored) holds `NEXT_PUBLIC_WS_URL` (socket.io URL, e.g. `http://localhost:3000`) and `NEXT_PUBLIC_API_URL` (REST: chat + metrics). See `.env.example`. Both are optional: code degrades gracefully (managed mode warns and stays disconnected without the WS URL).

## Where things live

- `app/` — routes. `(marketing)/layout.tsx` adds Navbar/Footer; `app/demo/page.tsx` is the interactive client page.
- `components/` — React UI only (sections, Navbar/Footer, ThemeProvider/Toggle, ChatWidget, and `three/ThreeCanvas.tsx`).
- `three/` — plain-TS engine, no React. Imported as `@/three`.
- `lib/constants.ts` — shared types/constants (`SimMode`, `Direction`, `VehicleState`, `SIM`, `PLAYER`) used by both React and the engine.
- Path alias `@/*` maps to the repo root.

## Three.js engine contract

- `three/index.ts` `initDemo(container, mode)` is the **only** entrypoint; it returns `cleanup()`. React must call it on unmount (`ThreeCanvas` does) — critical to avoid WebGL context leaks.
- `SimulationMode` (`three/modes/mode.interface.ts`): `start(scene)`, `stop()`, `onFrame(dt)`, plus optional `getPlayerVehicle`, `pickAt`, `toggleVehicleFreeze`, `reset`, `setCollisions`. `TraditionalMode` and `ManagedMode` are **classes**; `ThreeCanvas` swaps them on `mode` change, which fully disposes and remounts the demo.
- Engine-wide mutable singletons: `hudBridge` (`three/hud.ts`), active rig (`three/cameraRig.ts`), registered scene/materials (`three/theme.ts`), `activeMode` (`three/index.ts`). `initDemo`/`cleanup` register and clear them — never run two demos at once.
- Always interpolate vehicles: `Vehicle.syncVisual(dt)` does `mesh.position.lerp(targetPos, ...)`. Never assign positions directly.
- Never build geometries/materials in the render loop. `three/vehicle.ts` uses module-level shared geometries/materials; per-instance state lives in `group.userData` (`beaconMat`, `unregisterHeadlight`). Disposal skips meshes marked `userData.shared = true`, so mark shared resources and dispose per-instance materials explicitly.
- Pixel ratio is capped in `three/scene.ts` (`Math.min(devicePixelRatio, 2)`) — keep it.
- Shadows are static: `renderer.shadowMap.autoUpdate = false`. After rebuilding environment/pedestrians, call `markShadowsDirty()` from `three/shadows.ts` (done in `syncGraphics`).
- `three/index.ts` handles **resize** via `ResizeObserver` + `window.resize` (renderer size, pixel ratio, `cameraRig.resize`); keep both in `cleanup()`.

## Sessions and multiplayer

- Each visitor gets an **isolated backend simulation**. `three/net/socket.ts` generates a `sessionId` (per-tab `sessionStorage`) and sends it in `io(url, { auth: { sessionId } })`. Do not remove this — without it every user shares one simulation.
- `ManagedMode` must coalesce HUD publications (~10 Hz in `onFrame`), not publish on every socket event.

## Docs

- `docs/ARCHITECTURE.md` (layers, session, render loop) and `docs/PERFORMANCE.md` (applied fixes + pending optimizations like instancing/merge and limiting vehicle `PointLight`s).
- Optional visuals (advanced graphics, ambient/lighting/shadows/pedestrians/trees) are module flags in `three/advancedGraphics.ts` with `onGraphicsChange` subscribers. Read them via `is*On()` accessors; `initDemo` builds/disposes their handles on change.
- `three/collisions.ts`, `three/fps.ts`, `three/heading.ts`, `three/shadows.ts`, `three/vehicleLights.ts` are also module-level registries. The `CameraRig` publishes camera bearing to `three/heading.ts`; `Compass.tsx` subscribes to it (throttled by a 0.5° change threshold).

## Demo / UI notes

- Two independent theme systems: React `components/theme/ThemeProvider.tsx` toggles `light`/`dark` on `<html>`; `three/theme.ts` holds the scene palette. `app/demo/page.tsx` bridges them via `setSceneTheme`. Touch both when adding theme-dependent visuals.
- `app/demo/page.tsx` is `"use client"` and defers mounting behind a rAF-set `mounted` flag to avoid WebGL/hydration mismatches. Keep that guard.
- Transient 3D → React state flows through `hudBridge.subscribe`, never direct DOM manipulation.
- Managed mode metrics come from `${NEXT_PUBLIC_API_URL}/metrics/avg?mode=` and `/metrics/summary`; `components/chat/ChatWidget.tsx` POSTs to `/ai/chat`.
- UI copy is Spanish. Use the semantic Tailwind tokens defined in `app/globals.css` (`bg-overlay`, `bg-surface-strong`, `text-muted`, `text-faint`, `border-overlay-border`, `text-accent-text`) rather than raw palette colors.

## Next.js 16 specifics

- Typed routes are on: layouts/pages use generated global prop types like `LayoutProps<"/">` (see `app/layout.tsx`) — no import needed.
- Import Three addons from `three/examples/jsm/...` (e.g. `OrbitControls`, `mergeGeometries`).
- `next-env.d.ts` is generated and gitignored; do not edit it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

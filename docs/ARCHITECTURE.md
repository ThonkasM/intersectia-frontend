# Arquitectura del frontend

Next.js 16 (App Router) + Three.js, con export estático (`output: 'export'`). Landing informativa y demo 3D en `/demo`. En los modos gestionados el frontend **nunca decide quién cruza**: solo interpola el estado que envía el backend.

## Capas del 3D

- `three/index.ts` — único entrypoint `initDemo(container, mode)`; devuelve `cleanup()`.
- `three/scene.ts`, `road.ts`, `vehicle.ts` — escena, calzada y vehículos.
- `three/modes/` — estrategia `SimulationMode`:
  - `traditionalMode.ts` — simulación local (prioridad a la derecha).
  - `managedMode.ts` — cliente del backend (managed / managed-ai).
- `three/net/socket.ts` — `IntersectionSocket` (socket.io-client).
- `three/input/` — gamepad y vehículo del jugador.
- `three/hud.ts` — puente suscripción→React (no manipula el DOM directo).

## Sesión por visitante

`IntersectionSocket` genera un `sessionId` estable por pestaña (`sessionStorage`) y lo envía en `io(url, { auth: { sessionId } })`. Así cada persona recibe su propia simulación del backend. El id del vehículo del jugador es `player` dentro de su sesión.

## Ciclo de render

`requestAnimationFrame` con `dt` limitado a 50 ms. Cada frame: `mode.onFrame(dt)` → `syncVisual` (lerp de posiciones) → render de la cámara principal → render opcional del minimapa. El `cleanup()` cancela el RAF, remueve listeners, dispone recursos y libera el contexto WebGL.

## Comunicación

- `state` (20 Hz) → `ManagedMode.applySnapshot` fija `targetPos`/estado; el `lerp` suaviza.
- `decision` → alimenta el HUD.
- `playerState` a ~15 Hz desde el gamepad.
- Chat: `POST {NEXT_PUBLIC_API_URL}/ai/chat`.

## Variables de entorno

- `NEXT_PUBLIC_WS_URL` — URL del backend para WebSocket.
- `NEXT_PUBLIC_API_URL` — URL del backend para HTTP (métricas, chat).

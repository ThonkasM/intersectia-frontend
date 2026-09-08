# IntersectIA Frontend

Frontend of **IntersectIA**: a landing page about IoT & Autonomous Vehicles plus a 3D demo (Three.js) of an autonomous intersection that connects via WebSocket to a NestJS backend.

Built with Next.js (App Router, TypeScript, Tailwind) and configured for static export (`output: 'export'`) for deployment on S3 + CloudFront.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — build the static export (`out/`)
- `npm run lint` — run ESLint

## Structure

- `app/` — Next.js routes (landing + `/demo`)
- `components/three/` — React wrapper that mounts the Three.js demo
- `three/` — Three.js scene, road, vehicles, net, modes and HUD (stubs pending implementation)

## Environment

See `.env.example`. Requires `NEXT_PUBLIC_WS_URL` (WebSocket) and `NEXT_PUBLIC_API_URL`.
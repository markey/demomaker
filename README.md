# Demomaker (MVP) — Electron App

A modern take on the classic demomaker: real‑time, GPU‑driven visuals with chainable effects, a timeline, and export paths. The app now runs as a desktop Electron application bundling a Vite + React renderer and a TypeScript core engine with Three.js.

## What’s Here (MVP)
- Core engine scaffolding in TypeScript (no globals, deterministic timebase hooks)
- SDK types for Effects and Transitions
- Renderer with Three.js WebGL2, EffectComposer, and a global Bloom pass
- In‑bundle Plugin registry with:
  - Effect: `@pack/wire-morph` (icosahedron points/edges, morph + autorotate)
  - Effect: `@pack/particle-grid` (animated particle heightfield grid)
  - Effect: `@pack/voronoi-flow` (screen‑space voronoi shader)
  - Transition: `@trans/cross-fade` (fullscreen shader mix)
- React UI shell with Zustand store:
  - Library (placeholder), Preview, Timeline, Inspector, Transport
- Export stubs: PNG sequence and silent WAV generator (to be wired in UI)

## Planned (next milestones)
- Full WireMorph shader migration with pulse interactions and starfield
- Transition integration in the render path (two-input blending over ranges)
- AutomationEngine for keyframes and audio link mappings
- AudioEngine analysis (FFT bands, energy, beat detection) and audio‑clock sync
- WebCodecs/MediaRecorder recording, self‑contained HTML export
- Plugin Manager with dynamic import + manifests, more built‑in effects/passes

## Tech Stack
- Runtime: WebGL2 via Three.js r160+ with EffectComposer
- Language/Build: TypeScript, Vite, ES modules
- UI: React 18 + Zustand (state)
- Export: PNG sequence + WAV (stubs now), WebCodecs path later

## Getting Started
Prerequisites:
- Node.js 18+ (or 20+ recommended)
- A GPU/driver supporting WebGL2

Install dependencies:
- `npm install`

Run in development (single command):
- `npm run dev` — starts Vite and launches Electron automatically.

Production build and run:
- `npm run start` — builds the renderer and launches Electron using the built `dist/index.html`.

Scripts:
- `npm run dev` — Unified dev (Vite + Electron)
- `npm run start` — Build then run Electron against local files
- `npm run build` — Type check + production build of the renderer
- `npm run preview` — Serve the production build (browser only, optional)
- `npm run typecheck` — TypeScript project check

## Project Structure
- `src/ui/` — React UI components (App shell, Preview, Timeline, Inspector, Transport)
- `src/state/` — Zustand store and project JSON types
- `src/engine/` — Core engine modules (renderer, resources, audio stub, scheduler, export)
- `src/plugins/` — In‑bundle plugins
  - `effects/WireMorph` — MVP WireMorph effect skeleton
  - `effects/ParticleGrid` — Instanced points animated as a wave grid
  - `effects/VoronoiFlow` — Fullscreen shader effect
  - `transitions/CrossFade` — Basic cross‑fade shader pass
- `src/utils/` — Utilities (seeded RNG, WAV encoder)
 - `electron/` — Electron main and preload (desktop shell)

## The Project Model (MVP)
Defined in the Zustand store as a single JSON source of truth. Example default:
```
{
  "schema": 1,
  "meta": { "title": "My Demo", "fps": 60, "resolution": [1280, 720], "duration": 20, "bpm": 120 },
  "tracks": [
    { "id": "fx1", "kind": "effect", "module": "@pack/wire-morph", "range": [0, 20], "params": { "morph": 0.0, "autoRotate": true, "palette": 0 } }
  ],
  "post": [
    { "pass": "Bloom", "params": { "strength": 0.8, "radius": 0.2, "threshold": 0.8 } }
  ]
}
```

In the UI, adjust `morph` and `autoRotate` from the Inspector and see changes live in the Preview.

## SDK Overview
Effect modules implement:
```
export interface EffectModule<P> {
  meta: { id: string; name: string; author?: string; version: string };
  defaultParams: P;
  schema?: JSONSchema7;
  init(ctx: EffectContext, params: P): Promise<EffectInstance> | EffectInstance;
}
```

Transition modules implement:
```
export interface TransitionModule<P> {
  meta: { id: string; name: string; version: string };
  defaultParams: P;
  init(ctx: EffectContext, params: P): TransitionInstance;
}
```

See `src/plugins/effects/WireMorph` and `src/plugins/transitions/CrossFade.ts` for minimal examples. The MVP uses a simple in‑bundle registry; this will be replaced by a dynamic Plugin Manager.

## Export (MVP)
- PNG sequence (offscreen read via canvas.toBlob): `ExportPipeline.exportPNGSequence({ onFrame })`
- Silent WAV generation (placeholder): `ExportPipeline.exportSilentWAV(durationSec)`

These are stubs for wiring into a proper Exporter UI and eventual WebCodecs/MediaRecorder paths.

## Browser Support
- Electron (Chromium) with WebGL2 enabled. High‑DPI and post effects scale with DPR and window size.

## Troubleshooting
- Black screen: Ensure your GPU supports WebGL2. In Electron dev mode, open DevTools (View → Toggle Developer Tools) and check console for WebGL context errors.
- Type errors: Run `npm run typecheck` for details.
- Performance: Reduce window size; bloom is active by default in the project JSON.

## Contributing / Next Tasks
- Hook transport/audio time into the renderer and scheduler
- Migrate full WireMorph shader and pulse interactions
- Implement AutomationEngine (keyframes + audio mapping)
- Integrate transition evaluation on track ranges
- Add recording/export UI and single‑file export

---
This is an early MVP scaffold intended to iterate quickly toward the full feature set described in the architecture plan.

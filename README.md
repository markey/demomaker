# Demomaker (MVP)

A modern take on the classic demomaker: real‑time, GPU‑driven visuals with chainable effects, a timeline, and export paths. This repository contains the initial MVP scaffold: a TypeScript core, React UI shell, a minimal effect and transition, and a global post chain wired through Three.js.

## What’s Here (MVP)
- Core engine scaffolding in TypeScript (no globals, deterministic timebase hooks)
- SDK types for Effects and Transitions
- Renderer with Three.js WebGL2, EffectComposer, and a global Bloom pass
- In‑bundle Plugin registry with:
  - Effect: `@pack/wire-morph` (icosahedron points/edges, morph + autorotate)
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

Install and run:
- `npm install`
- `npm run dev`
- Open http://localhost:5173

Build and preview:
- `npm run build`
- `npm run preview` (serves the production build)

Scripts:
- `npm run dev` — Vite dev server
- `npm run build` — Type check + production build
- `npm run preview` — Preview prod build
- `npm run typecheck` — TypeScript project check

## Project Structure
- `src/ui/` — React UI components (App shell, Preview, Timeline, Inspector, Transport)
- `src/state/` — Zustand store and project JSON types
- `src/engine/` — Core engine modules (renderer, resources, audio stub, scheduler, export)
- `src/plugins/` — In‑bundle plugins
  - `effects/WireMorph` — MVP WireMorph effect skeleton
  - `transitions/CrossFade` — Basic cross‑fade shader pass
- `src/utils/` — Utilities (seeded RNG, WAV encoder)

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
- Modern Chromium/Firefox with WebGL2 enabled. High‑DPI and post effects scale with DPR and preview size.

## Troubleshooting
- Black screen: Check WebGL2 support `chrome://gpu` or browser flags, ensure a GPU is available.
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

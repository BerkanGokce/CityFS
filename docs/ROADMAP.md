# CityFS roadmap

Status updated: 2026-10-23

## Phase 1 — Foundation and codec

- [x] React, TypeScript, Vite, ESLint, Prettier, Vitest, and Playwright project foundation
- [x] Versioned `CFS1` binary envelope with bounded UTF-8 fields and SHA-256
- [x] Exhaustive byte-to-architecture symbol mapping
- [x] Canonical integer-unit building and grid schema
- [x] Geometry-only decode path and `.cityfs` validation
- [x] Corruption, mutation, determinism, randomized, and import/export tests

## Phase 2 — Functional 3D interface

- [x] Instanced building bodies, four physical roof geometries, and four window patterns
- [x] Orbit, pan, zoom, top-down view, and camera reset
- [x] Upload/encode workflow and built-in demo
- [x] Building inspection and city/data visualization modes
- [x] Progress, limits, and accessible error status

## Phase 3 — Portable workflow

- [x] Canonical `.cityfs` export
- [x] Fresh-session import and validation
- [x] SHA-256 verified reconstruction and safe download
- [x] Playwright upload/export/import/decode workflow

## Phase 4 — Polish and engineering quality

- [x] Responsive visual system and efficient instanced rendering
- [x] Public documentation and format specifications
- [x] Publish representative codec and viewport benchmark numbers on stated hardware
- [ ] Add screenshots/GIFs to the README

## Phase 5 — Research (not part of MVP)

- [ ] Higher-density encoding
- [ ] Error correction
- [ ] Mesh/GLB recovery experiments
- [ ] Authenticated encryption option
- [ ] Worker offload and WebGPU profiling

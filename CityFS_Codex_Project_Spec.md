# CityFS — A Filesystem Made of Cities

> **Instructions for Codex:** This document is the authoritative product and engineering specification for a new repository. Build a functional, well-tested application rather than a mockup. Make reasonable implementation decisions autonomously, explain major trade-offs, and work incrementally. Do not claim a feature works unless you have implemented and tested it.

## 1. Mission

Build **CityFS**, a local-first web application that converts arbitrary files into explorable, procedurally generated 3D cities and can recover the **exact original bytes** from the exported city's architectural representation.

**Core workflow:**

1. User uploads a file (e.g., `.txt`, `.png`, `.pdf`, `.zip`).
2. The app reads the file as bytes, optionally compresses it losslessly, and encodes the payload into discrete architectural features.
3. The app displays an interactive 3D city. Users can orbit, pan, zoom, inspect buildings, and see which features encode bits.
4. The user exports a portable **CityFS city artifact**.
5. Later, the user imports that artifact, the decoder reads the architectural features, validates integrity, and downloads the original file with the same bytes and filename.

**Non-negotiable:** Do not cheat by placing the original file or a Base64 payload in scene metadata, custom properties, object names, hidden JSON fields, or an unrelated attachment. The recoverable payload must be encoded in architectural properties (geometry and/or discrete, visibly manifested building features). Minimal header metadata (format version, payload length, checksum, original filename, codec selection, etc.) is allowed for reliable decoding, but it must not carry the original payload itself. Clearly distinguish the *container format* from the *architecture-encoded data*.

## 2. Product principles

- **Real reversibility:** For supported file sizes, decoded bytes must equal uploaded bytes exactly; verify with SHA-256.
- **Architecture is data:** A building's height, roof geometry, and/or window geometry are machine-readable symbols, not just decorative visuals.
- **Determinism:** The same input and encoding settings produce the same canonical encoded city. Visual styling may be separately randomized but must not affect decoding.
- **Local-first/privacy:** Process file contents entirely in the browser for MVP; no uploads to a server, analytics, or third-party file processing.
- **Honest capacity limits:** Show how many bytes/buildings are required. Never imply that arbitrary data can fit in a tiny city without sufficient encoded capacity.
- **Usable product:** Make the interface attractive, fast, and intuitive, not merely a programming demonstration.
- **Reliable export:** Export/import a canonical CityFS format first. A general-purpose GLB is optional and should not be advertised as losslessly decodable unless implemented and verified end to end.
- **No false security claims:** CityFS is an unconventional encoding and visualization technique, **not encryption**. Do not call the stored data secure or secret unless optional real encryption is implemented.

## 3. Recommended stack

- React + TypeScript + Vite
- Three.js + React Three Fiber + `@react-three/drei`
- Tailwind CSS for styling (or equivalent lightweight styling approach)
- Vitest for unit/property tests; Playwright for end-to-end browser tests
- Browser File API, Blob, ArrayBuffer, Web Crypto SHA-256
- Optional browser-native CompressionStream/DecompressionStream where supported, with explicit compatibility handling
- Optional Web Workers for large encoding/decoding jobs

Use current stable, mutually compatible package versions. Avoid unnecessary backend services and excessive dependencies.

## 4. Core encoding design (MVP)

### 4.1 Symbol mapping

Start with an **unambiguous reversible scheme**: one payload byte per building, with 8 bits distributed across discrete architectural features:

- **Height tier:** 4 bits (16 distinct heights, e.g. `height = baseHeight + tier * heightStep`).
- **Roof geometry:** 2 bits (4 distinct shapes, e.g. flat, gable, pyramid, stepped). Roof types must be represented in actual geometry, not only color.
- **Window geometry pattern:** 2 bits (4 distinct patterns, e.g. arrangement of recessed/protruding window panels). Patterns must be recoverable from canonical building geometry, not merely materials.

Given byte `b` (0–255):

- `heightTier = (b >> 4) & 0x0F`
- `roofCode = (b >> 2) & 0x03`
- `windowCode = b & 0x03`

Inverse:

- `b = (heightTier << 4) | (roofCode << 2) | windowCode`

Write tests covering **all 256 byte values**.

**Critical implementation requirement:** The decoder must recover these symbols from the serialized **architectural representation**, not from a stored `byteValue`, `heightTier`, `roofCode`, or `windowCode` field. A canonical geometric representation is acceptable for MVP, e.g., a documented typed list of building primitives with numeric dimensions and shape descriptors that fully determine the rendered geometry. Better still, decode from quantized mesh geometry if feasible. Do not store both an authoritative bit field and a decorative building and pretend that the building carries the data.

### 4.2 City layout

- Assign each byte a deterministic building position on a grid or block-based city plan.
- Include streets, sidewalks, blocks, lighting, ground plane, and optional parks as **non-data-bearing decoration**.
- Maintain a documented deterministic traversal order (e.g. row-major) for decoding.
- Encode building order through deterministic coordinates and a documented grid spacing, rather than object names or arbitrary array order.
- Separate data-bearing buildings from decorative geometry with a formal, documented canonical schema.
- Avoid ambiguity due to floating-point rounding: use discrete integer units in the canonical representation; convert to world-space coordinates for rendering.
- A city of N payload bytes needs N data-bearing buildings in the initial scheme, plus any header/error-correction structures if encoded architecturally. State this cost transparently.

### 4.3 Envelope and file recovery

Define a **versioned binary envelope** before mapping bytes to buildings. Suggested fields:

- Magic identifier: `CFS1`
- Format version
- Original byte length
- Encoded payload byte length
- Original filename (UTF-8 with bounded length and sanitized on download)
- Compression flag and algorithm identifier
- SHA-256 digest of the original file
- Payload bytes (raw or losslessly compressed)

The envelope can itself be encoded in the city as buildings. This is preferred because the entire recoverable file and necessary reconstruction metadata then live in the architecture. If using a small out-of-band manifest for initial implementation, clearly disclose it and ensure the payload remains entirely architectural.

Use a precise binary format with documented byte order, field widths, maximum sizes, validation, and bounds checks. Avoid ambiguous terminators. Reject corrupt or unsupported inputs gracefully.

**Integrity:** Decode envelope → decompress if needed → check original length → compute SHA-256 → compare digest. Do not report success on a checksum mismatch.

### 4.4 Export/import

Implement a **canonical `.cityfs` file** (binary or JSON-based container) that stores the architectural primitives, city dimensions, format version, and minimal rendering information. It must **not** contain the original file bytes in a separate payload field. On import, derive the bytes by decoding the architectural primitives.

Design the export so that deleting any optional visual metadata does not prevent reconstruction. Include a documented example of the file format. Use schema validation and input limits. Preserve the exact original file bytes, and restore the filename safely.

Optional: support GLB export for sharing/viewing. Do not promise recovery from arbitrary third-party GLB edits, screenshots, or lossy transformations in MVP. A future GLB decoder must inspect geometry, not custom metadata containing original bytes.

## 5. UI and interaction

Build a polished responsive interface with:

### Landing/empty state
- Project name, short explanation, clear drag-and-drop upload area and file picker.
- Privacy statement: "Your file stays in your browser."
- A small sample file/demo city available without uploading anything.

### City workspace
- Large interactive 3D viewport, orbit/pan/zoom, reset camera, and optional top-down view.
- Clean architectural visual style: readable roads, blocks, buildings, shadows, and restrained colors.
- File panel: name, type, original size, encoded size, building count, encoding time, SHA-256.
- Capacity and performance warnings for large files.
- Hover/click building inspection: grid coordinate, byte index, height tier, roof code, window code, reconstructed byte in binary and hex. This inspection can display derived symbols in UI state; they must not be relied upon for decoding the exported city.
- Toggle between "City view" and "Data view" (data view highlights encoded features).
- Buttons: **Encode**, **Export City**, **Import City**, **Decode File**, **Reset**.
- Progress indicators and accessible error messages.

### Decode experience
- Import `.cityfs`, validate its format, reconstruct bytes, show integrity verification, and allow downloading the recovered original file.
- Clearly distinguish "file decoded successfully" from "city loaded but failed validation".

### Performance
- Use instanced meshes or efficient geometry batching for repeated features where possible.
- Keep render geometry separate from canonical encoded data.
- Avoid generating tens of thousands of independent React components.
- Start with a conservative MVP limit (for example 4 KiB of envelope bytes if one byte equals one building), measure performance, then increase it based on actual benchmarks. Warn users before expensive operations.
- Prefer Web Workers and chunked processing when needed; keep the UI responsive.

## 6. Architecture and suggested repo structure

```text
cityfs/
  README.md
  AGENTS.md                    # Codex-specific working instructions
  docs/
    ARCHITECTURE.md
    ENCODING_SPEC.md
    FORMAT_SPEC.md
    ROADMAP.md
  src/
    app/
    components/
      FileDropzone.tsx
      CityViewport.tsx
      BuildingInspector.tsx
      FileInfoPanel.tsx
      Toolbar.tsx
    city/
      generateCity.ts
      geometry.ts
      renderCity.ts
    codec/
      envelope.ts
      encode.ts
      decode.ts
      symbols.ts
      integrity.ts
      cityfsFormat.ts
    workers/
    types/
    utils/
  tests/
    codec/
    integration/
    e2e/
  public/
    samples/
```

Adjust filenames as needed, but maintain strong separation between: (1) binary codec, (2) canonical city data model, (3) rendering, (4) import/export, and (5) UI.

The codec should be testable **without a browser or Three.js**. Define clear TypeScript interfaces and avoid coupling core correctness to visual components.

## 7. Milestones and acceptance criteria

### Phase 1 — Foundation and codec (complete before visual polish)

1. Scaffold Vite + React + TypeScript and configure linting, formatting, tests.
2. Define envelope, symbol mapping, canonical city geometry representation, and `.cityfs` schema.
3. Implement file → envelope → architectural primitives.
4. Implement architectural primitives → envelope → original file.
5. Implement checksum verification and robust validation.
6. Unit-test every byte value and round-trip files containing empty content, ASCII, Unicode UTF-8, random binary, zero bytes, and representative image/PDF/ZIP byte sequences.
7. Test that modifying a building's encoded height/roof/window changes the decoded byte or causes integrity validation failure.
8. Test that deleting all optional decorative/metadata fields still permits decoding.

**Exit condition:** A complete, deterministic, exact round trip exists using only canonical architectural data.

### Phase 2 — Functional 3D interface

1. Render the canonical city with roads, blocks, buildings, and encoded roof/window geometries.
2. Implement upload, encode, viewport navigation, and building inspection.
3. Add progress/errors and demo city.
4. Confirm displayed buildings faithfully reflect the canonical encoded features.

**Exit condition:** Users can upload a small file and explore the actual data-bearing city.

### Phase 3 — Portable import/export and complete workflow

1. Export `.cityfs`.
2. Import `.cityfs` in a fresh session with no original file present.
3. Decode and download the original file.
4. Show hash comparison and errors for corrupted or invalid cities.
5. Add automated browser E2E tests for upload → encode → export → import → decode.

**Exit condition:** File reconstruction works after a fresh import, with no hidden dependence on previous application state.

### Phase 4 — Polish and engineering quality

1. Improve visual design, camera presets, accessibility, and responsive layout.
2. Profile rendering and optimize large cities.
3. Add a small benchmark table (file size, building count, encode/decode times, frame rate on stated hardware).
4. Write public-facing README with screenshots or GIFs, installation steps, architecture explanation, limitations, and a demo walkthrough.
5. Ensure production build, type-checking, and tests pass.

### Phase 5 — Optional research extensions (not MVP blockers)

- Multi-byte-per-building encodings and capacity optimization.
- Reed–Solomon or other error correction for imperfect geometry.
- Robust recovery from mesh export/import transformations.
- Scanning/reconstruction from rendered images or physical 3D prints (research-grade, not guaranteed).
- Alternative city planning schemes and encoding channels.
- User-selectable themes that do not alter encoded symbols.
- Optional encryption using standard authenticated encryption before encoding (do not invent cryptography).
- Optional WebGPU or worker-based acceleration.

## 8. Testing requirements

At minimum, implement automated tests for:

- Exhaustive `decode(encode(b)) === b` for every byte `b` from 0 to 255.
- Exact round-trip for empty files, random binary arrays, embedded null bytes, large enough samples, and arbitrary extensions.
- Filename Unicode and sanitization behavior.
- Identical canonical city output for identical inputs/settings.
- Correct recovery after exporting and re-importing `.cityfs` in an isolated process/session.
- Correct failure on truncated, malformed, oversized, unsupported-version, and checksum-invalid files.
- Mutation of data-bearing geometry affecting recovered symbols or failing checksum.
- Recovery without decorative geometry, UI state, original file buffers, or duplicated byte fields.
- UI workflow in Playwright.

Include at least one property-based/randomized test with a fixed seed for reproducibility. Report test results, not just assertions that tests were written.

## 9. Known limitations to document

- Initial density is low: approximately **one encoded byte per building** before envelope overhead.
- The generated city may be much larger than the original file. This is an artistic/informational encoding, **not compression**.
- Optional lossless compression can reduce building count for compressible files, but cannot guarantee reduction for all inputs.
- Arbitrary screenshots, images, video captures, lossy mesh simplification, and 3D printing are **not** guaranteed to preserve recoverability.
- The scheme is not secure against inspection and does not provide confidentiality by itself.
- Browser memory/GPU capacity limits supported file sizes.

## 10. Codex execution instructions

1. Inspect the repository first. If empty, scaffold it. If nonempty, preserve existing work and adapt the plan.
2. Write a brief implementation plan and update `docs/ROADMAP.md` as work progresses.
3. Implement Phase 1 completely before investing heavily in 3D polish.
4. Run tests, type-check, lint, and build after each major milestone. Fix failures rather than ignoring them.
5. Do not leave placeholder buttons, simulated decode success, or fake checksums in the final MVP.
6. Prefer straightforward, documented solutions over clever but fragile abstractions.
7. If a proposed encoding feature is not truly reversible from the canonical geometry, redesign it or label it as decorative.
8. Do not silently substitute a hidden raw-byte payload or file hash for architectural encoding.
9. When encountering ambiguity, choose the simplest robust solution consistent with the mission, record the decision in `docs/ARCHITECTURE.md`, and continue.
10. Keep changes modular, with meaningful commits if Git is initialized and commits are appropriate. Do not push to a remote without permission.
11. At completion, provide the exact commands to install, run, test, and build; summarize implemented features, measured limits, known issues, and next steps.

## 11. Definition of done for MVP

CityFS MVP is done only when a user can:

1. Start the app locally with documented commands.
2. Upload a small arbitrary file.
3. See a 3D city whose architectural features deterministically encode the file's envelope bytes.
4. Inspect at least one building and understand how it represents a byte.
5. Export the city to a `.cityfs` artifact that contains architectural representation, not a hidden copy of the file.
6. Close/reload the app, import that artifact, and reconstruct/download the original file.
7. Observe a verified SHA-256 match between original and recovered bytes.
8. Run automated tests demonstrating the above.

**Begin by implementing Phase 1 now. Proceed through later phases as time and tool access permit, prioritizing a working end-to-end vertical slice over unfinished advanced features.**

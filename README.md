# CityFS

CityFS converts a small arbitrary file into an explorable 3D city and reconstructs the exact original bytes from the exported city’s architectural data.

Each byte of a versioned file envelope becomes one building. Four height bits, two roof-geometry bits, and two window-pattern bits are visibly manifested and decoded from canonical geometry—never from a hidden payload or duplicated byte field.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL, drop in a file up to 8 KiB, choose **Encode city**, explore the result, and export a `.cityfs` file. Reset or reload the app, import that artifact, and choose **Decode file** to recover the original.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

The local E2E configuration uses an installed Google Chrome channel. In CI, either install Chrome or change the Playwright project to bundled Chromium and run `npx playwright install chromium` once.

## What is in a `.cityfs` file?

The portable format is readable JSON containing integer-unit building positions, dimensions, roof descriptors, and window panel primitives. Its only optional metadata is visual decoration. The complete `CFS1` binary envelope—filename, MIME type, lengths, compression mode, original SHA-256, and payload—is itself mapped into buildings.

See [architecture](docs/ARCHITECTURE.md), [encoding](docs/ENCODING_SPEC.md), [format](docs/FORMAT_SPEC.md), [benchmarks](docs/BENCHMARKS.md), and [roadmap](docs/ROADMAP.md).

## Product behavior

- local browser processing; no file upload or backend;
- deterministic row-major city generation;
- efficient instanced rendering with orbit, pan, zoom, and top-down camera;
- building inspector showing the byte derived from visible features;
- optional browser-native lossless gzip;
- strict format, coordinate, geometry, size, UTF-8, decompression, and checksum validation;
- import/export that works without the original file or prior app state.

## Known limitations

- Density is deliberately low: about one envelope byte per building.
- The city artifact is substantially larger than the source file. CityFS is not compression.
- Screenshots, video, lossy mesh simplification, and 3D prints are not recoverable formats.
- CityFS is inspectable encoding, not encryption or confidentiality.
- Browser memory and GPU limits require the current conservative 8 KiB source-file cap.
- General-purpose GLB export/recovery and error correction are research extensions, not MVP promises.

## Measured performance

On the documented Windows x64 development host, fixed-seed 8 KiB data produced 8,288 buildings, encoded in 13.49 ms, decoded in 24.75 ms, and sustained the host display's 120 Hz browser frame cadence after warm-up. See the [full benchmark table and methodology](docs/BENCHMARKS.md); these numbers are not a cross-device guarantee.

## Privacy and security

File bytes are processed entirely with browser APIs and are never sent to a CityFS server. Imported files are still untrusted input: CityFS applies strict size and schema validation and never executes embedded content.

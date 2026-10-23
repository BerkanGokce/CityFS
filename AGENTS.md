# CityFS contributor guide

- Preserve the core invariant: recoverable bytes live only in canonical architectural geometry.
- Never add byte values, Base64 payloads, or duplicate original data to `.cityfs` metadata.
- Keep codec modules free from React and Three.js.
- Every new geometry channel needs an exhaustive reversible test.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before claiming completion.

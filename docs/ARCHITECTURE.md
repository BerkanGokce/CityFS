# CityFS architecture

## Decision record

### Architecture is the sole payload carrier

The `.cityfs` artifact is JSON because transparent inspection is useful for an MVP. Its `buildings` array contains integer-unit positions, dimensions, roof shape descriptors, and window panel primitives. It contains no `byteValue`, Base64 content, payload field, bit fields, or hidden object-name channel. Deleting the optional `decoration` object does not affect recovery.

Every envelope byte produces one building. The decoder sorts buildings by `(zUnits, xUnits)`, validates a gap-free row-major grid, and infers a byte from:

- body height: 16 canonical integer tiers;
- physical roof descriptor: four exact geometries;
- window panel list: four exact panel arrangements.

The renderer consumes these same primitives. There is no separate decorative byte model that can disagree with decoding.

### Integer canonical model, floating-point render model

Serialized geometry uses only integer units. The renderer applies `unitScale = 0.25` at the edge. This prevents floating-point serialization drift from changing a symbol.

### Envelope inside architecture

All recovery metadata—including filename, MIME type, lengths, compression selection, and SHA-256—is part of the binary envelope and therefore encoded into buildings. The container has only schema/grid information needed to interpret architecture.

### Conservative bounds

The MVP accepts an original file of at most 8 KiB and an envelope of at most 12 KiB. JSON import is capped at 6 MiB. These limits keep validation, rendering, and memory behavior predictable. Repeated geometry is rendered with instancing, so the React tree does not grow per building.

### Compression

`auto` tries browser-native gzip and uses it only when smaller. `none` is the deterministic baseline used by canonical tests. Gzip is lossless and the original SHA-256 is always verified after decompression.

## Module boundaries

- `src/codec`: browser-independent envelope, symbol, city serialization, validation, and integrity logic.
- `src/types`: canonical serialized data contracts.
- `src/city`: layout and instanced render adapter.
- `src/components`: UI surfaces with no codec authority.
- `tests/codec`: correctness and adversarial validation.
- `tests/e2e`: fresh-session browser workflow.

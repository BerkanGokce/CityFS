# CityFS encoding specification v1

## Byte mapping

For envelope byte `b`:

```text
heightTier = (b >> 4) & 0x0f
roofCode   = (b >> 2) & 0x03
windowCode = b & 0x03
```

Body height is `12 + heightTier × 3` integer units. The footprint is always 8 × 8 units.

Roof codes are not serialized as codes. They select these canonical shape descriptors:

0. flat cap, height 1 unit;
1. gable, x-axis ridge 4 units high;
2. pyramid, apex 5 units high;
3. two-level stepped roof, each level 2 units high and inset 2 units.

Window codes are likewise absent from the artifact. Each selects one exact panel list: one centered panel, two horizontal panels, three narrow panels, or a four-panel 2 × 2 arrangement. Panel coordinates and dimensions are serialized and repeated as protruding geometry on all four façades.

## Layout

Buildings occupy a 12-unit grid. Column count is `ceil(sqrt(envelopeLength))`; traversal is row-major with x advancing before z. Coordinates, not array order or object names, establish byte order. A city must be gap-free and contain unique non-negative coordinates.

## Capacity

One envelope byte costs one building. The envelope adds 52 fixed bytes plus UTF-8 filename bytes, MIME bytes, and either original or gzip payload bytes. CityFS is an informational/artistic encoding, not a space-efficient archive.

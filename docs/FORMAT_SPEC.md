# `.cityfs` container format v1

## Container

The file is UTF-8 JSON with MIME type `application/vnd.cityfs+json`:

```json
{
  "schema": "cityfs-city",
  "formatVersion": 1,
  "unitScale": 0.25,
  "grid": {
    "spacingUnits": 12,
    "traversal": "row-major-x-then-z",
    "columns": 9
  },
  "buildings": [
    {
      "position": { "xUnits": 0, "zUnits": 0 },
      "footprint": { "widthUnits": 8, "depthUnits": 8 },
      "heightUnits": 24,
      "roof": { "kind": "flat", "capHeightUnits": 1 },
      "windowPanels": [
        { "offsetXUnits": 0, "offsetYUnits": 0, "widthUnits": 3, "heightUnits": 4, "depthUnits": 1 }
      ]
    }
  ],
  "decoration": { "palette": "limestone" }
}
```

`decoration` is optional and ignored during decoding. The artifact never has a separate payload, original bytes, Base64 value, symbol code, or byte value.

## Architectural envelope (`CFS1`)

All multi-byte integers are unsigned big-endian.

| Offset |    Width | Field                                |
| -----: | -------: | ------------------------------------ |
|      0 |        4 | ASCII magic `CFS1`                   |
|      4 |        1 | envelope version (`1`)               |
|      5 |        1 | flags (bit 0 = compressed)           |
|      6 |        1 | compression (`0` none, `1` gzip)     |
|      7 |        1 | reserved, must be zero               |
|      8 |        4 | original byte length                 |
|     12 |        4 | encoded payload length               |
|     16 |        2 | UTF-8 filename byte length           |
|     18 |        2 | UTF-8 MIME byte length               |
|     20 |       32 | SHA-256 of original bytes            |
|     52 | variable | filename, MIME type, encoded payload |

Bounds: original file 8 KiB; envelope/buildings 12 KiB; filename 512 UTF-8 bytes; MIME type 255 UTF-8 bytes; serialized JSON import 6 MiB. Unknown versions, non-canonical geometry, grid gaps, duplicate positions, length mismatches, invalid UTF-8, decompression failures, and SHA-256 mismatches are rejected.

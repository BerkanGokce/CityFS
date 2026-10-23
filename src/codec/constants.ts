export const ENVELOPE_MAGIC = new Uint8Array([0x43, 0x46, 0x53, 0x31]); // CFS1
export const ENVELOPE_VERSION = 1;
export const FIXED_HEADER_BYTES = 52;
export const MAX_ORIGINAL_BYTES = 8 * 1024;
export const MAX_ENVELOPE_BYTES = 12 * 1024;
export const MAX_FILENAME_BYTES = 512;
export const MAX_MIME_BYTES = 255;
export const MAX_BUILDINGS = MAX_ENVELOPE_BYTES;

export const GRID_SPACING_UNITS = 12 as const;
export const FOOTPRINT_UNITS = 8 as const;
export const BASE_HEIGHT_UNITS = 12;
export const HEIGHT_STEP_UNITS = 3;

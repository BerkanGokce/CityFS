import {
  ENVELOPE_MAGIC,
  ENVELOPE_VERSION,
  FIXED_HEADER_BYTES,
  MAX_ENVELOPE_BYTES,
  MAX_FILENAME_BYTES,
  MAX_MIME_BYTES,
  MAX_ORIGINAL_BYTES,
} from './constants';
import { gzip, gunzip, supportsGzipCompression } from './compression';
import { CityFSError } from './errors';
import { equalBytes, sha256Bytes, toHex } from './integrity';
import type { DecodedFile } from '../types/city';

export type CompressionMode = 'none' | 'gzip' | 'auto';

export interface EnvelopeInput {
  filename: string;
  mimeType?: string;
  bytes: Uint8Array;
  compression?: CompressionMode;
}

function assertLength(length: number, maximum: number, label: string): void {
  if (length > maximum) {
    throw new CityFSError(
      `${label} exceeds the supported limit of ${maximum} bytes.`,
      'LIMIT_EXCEEDED',
    );
  }
}

function writeBytes(target: Uint8Array, offset: number, source: Uint8Array): number {
  target.set(source, offset);
  return offset + source.length;
}

export async function createEnvelope(input: EnvelopeInput): Promise<Uint8Array> {
  assertLength(input.bytes.length, MAX_ORIGINAL_BYTES, 'File');
  const encoder = new TextEncoder();
  const filename = encoder.encode(input.filename || 'recovered-file');
  const mimeType = encoder.encode(input.mimeType || 'application/octet-stream');
  assertLength(filename.length, MAX_FILENAME_BYTES, 'Filename');
  assertLength(mimeType.length, MAX_MIME_BYTES, 'MIME type');

  const mode = input.compression ?? 'auto';
  let payload: Uint8Array<ArrayBufferLike> = Uint8Array.from(input.bytes);
  let compressionId = 0;
  if (mode === 'gzip' && !supportsGzipCompression()) {
    throw new CityFSError(
      'Gzip compression is not supported by this browser.',
      'COMPRESSION_UNAVAILABLE',
    );
  }
  if (mode !== 'none' && input.bytes.length > 0 && supportsGzipCompression()) {
    const compressed = await gzip(input.bytes);
    if (mode === 'gzip' || compressed.length < input.bytes.length) {
      payload = compressed;
      compressionId = 1;
    }
  }
  const envelopeLength = FIXED_HEADER_BYTES + filename.length + mimeType.length + payload.length;
  assertLength(envelopeLength, MAX_ENVELOPE_BYTES, 'Encoded envelope');

  const envelope = new Uint8Array(envelopeLength);
  const view = new DataView(envelope.buffer);
  let offset = writeBytes(envelope, 0, ENVELOPE_MAGIC);
  view.setUint8(offset++, ENVELOPE_VERSION);
  view.setUint8(offset++, compressionId === 0 ? 0 : 1);
  view.setUint8(offset++, compressionId);
  view.setUint8(offset++, 0);
  view.setUint32(offset, input.bytes.length, false);
  offset += 4;
  view.setUint32(offset, payload.length, false);
  offset += 4;
  view.setUint16(offset, filename.length, false);
  offset += 2;
  view.setUint16(offset, mimeType.length, false);
  offset += 2;
  offset = writeBytes(envelope, offset, await sha256Bytes(input.bytes));
  offset = writeBytes(envelope, offset, filename);
  offset = writeBytes(envelope, offset, mimeType);
  writeBytes(envelope, offset, payload);
  return envelope;
}

function readBoundedSlice(bytes: Uint8Array, start: number, length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 0 || start + length > bytes.length) {
    throw new CityFSError('The envelope is truncated or has invalid lengths.', 'INVALID_ENVELOPE');
  }
  return bytes.slice(start, start + length);
}

export function sanitizeFilename(filename: string): string {
  const withoutControls = Array.from(filename, (character) =>
    character.charCodeAt(0) <= 31 ? '_' : character,
  ).join('');
  const stripped = withoutControls
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  const limited = Array.from(stripped).slice(0, 180).join('');
  return limited || 'recovered-file';
}

export async function decodeEnvelope(envelope: Uint8Array): Promise<DecodedFile> {
  assertLength(envelope.length, MAX_ENVELOPE_BYTES, 'Encoded envelope');
  if (envelope.length < FIXED_HEADER_BYTES) {
    throw new CityFSError('The CityFS envelope is truncated.', 'INVALID_ENVELOPE');
  }
  for (let index = 0; index < ENVELOPE_MAGIC.length; index += 1) {
    if (envelope[index] !== ENVELOPE_MAGIC[index]) {
      throw new CityFSError('The CityFS envelope magic identifier is invalid.', 'INVALID_ENVELOPE');
    }
  }
  const view = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
  const version = view.getUint8(4);
  if (version !== ENVELOPE_VERSION) {
    throw new CityFSError(`Envelope version ${version} is not supported.`, 'UNSUPPORTED_VERSION');
  }
  const flags = view.getUint8(5);
  const compressionId = view.getUint8(6);
  const reserved = view.getUint8(7);
  if (
    (flags & 0xfe) !== 0 ||
    reserved !== 0 ||
    compressionId > 1 ||
    Boolean(flags & 1) !== (compressionId === 1)
  ) {
    throw new CityFSError('The envelope flags are invalid or unsupported.', 'INVALID_ENVELOPE');
  }
  const originalLength = view.getUint32(8, false);
  const payloadLength = view.getUint32(12, false);
  const filenameLength = view.getUint16(16, false);
  const mimeLength = view.getUint16(18, false);
  assertLength(originalLength, MAX_ORIGINAL_BYTES, 'File');
  assertLength(filenameLength, MAX_FILENAME_BYTES, 'Filename');
  assertLength(mimeLength, MAX_MIME_BYTES, 'MIME type');
  const expectedLength = FIXED_HEADER_BYTES + filenameLength + mimeLength + payloadLength;
  if (expectedLength !== envelope.length) {
    throw new CityFSError(
      'Envelope lengths do not match its architectural byte count.',
      'INVALID_ENVELOPE',
    );
  }
  const digest = envelope.slice(20, 52);
  let offset = FIXED_HEADER_BYTES;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let filename: string;
  let mimeType: string;
  try {
    filename = decoder.decode(readBoundedSlice(envelope, offset, filenameLength));
    offset += filenameLength;
    mimeType = decoder.decode(readBoundedSlice(envelope, offset, mimeLength));
    offset += mimeLength;
  } catch {
    throw new CityFSError('Filename or MIME type is not valid UTF-8.', 'INVALID_ENVELOPE');
  }
  const encodedPayload = readBoundedSlice(envelope, offset, payloadLength);
  const bytes = compressionId === 1 ? await gunzip(encodedPayload) : encodedPayload;
  if (bytes.length !== originalLength) {
    throw new CityFSError('Recovered file length does not match the envelope.', 'INVALID_ENVELOPE');
  }
  const actualDigest = await sha256Bytes(bytes);
  if (!equalBytes(digest, actualDigest)) {
    throw new CityFSError(
      'SHA-256 checksum mismatch: the city data is corrupt.',
      'CHECKSUM_MISMATCH',
    );
  }
  return {
    filename,
    safeFilename: sanitizeFilename(filename),
    mimeType: mimeType || 'application/octet-stream',
    bytes,
    sha256: toHex(actualDigest),
    compressed: compressionId === 1,
  };
}

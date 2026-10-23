import { CityFSError } from './errors';

async function transform(
  input: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const copy = Uint8Array.from(input);
  const source = new Blob([copy.buffer]).stream();
  return new Uint8Array(await new Response(source.pipeThrough(stream)).arrayBuffer());
}

export async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new CityFSError(
      'Gzip compression is not supported by this browser.',
      'COMPRESSION_UNAVAILABLE',
    );
  }
  return transform(bytes, new CompressionStream('gzip'));
}

export function supportsGzipCompression(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

export async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new CityFSError(
      'Gzip decompression is not supported by this browser.',
      'COMPRESSION_UNAVAILABLE',
    );
  }
  try {
    return await transform(bytes, new DecompressionStream('gzip'));
  } catch {
    throw new CityFSError(
      'The compressed payload could not be decompressed.',
      'DECOMPRESSION_FAILED',
    );
  }
}

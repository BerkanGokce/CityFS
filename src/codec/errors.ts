export class CityFSError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'INVALID_CITY'
      | 'INVALID_ENVELOPE'
      | 'UNSUPPORTED_VERSION'
      | 'LIMIT_EXCEEDED'
      | 'CHECKSUM_MISMATCH'
      | 'COMPRESSION_UNAVAILABLE'
      | 'DECOMPRESSION_FAILED',
  ) {
    super(message);
    this.name = 'CityFSError';
  }
}

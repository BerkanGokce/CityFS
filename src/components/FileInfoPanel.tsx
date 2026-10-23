export interface FileInfo {
  name: string;
  type: string;
  originalSize: number;
  encodedSize: number;
  buildings: number;
  encodingMs?: number;
  sha256: string;
  compressed: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

export function FileInfoPanel({ info }: { info: FileInfo | null }) {
  if (!info) return null;
  return (
    <section className="panel file-info">
      <p className="eyebrow">Encoded file</p>
      <h2 title={info.name}>{info.name}</h2>
      <dl>
        <div>
          <dt>Original</dt>
          <dd>{formatBytes(info.originalSize)}</dd>
        </div>
        <div>
          <dt>Envelope</dt>
          <dd>{formatBytes(info.encodedSize)}</dd>
        </div>
        <div>
          <dt>Buildings</dt>
          <dd>{info.buildings.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Compression</dt>
          <dd>{info.compressed ? 'Gzip' : 'None'}</dd>
        </div>
        {info.encodingMs !== undefined && (
          <div>
            <dt>Encoded in</dt>
            <dd>{info.encodingMs.toFixed(1)} ms</dd>
          </div>
        )}
      </dl>
      <div className="hash-block">
        <span>SHA-256</span>
        <code title={info.sha256}>{info.sha256}</code>
      </div>
    </section>
  );
}

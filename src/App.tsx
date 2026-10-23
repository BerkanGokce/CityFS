import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import './styles.css';
import { MAX_ORIGINAL_BYTES } from './codec/constants';
import { decodeCityToFile } from './codec/decode';
import { encodeFileToCity } from './codec/encode';
import { serializeCity, parseCity } from './codec/cityfsFormat';
import { architectureToEnvelope } from './codec/decode';
import { sha256Bytes, toHex } from './codec/integrity';
import { BuildingInspector } from './components/BuildingInspector';
import { FileDropzone } from './components/FileDropzone';
import { FileInfoPanel, type FileInfo } from './components/FileInfoPanel';
import { Toolbar } from './components/Toolbar';
import { downloadBlob } from './utils/download';
import type { CityArtifact, DecodedFile } from './types/city';

const CityViewport = lazy(() =>
  import('./components/CityViewport').then((module) => ({ default: module.CityViewport })),
);

type WorkStatus = 'idle' | 'encoding' | 'importing' | 'ready' | 'verified' | 'error';

const demoBytes = new TextEncoder().encode(
  'CITYFS / ARCHITECTURE IS DATA\nEvery building in this city stores one byte.\n',
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString()} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export default function App() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [city, setCity] = useState<CityArtifact | null>(null);
  const [decoded, setDecoded] = useState<DecodedFile | null>(null);
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [status, setStatus] = useState<WorkStatus>('idle');
  const [message, setMessage] = useState('');
  const [dataView, setDataView] = useState(false);
  const [cameraMode, setCameraMode] = useState<'perspective' | 'top'>('perspective');
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const inspectedIndex = hoveredIndex ?? selectedIndex;
  const inspectedBuilding = useMemo(() => {
    if (!city || inspectedIndex === null) return null;
    return (
      [...city.buildings].sort(
        (a, b) => a.position.zUnits - b.position.zUnits || a.position.xUnits - b.position.xUnits,
      )[inspectedIndex] ?? null
    );
  }, [city, inspectedIndex]);

  function showError(error: unknown): void {
    setStatus('error');
    setMessage(
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : 'An unexpected error occurred.',
    );
  }

  function selectSourceFile(file: File): void {
    setPendingFile(file);
    if (file.size > MAX_ORIGINAL_BYTES) {
      showError(
        `“${file.name}” is ${formatFileSize(file.size)}. CityFS currently supports files up to ${MAX_ORIGINAL_BYTES / 1024} KiB.`,
      );
    } else {
      setMessage('');
      setStatus('idle');
    }
  }

  async function encode(
    filename: string,
    mimeType: string,
    bytes: Uint8Array,
    compression: 'auto' | 'none' = 'auto',
  ): Promise<void> {
    if (bytes.length > MAX_ORIGINAL_BYTES) {
      showError(`This MVP supports files up to ${MAX_ORIGINAL_BYTES / 1024} KiB.`);
      return;
    }
    setStatus('encoding');
    setMessage('Mapping the envelope into architectural primitives…');
    setDecoded(null);
    try {
      const start = performance.now();
      const encodedCity = await encodeFileToCity({ filename, mimeType, bytes, compression });
      const elapsed = performance.now() - start;
      const envelope = architectureToEnvelope(encodedCity);
      const verification = await decodeCityToFile(encodedCity);
      setCity(encodedCity);
      setInfo({
        name: filename,
        type: mimeType || 'application/octet-stream',
        originalSize: bytes.length,
        encodedSize: envelope.length,
        buildings: encodedCity.buildings.length,
        encodingMs: elapsed,
        sha256: toHex(await sha256Bytes(bytes)),
        compressed: verification.compressed,
      });
      setStatus('ready');
      setMessage(
        `City encoded and self-verified. ${encodedCity.buildings.length.toLocaleString()} buildings carry the envelope.`,
      );
      setPendingFile(null);
      setSelectedIndex(null);
      setHoveredIndex(null);
    } catch (error) {
      showError(error);
    }
  }

  async function encodePending(): Promise<void> {
    if (!pendingFile) return;
    if (pendingFile.size > MAX_ORIGINAL_BYTES) {
      showError(
        `“${pendingFile.name}” is ${formatFileSize(pendingFile.size)}. CityFS currently supports files up to ${MAX_ORIGINAL_BYTES / 1024} KiB.`,
      );
      return;
    }
    try {
      await encode(
        pendingFile.name,
        pendingFile.type,
        new Uint8Array(await pendingFile.arrayBuffer()),
      );
    } catch (error) {
      showError(error);
    }
  }

  async function loadDemo(): Promise<void> {
    await encode('cityfs-demo.txt', 'text/plain;charset=utf-8', demoBytes, 'none');
  }

  function exportCity(): void {
    if (!city) return;
    try {
      const serialized = serializeCity(city);
      const baseName = (info?.name || 'city')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9_-]+/gi, '-');
      downloadBlob(
        new Blob([serialized], { type: 'application/vnd.cityfs+json' }),
        `${baseName}.cityfs`,
      );
      setMessage(
        'Portable .cityfs artifact exported. It contains architecture, not a duplicate payload.',
      );
    } catch (error) {
      showError(error);
    }
  }

  async function importCity(file: File): Promise<void> {
    setStatus('importing');
    setMessage('Validating canonical city geometry…');
    setPendingFile(null);
    setDecoded(null);
    try {
      const importedCity = parseCity(await file.text());
      setCity(importedCity);
      let recovered: DecodedFile;
      try {
        recovered = await decodeCityToFile(importedCity);
      } catch (error) {
        setInfo(null);
        throw error;
      }
      setDecoded(recovered);
      setInfo({
        name: recovered.filename,
        type: recovered.mimeType,
        originalSize: recovered.bytes.length,
        encodedSize: importedCity.buildings.length,
        buildings: importedCity.buildings.length,
        sha256: recovered.sha256,
        compressed: recovered.compressed,
      });
      setStatus('verified');
      setMessage('City imported and SHA-256 verified. The recovered file is ready to download.');
    } catch (error) {
      showError(error);
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  }

  async function decodeAndDownload(): Promise<void> {
    if (!city) return;
    setMessage('Reconstructing the envelope from building geometry…');
    try {
      const recovered = decoded ?? (await decodeCityToFile(city));
      setDecoded(recovered);
      setStatus('verified');
      setMessage(`Integrity verified: ${recovered.sha256}. Download started.`);
      downloadBlob(
        new Blob([Uint8Array.from(recovered.bytes)], { type: recovered.mimeType }),
        recovered.safeFilename,
      );
    } catch (error) {
      showError(error);
    }
  }

  function reset(): void {
    setPendingFile(null);
    setCity(null);
    setDecoded(null);
    setInfo(null);
    setStatus('idle');
    setMessage('');
    setSelectedIndex(null);
    setHoveredIndex(null);
  }

  const statusClass = status === 'error' ? 'status status--error' : `status status--${status}`;

  if (!city) {
    return (
      <main className="landing-shell">
        <header className="landing-nav">
          <a className="brand" href="/" aria-label="CityFS home">
            <span className="brand__glyph">C</span>
            <span>CityFS</span>
          </a>
          <span className="local-badge">
            <i /> Local-only processing
          </span>
        </header>
        <section className="hero">
          <div className="hero__copy">
            <p className="kicker">A filesystem made of cities</p>
            <h1>
              Your bytes.
              <br />
              <em>Built to last.</em>
            </h1>
            <p className="hero__lede">
              Turn any small file into an explorable 3D city, where height, roof, and windows carry
              every bit—and reconstruct it exactly.
            </p>
            <div className="privacy-line">
              <span>◆</span>
              <strong>Your file stays in your browser.</strong> Nothing is uploaded.
            </div>
          </div>
          <div className="upload-card">
            <div className="upload-card__index">01 / ENCODE</div>
            <FileDropzone onFile={selectSourceFile} />
            {pendingFile && (
              <div className="pending-file" data-testid="pending-file">
                <span>
                  <strong>{pendingFile.name}</strong>
                  <small>{pendingFile.size.toLocaleString()} bytes</small>
                </span>
                <button
                  className="button"
                  onClick={() => void encodePending()}
                  disabled={status === 'encoding' || pendingFile.size > MAX_ORIGINAL_BYTES}
                >
                  {status === 'encoding'
                    ? 'Encoding…'
                    : pendingFile.size > MAX_ORIGINAL_BYTES
                      ? 'File too large'
                      : 'Encode city'}
                </button>
              </div>
            )}
            <div className="upload-card__footer">
              <span>One envelope byte = one building</span>
              <button className="text-button" onClick={() => void loadDemo()}>
                Explore demo city →
              </button>
            </div>
          </div>
        </section>
        {(message || status === 'error') && (
          <div className={statusClass} role="status">
            {message}
          </div>
        )}
        <section className="principles">
          <article>
            <b>01</b>
            <h2>Architectural data</h2>
            <p>Height, roof geometry, and window arrangements encode eight bits per building.</p>
          </article>
          <article>
            <b>02</b>
            <h2>Exact recovery</h2>
            <p>A versioned envelope and SHA-256 check prove the recovered bytes match.</p>
          </article>
          <article>
            <b>03</b>
            <h2>Portable city</h2>
            <p>Export canonical geometry, reload it later, and decode without the source file.</p>
          </article>
        </section>
        <button className="import-fab" onClick={() => importInput.current?.click()}>
          Import a .cityfs city
        </button>
        <input
          ref={importInput}
          data-testid="city-import-input"
          type="file"
          accept=".cityfs,application/json"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0);
            if (file) void importCity(file);
          }}
        />
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <a
          className="brand brand--light"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            reset();
          }}
        >
          <span className="brand__glyph">C</span>
          <span>CityFS</span>
        </a>
        <div className="workspace-header__title">
          <span>Active city</span>
          <strong>{info?.name ?? 'Imported city'}</strong>
        </div>
        <span
          className={`integrity-pill ${status === 'verified' || status === 'ready' ? 'is-good' : ''}`}
        >
          <i /> {status === 'verified' ? 'SHA-256 verified' : 'Geometry verified'}
        </span>
      </header>
      <Toolbar
        dataView={dataView}
        cameraMode={cameraMode}
        canExport={Boolean(city)}
        canDecode={Boolean(city)}
        onDataView={setDataView}
        onCameraMode={setCameraMode}
        onResetCamera={() => setCameraResetKey((value) => value + 1)}
        onExport={exportCity}
        onImport={() => importInput.current?.click()}
        onDecode={() => void decodeAndDownload()}
        onReset={reset}
      />
      <div className="workspace-grid">
        <section className="viewport-wrap">
          <Suspense fallback={<div className="viewport-loading">Assembling city geometry…</div>}>
            <CityViewport
              city={city}
              dataView={dataView}
              selectedIndex={selectedIndex}
              cameraMode={cameraMode}
              cameraResetKey={cameraResetKey}
              onSelect={setSelectedIndex}
              onHover={setHoveredIndex}
            />
          </Suspense>
          <div className="city-counter">
            <strong>{city.buildings.length.toLocaleString()}</strong>
            <span>data-bearing buildings</span>
          </div>
        </section>
        <aside className="sidebar">
          <FileInfoPanel info={info} />
          <BuildingInspector building={inspectedBuilding} index={inspectedIndex} />
          <FileDropzone compact onFile={selectSourceFile} />
          {pendingFile && (
            <button
              className="button button--wide"
              disabled={pendingFile.size > MAX_ORIGINAL_BYTES}
              onClick={() => void encodePending()}
            >
              {pendingFile.size > MAX_ORIGINAL_BYTES
                ? 'Selected file exceeds 8 KiB'
                : `Encode ${pendingFile.name}`}
            </button>
          )}
        </aside>
      </div>
      {message && (
        <div className={statusClass} role="status">
          {message}
        </div>
      )}
      <input
        ref={importInput}
        data-testid="city-import-input"
        type="file"
        accept=".cityfs,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.item(0);
          if (file) void importCity(file);
        }}
      />
    </main>
  );
}

import { useRef, useState, type DragEvent } from 'react';

interface FileDropzoneProps {
  onFile: (file: File) => void;
  compact?: boolean;
}

export function FileDropzone({ onFile, compact = false }: FileDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function receive(files: FileList | null): void {
    const file = files?.item(0);
    if (file) onFile(file);
  }

  function drop(event: DragEvent): void {
    event.preventDefault();
    setDragging(false);
    receive(event.dataTransfer.files);
  }

  return (
    <div
      className={`dropzone ${compact ? 'dropzone--compact' : ''} ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') input.current?.click();
      }}
      aria-label="Choose a file to encode"
    >
      <input
        ref={input}
        data-testid="file-input"
        type="file"
        onChange={(event) => receive(event.currentTarget.files)}
        hidden
      />
      <span className="dropzone__mark" aria-hidden="true">
        +
      </span>
      <span>
        <strong>{compact ? 'Choose another file' : 'Drop a file into the city grid'}</strong>
        {!compact && <small>or click to browse · up to 8 KiB</small>}
      </span>
    </div>
  );
}

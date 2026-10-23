interface ToolbarProps {
  dataView: boolean;
  cameraMode: 'perspective' | 'top';
  canExport: boolean;
  canDecode: boolean;
  onDataView: (value: boolean) => void;
  onCameraMode: (value: 'perspective' | 'top') => void;
  onResetCamera: () => void;
  onExport: () => void;
  onImport: () => void;
  onDecode: () => void;
  onReset: () => void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="toolbar" aria-label="City controls">
      <div className="segmented" aria-label="Visualization mode">
        <button className={!props.dataView ? 'active' : ''} onClick={() => props.onDataView(false)}>
          City view
        </button>
        <button className={props.dataView ? 'active' : ''} onClick={() => props.onDataView(true)}>
          Data view
        </button>
      </div>
      <div className="toolbar__group">
        <button
          className="icon-button"
          onClick={() => props.onCameraMode(props.cameraMode === 'top' ? 'perspective' : 'top')}
        >
          {props.cameraMode === 'top' ? 'Perspective' : 'Top down'}
        </button>
        <button className="icon-button" onClick={props.onResetCamera}>
          Reset camera
        </button>
        <span className="toolbar__divider" />
        <button className="icon-button" onClick={props.onImport}>
          Import
        </button>
        <button className="icon-button" disabled={!props.canExport} onClick={props.onExport}>
          Export city
        </button>
        <button
          className="button button--light"
          disabled={!props.canDecode}
          onClick={props.onDecode}
        >
          Decode file
        </button>
        <button className="icon-button danger" onClick={props.onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

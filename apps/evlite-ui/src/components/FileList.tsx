import type { EvidenceNode } from "../types";

type Props = {
  files: EvidenceNode[];
  selectedPath: string | null;
  scanning: boolean;
  onSelect: (path: string) => void;
  onScan: () => void;
};

export function FileList({
  files,
  selectedPath,
  scanning,
  onSelect,
  onScan,
}: Props) {
  const withMeta = files.filter((f) => f.ev_id !== null);
  const withoutMeta = files.filter((f) => f.ev_id === null);

  return (
    <div className="file-list">
      <div className="file-list-header">
        <button
          className="primary"
          onClick={onScan}
          disabled={scanning}
        >
          {scanning ? "Scanning..." : "Scan ▶"}
        </button>
      </div>
      <div className="file-list-scroll">
        <FileSection
          label={`With Metadata (${withMeta.length})`}
          files={withMeta}
          selectedPath={selectedPath}
          onSelect={onSelect}
          showEvId
        />
        <FileSection
          label={`No Metadata (${withoutMeta.length})`}
          files={withoutMeta}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

type SectionProps = {
  label: string;
  files: EvidenceNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  showEvId?: boolean;
};

function FileSection({
  label,
  files,
  selectedPath,
  onSelect,
  showEvId,
}: SectionProps) {
  if (files.length === 0) return null;
  return (
    <div className="file-list-section">
      <h3>{label}</h3>
      {files.map((f) => (
        <div
          key={f.path}
          className={`file-item ${selectedPath === f.path ? "selected" : ""}`}
          onClick={() => onSelect(f.path)}
        >
          {showEvId && f.ev_id && (
            <span className="ev-id">{f.ev_id}</span>
          )}
          <span className="path">{f.path}</span>
        </div>
      ))}
    </div>
  );
}

import { useState, type MouseEvent } from "react";
import { api } from "../api/client";
import type { EvidenceNode } from "../types";

type Props = {
  files: EvidenceNode[];
  selectedPath: string | null;
  scanning: boolean;
  onSelect: (path: string) => void;
  onScan: () => void;
};

type SortMode = "name" | "status" | "scan";

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  draft: 1,
  experimental: 2,
  deprecated: 3,
  archived: 4,
  superseded: 5,
  stale: 6,
};

function statusRank(status: string | undefined): number {
  if (!status) return 999;
  const rank = STATUS_PRIORITY[status];
  return rank === undefined ? 999 : rank;
}

type FileGroup = {
  key: string;
  files: EvidenceNode[];
};

function groupKeyFor(node: EvidenceNode): string {
  if (node.stack && node.stack.trim()) return node.stack;
  const parts = node.path.split("/").filter(Boolean);
  if (parts.length <= 1) return "root";
  return parts[0];
}

function buildGroups(files: EvidenceNode[]): FileGroup[] {
  const map = new Map<string, EvidenceNode[]>();
  for (const f of files) {
    const key = groupKeyFor(f);
    const bucket = map.get(key);
    if (bucket) bucket.push(f);
    else map.set(key, [f]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "root" && b !== "root") return 1;
      if (b === "root" && a !== "root") return -1;
      return a.localeCompare(b);
    })
    .map(([key, groupFiles]) => ({ key, files: groupFiles }));
}

export function FileList({
  files,
  selectedPath,
  scanning,
  onSelect,
  onScan,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const withMeta = files.filter((f) => f.ev_id !== null);
  const withoutMeta = files.filter((f) => f.ev_id === null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState<boolean>(false);
  const [addAllResult, setAddAllResult] = useState<string>("");

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function handleAddAll() {
    setAddingAll(true);
    setAddAllResult("");
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    for (const f of withoutMeta) {
      try {
        await api.initMeta(f.path);
        inserted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("409")) skipped++;
        else failed++;
      }
    }
    setAddingAll(false);
    const parts = [`${inserted} files updated`];
    if (skipped > 0) parts.push(`${skipped} skipped`);
    if (failed > 0) parts.push(`${failed} failed`);
    setAddAllResult(`✔ ${parts.join(", ")}`);
    try {
      await onScan();
    } catch {
      // scan failure doesn't roll back init-meta; user can retry [Scan ▶]
    }
  }

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
        <div className="file-list-sort">
          <label htmlFor="file-sort">sort:</label>
          <select
            id="file-sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="scan">Scan order</option>
          </select>
        </div>
        {addAllResult && (
          <div className="add-all-status">{addAllResult}</div>
        )}
      </div>
      <div className="file-list-scroll">
        <FileSection
          label="With Metadata"
          files={withMeta}
          selectedPath={selectedPath}
          collapsed={collapsed}
          onToggle={toggleGroup}
          onSelect={onSelect}
          sortMode={sortMode}
          showEvId
        />
        <FileSection
          label="No Metadata"
          files={withoutMeta}
          selectedPath={selectedPath}
          collapsed={collapsed}
          onToggle={toggleGroup}
          onSelect={onSelect}
          sortMode={sortMode}
          onAddAll={handleAddAll}
          addingAll={addingAll}
        />
      </div>
    </div>
  );
}

type SectionProps = {
  label: string;
  files: EvidenceNode[];
  selectedPath: string | null;
  collapsed: Set<string>;
  onToggle: (groupId: string) => void;
  onSelect: (path: string) => void;
  sortMode: SortMode;
  showEvId?: boolean;
  onAddAll?: () => void;
  addingAll?: boolean;
};

function FileSection({
  label,
  files,
  selectedPath,
  collapsed,
  onToggle,
  onSelect,
  sortMode,
  showEvId,
  onAddAll,
  addingAll,
}: SectionProps) {
  if (files.length === 0) return null;
  const sectionId = `__section__::${label}`;
  const hasSelected = files.some((f) => f.path === selectedPath);
  const isExpanded = hasSelected || !collapsed.has(sectionId);

  function handleSummaryClick(e: MouseEvent<HTMLElement>) {
    e.preventDefault();
    if (hasSelected) return;
    onToggle(sectionId);
  }

  const flatFiles =
    sortMode === "status"
      ? [...files].sort((a, b) => {
          const rs = statusRank(a.status) - statusRank(b.status);
          if (rs !== 0) return rs;
          return a.path.localeCompare(b.path);
        })
      : sortMode === "scan"
        ? files
        : null;

  return (
    <details open={isExpanded} className="file-list-section">
      <summary
        className="file-list-section-summary"
        onClick={handleSummaryClick}
      >
        <span className="file-list-section-name">{label}</span>
        <span className="file-list-section-count">({files.length})</span>
        {onAddAll && (
          <button
            type="button"
            className="add-all-button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddAll();
            }}
            disabled={addingAll || files.length === 0}
          >
            {addingAll ? "Adding..." : "+ Add All"}
          </button>
        )}
      </summary>
      {flatFiles ? (
        <div className="file-flat-body">
          {flatFiles.map((f) => (
            <FileRow
              key={f.path}
              file={f}
              selected={selectedPath === f.path}
              showEvId={showEvId}
              showStatus={sortMode === "status"}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        buildGroups(files).map((group) => {
          const groupId = `${label}::${group.key}`;
          return (
            <GroupView
              key={groupId}
              groupKey={group.key}
              files={group.files}
              selectedPath={selectedPath}
              showEvId={showEvId}
              isCollapsed={collapsed.has(groupId)}
              onToggle={() => onToggle(groupId)}
              onSelect={onSelect}
            />
          );
        })
      )}
    </details>
  );
}

type FileRowProps = {
  file: EvidenceNode;
  selected: boolean;
  showEvId?: boolean;
  showStatus?: boolean;
  onSelect: (path: string) => void;
};

function FileRow({
  file,
  selected,
  showEvId,
  showStatus,
  onSelect,
}: FileRowProps) {
  return (
    <div
      className={`file-item ${selected ? "selected" : ""}`}
      onClick={() => onSelect(file.path)}
    >
      {showEvId && file.ev_id && (
        <span className="ev-id">{file.ev_id}</span>
      )}
      <span className="path">{file.path}</span>
      {showStatus && file.status && (
        <span className={`file-status status-${file.status}`}>
          {file.status}
        </span>
      )}
    </div>
  );
}

type GroupProps = {
  groupKey: string;
  files: EvidenceNode[];
  selectedPath: string | null;
  showEvId?: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onSelect: (path: string) => void;
};

function GroupView({
  groupKey,
  files,
  selectedPath,
  showEvId,
  isCollapsed,
  onToggle,
  onSelect,
}: GroupProps) {
  const hasSelected = files.some((f) => f.path === selectedPath);
  const isExpanded = hasSelected || !isCollapsed;

  function handleSummaryClick(e: MouseEvent<HTMLElement>) {
    e.preventDefault();
    if (hasSelected) return;
    onToggle();
  }

  return (
    <details open={isExpanded} className="file-group">
      <summary
        className="file-group-summary"
        onClick={handleSummaryClick}
      >
        <span className="file-group-name">{groupKey}</span>
        <span className="file-group-count">({files.length})</span>
      </summary>
      <div className="file-group-body">
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
    </details>
  );
}

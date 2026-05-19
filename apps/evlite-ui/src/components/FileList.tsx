import { useState, type MouseEvent } from "react";
import type { EvidenceNode } from "../types";

type Props = {
  files: EvidenceNode[];
  selectedPath: string | null;
  scanning: boolean;
  onSelect: (path: string) => void;
  onScan: () => void;
};

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
  const withMeta = files.filter((f) => f.ev_id !== null);
  const withoutMeta = files.filter((f) => f.ev_id === null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
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
      </div>
      <div className="file-list-scroll">
        <FileSection
          label="With Metadata"
          files={withMeta}
          selectedPath={selectedPath}
          collapsed={collapsed}
          onToggle={toggleGroup}
          onSelect={onSelect}
          showEvId
        />
        <FileSection
          label="No Metadata"
          files={withoutMeta}
          selectedPath={selectedPath}
          collapsed={collapsed}
          onToggle={toggleGroup}
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
  collapsed: Set<string>;
  onToggle: (groupId: string) => void;
  onSelect: (path: string) => void;
  showEvId?: boolean;
};

function FileSection({
  label,
  files,
  selectedPath,
  collapsed,
  onToggle,
  onSelect,
  showEvId,
}: SectionProps) {
  if (files.length === 0) return null;
  const groups = buildGroups(files);
  return (
    <div className="file-list-section">
      <h3>{`${label} (${files.length})`}</h3>
      {groups.map((group) => {
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
      })}
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

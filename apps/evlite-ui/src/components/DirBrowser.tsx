import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { DerivedTag, DirEntry, EvidenceNode, Registry } from "../types";

type Props = {
  registry: Registry;
  onSelectFile: (path: string) => void;
  onSnapshotDir: (path: string) => void;
};

const ROOT_KEY = "";

function isDirectChild(filePath: string, dir: string): boolean {
  const prefix = dir === ROOT_KEY ? "" : `${dir}/`;
  if (!filePath.startsWith(prefix)) return false;
  const rest = filePath.slice(prefix.length);
  if (!rest) return false;
  if (rest.includes("/")) return false;
  return rest.endsWith(".md");
}

function filesInDir(nodes: EvidenceNode[], dir: string): EvidenceNode[] {
  return nodes
    .filter((n) => isDirectChild(n.path, dir))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function DirBrowser({
  registry,
  onSelectFile,
  onSnapshotDir,
}: Props) {
  const [childrenByDir, setChildrenByDir] = useState<
    Record<string, DirEntry[]>
  >({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set([ROOT_KEY]));
  const [loadingFor, setLoadingFor] = useState<Set<string>>(new Set());
  const [errorFor, setErrorFor] = useState<Record<string, string>>({});
  const [selectedDir, setSelectedDir] = useState<string>(ROOT_KEY);

  async function fetchChildren(dirPath: string): Promise<void> {
    if (childrenByDir[dirPath]) return;
    setLoadingFor((prev) => {
      const next = new Set(prev);
      next.add(dirPath);
      return next;
    });
    try {
      const entries = await api.getDirs(dirPath || undefined);
      setChildrenByDir((prev) => ({ ...prev, [dirPath]: entries }));
      setErrorFor((prev) => {
        if (!prev[dirPath]) return prev;
        const next = { ...prev };
        delete next[dirPath];
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorFor((prev) => ({ ...prev, [dirPath]: msg }));
    } finally {
      setLoadingFor((prev) => {
        const next = new Set(prev);
        next.delete(dirPath);
        return next;
      });
    }
  }

  useEffect(() => {
    void fetchChildren(ROOT_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleExpand(dirPath: string, hasChildren: boolean) {
    setSelectedDir(dirPath);
    if (!hasChildren) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
        if (!childrenByDir[dirPath]) {
          void fetchChildren(dirPath);
        }
      }
      return next;
    });
  }

  const selectedFiles = useMemo(
    () => filesInDir(registry.nodes, selectedDir),
    [registry.nodes, selectedDir],
  );
  const rootFileCount = useMemo(
    () => filesInDir(registry.nodes, ROOT_KEY).length,
    [registry.nodes],
  );

  return (
    <div className="dir-browser">
      <div className="dir-tree-pane">
        <div className="dir-tree-toolbar">
          <span className="dir-tree-toolbar-label">
            {selectedDir
              ? `Selected: ${selectedDir}`
              : "Selected: root"}
          </span>
          {selectedDir && (
            <button
              type="button"
              className="dir-snapshot-button"
              onClick={() => onSnapshotDir(selectedDir)}
              title="Open in Snapshot Builder"
            >
              → Snapshot
            </button>
          )}
        </div>
        <div className="dir-tree-scroll">
          <DirRow
            depth={0}
            dirPath={ROOT_KEY}
            label="root/"
            hasChildren={(childrenByDir[ROOT_KEY] ?? []).length > 0}
            fileCount={rootFileCount}
            isRoot
            expanded={expanded}
            childrenByDir={childrenByDir}
            loadingFor={loadingFor}
            errorFor={errorFor}
            selectedDir={selectedDir}
            onToggle={toggleExpand}
            onSnapshot={onSnapshotDir}
          />
        </div>
      </div>

      <div className="dir-files-pane">
        <div className="dir-files-header">
          Files in <code>{selectedDir || "root"}</code> (
          {selectedFiles.length})
        </div>
        <div className="dir-files-scroll">
          {selectedFiles.length === 0 ? (
            <div className="empty">No .md files directly in this directory.</div>
          ) : (
            selectedFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                className="dir-file-row"
                onClick={() => onSelectFile(file.path)}
              >
                <span className="dir-file-evid">
                  {file.ev_id ?? "(no ev_id)"}
                </span>
                <span className="dir-file-path">{file.path}</span>
                <div className="dir-file-tags">
                  {file.status && (
                    <span className={`file-status status-${file.status}`}>
                      {file.status}
                    </span>
                  )}
                  {(file.derived_tags ?? []).map((t: DerivedTag) => (
                    <span
                      key={t}
                      className={`derived-tag derived-tag-${t}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type RowProps = {
  depth: number;
  dirPath: string;
  label: string;
  hasChildren: boolean;
  fileCount: number;
  isRoot?: boolean;
  expanded: Set<string>;
  childrenByDir: Record<string, DirEntry[]>;
  loadingFor: Set<string>;
  errorFor: Record<string, string>;
  selectedDir: string;
  onToggle: (dirPath: string, hasChildren: boolean) => void;
  onSnapshot: (dirPath: string) => void;
};

function DirRow({
  depth,
  dirPath,
  label,
  hasChildren,
  fileCount,
  isRoot,
  expanded,
  childrenByDir,
  loadingFor,
  errorFor,
  selectedDir,
  onToggle,
  onSnapshot,
}: RowProps) {
  const isExpanded = expanded.has(dirPath);
  const isLoading = loadingFor.has(dirPath);
  const error = errorFor[dirPath];
  const children = childrenByDir[dirPath] ?? [];
  const isSelected = selectedDir === dirPath;

  return (
    <>
      <div
        className={`dir-row${isSelected ? " selected" : ""}`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button
          type="button"
          className="dir-row-toggle"
          onClick={() => onToggle(dirPath, hasChildren)}
          aria-expanded={isExpanded}
        >
          <span className="dir-row-arrow">
            {hasChildren ? (isExpanded ? "▼" : "▶") : " "}
          </span>
          <span className="dir-row-icon">📁</span>
          <span className="dir-row-name">{label}</span>
          <span className="dir-row-count">({fileCount} files)</span>
        </button>
        {!isRoot && (
          <button
            type="button"
            className="dir-row-snapshot"
            onClick={(e) => {
              e.stopPropagation();
              onSnapshot(dirPath);
            }}
            title="Open in Snapshot Builder"
          >
            → Snapshot
          </button>
        )}
      </div>
      {isExpanded && isLoading && (
        <div
          className="dir-row-status"
          style={{ paddingLeft: 8 + (depth + 1) * 16 }}
        >
          loading…
        </div>
      )}
      {isExpanded && error && (
        <div
          className="dir-row-status dir-row-error"
          style={{ paddingLeft: 8 + (depth + 1) * 16 }}
        >
          {error}
        </div>
      )}
      {isExpanded &&
        !isLoading &&
        !error &&
        children.map((child) => (
          <DirRow
            key={child.path}
            depth={depth + 1}
            dirPath={child.path}
            label={`${child.name}/`}
            hasChildren={child.hasChildren}
            fileCount={child.fileCount}
            expanded={expanded}
            childrenByDir={childrenByDir}
            loadingFor={loadingFor}
            errorFor={errorFor}
            selectedDir={selectedDir}
            onToggle={onToggle}
            onSnapshot={onSnapshot}
          />
        ))}
    </>
  );
}

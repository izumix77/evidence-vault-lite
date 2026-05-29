import { useMemo, useState } from "react";
import type { EvidenceNode } from "../types";

type Props = {
  title: string;
  nodes: EvidenceNode[];
  alreadySelected: string[];
  onCancel: () => void;
  onConfirm: (evIds: string[]) => void;
};

type NodeWithEvId = EvidenceNode & { ev_id: string };

export function RegistryPicker({
  title,
  nodes,
  alreadySelected,
  onCancel,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const alreadySet = useMemo(
    () => new Set(alreadySelected),
    [alreadySelected],
  );

  const filtered = useMemo(() => {
    const withEvId = nodes.filter(
      (n): n is NodeWithEvId => n.ev_id !== null,
    );
    const q = query.trim().toLowerCase();
    if (!q) return withEvId;
    return withEvId.filter((n) => {
      if (n.ev_id.toLowerCase().includes(q)) return true;
      if (n.title && n.title.toLowerCase().includes(q)) return true;
      if (n.status && n.status.toLowerCase().includes(q)) return true;
      if (n.path.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [nodes, query]);

  function togglePick(evId: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(evId)) next.delete(evId);
      else next.add(evId);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm([...picked]);
  }

  const pickedList = [...picked];

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <input
            type="search"
            className="picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ev_id / title / status / path…"
            autoFocus
          />
          <div className="picker-list">
            {filtered.length === 0 && (
              <div className="empty">No matches.</div>
            )}
            {filtered.map((n) => {
              const already = alreadySet.has(n.ev_id);
              const isPicked = picked.has(n.ev_id);
              return (
                <label
                  key={n.ev_id}
                  className={`picker-row${already ? " picker-row-disabled" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isPicked}
                    disabled={already}
                    onChange={() => togglePick(n.ev_id)}
                  />
                  <div className="picker-row-text">
                    <span className="picker-row-evid">{n.ev_id}</span>
                    {n.title && (
                      <span className="picker-row-title">{n.title}</span>
                    )}
                    <span className="picker-row-meta">
                      {n.status && (
                        <span className={`file-status status-${n.status}`}>
                          {n.status}
                        </span>
                      )}
                      <span className="picker-row-path">{n.path}</span>
                      {already && (
                        <span className="picker-row-tag">already added</span>
                      )}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          {pickedList.length > 0 && (
            <div className="picker-preview">
              <div className="picker-preview-label">
                Will add ({pickedList.length}):
              </div>
              <ul>
                {pickedList.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primary"
            onClick={handleConfirm}
            disabled={picked.size === 0}
          >
            Add ({picked.size})
          </button>
        </div>
      </div>
    </div>
  );
}

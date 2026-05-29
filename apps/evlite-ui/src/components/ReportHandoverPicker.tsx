import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { EvidenceNode, HandoverNode } from "../types";

type SourceKind = "report" | "handover";

type SourceEntry = {
  kind: SourceKind;
  node: EvidenceNode | HandoverNode;
  evId: string;
};

type CandidateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; candidates: string[] }
  | { status: "error"; message: string };

type Props = {
  alreadySelected: string[];
  onCancel: () => void;
  onConfirm: (evIds: string[]) => void;
};

const REPORT_EVID_PATTERN = /\.report-/;

function isReportNode(n: EvidenceNode): boolean {
  return n.ev_id !== null && REPORT_EVID_PATTERN.test(n.ev_id);
}

export function ReportHandoverPicker({
  alreadySelected,
  onCancel,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reports, setReports] = useState<EvidenceNode[]>([]);
  const [handovers, setHandovers] = useState<HandoverNode[]>([]);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const [candidateMap, setCandidateMap] = useState<
    Record<string, CandidateState>
  >({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const alreadySet = useMemo(
    () => new Set(alreadySelected),
    [alreadySelected],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getReports(), api.getHandovers()])
      .then(([allEvIdNodes, hs]) => {
        if (cancelled) return;
        setReports(allEvIdNodes.filter(isReportNode));
        setHandovers(hs);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo<SourceEntry[]>(() => {
    const list: SourceEntry[] = [];
    for (const n of reports) {
      if (n.ev_id) list.push({ kind: "report", node: n, evId: n.ev_id });
    }
    for (const h of handovers) {
      if (h.ev_id) list.push({ kind: "handover", node: h, evId: h.ev_id });
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => {
      if (e.evId.toLowerCase().includes(q)) return true;
      if (e.node.title && e.node.title.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [reports, handovers, query]);

  async function ensureCandidates(entry: SourceEntry) {
    const key = entry.evId;
    if (entry.kind === "handover") {
      const h = entry.node as HandoverNode;
      const candidates = h.must_read ?? [];
      setCandidateMap((prev) => ({
        ...prev,
        [key]: { status: "loaded", candidates },
      }));
      return;
    }
    // Report: fetch frontmatter and read required_packs_for_continuation
    setCandidateMap((prev) => ({ ...prev, [key]: { status: "loading" } }));
    try {
      const payload = await api.getFile(entry.node.path);
      const raw = payload.frontmatter.required_packs_for_continuation;
      const candidates = Array.isArray(raw)
        ? raw.filter((v): v is string => typeof v === "string")
        : [];
      setCandidateMap((prev) => ({
        ...prev,
        [key]: { status: "loaded", candidates },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCandidateMap((prev) => ({
        ...prev,
        [key]: { status: "error", message: msg },
      }));
    }
  }

  function handleExpand(entry: SourceEntry) {
    const key = entry.evId;
    if (expandedFor === key) {
      setExpandedFor(null);
      return;
    }
    setExpandedFor(key);
    if (!candidateMap[key]) {
      void ensureCandidates(entry);
    }
  }

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
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add from report or handover"
      >
        <div className="modal-header">
          <h3>Add from report / handover</h3>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {loading && <div className="empty">Loading…</div>}
          {loadError && (
            <div className="banner-error">{loadError}</div>
          )}
          {!loading && !loadError && (
            <>
              <input
                type="search"
                className="picker-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ev_id / title…"
              />
              <div className="picker-list">
                {entries.length === 0 && (
                  <div className="empty">No reports or handovers found.</div>
                )}
                {entries.map((entry) => {
                  const isOpen = expandedFor === entry.evId;
                  const state =
                    candidateMap[entry.evId] ?? { status: "idle" };
                  return (
                    <div key={entry.evId} className="picker-source">
                      <button
                        type="button"
                        className="picker-source-summary"
                        onClick={() => handleExpand(entry)}
                      >
                        <span className="picker-source-arrow">
                          {isOpen ? "▼" : "▶"}
                        </span>
                        <span
                          className={`picker-source-kind kind-${entry.kind}`}
                        >
                          {entry.kind}
                        </span>
                        <span className="picker-row-evid">{entry.evId}</span>
                        {entry.node.title && (
                          <span className="picker-row-title">
                            {entry.node.title}
                          </span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="picker-source-body">
                          {state.status === "loading" && (
                            <div className="empty">Loading frontmatter…</div>
                          )}
                          {state.status === "error" && (
                            <div className="banner-error">
                              {state.message}
                            </div>
                          )}
                          {state.status === "loaded" &&
                            state.candidates.length === 0 && (
                              <div className="empty">
                                No candidate ev_ids declared in this{" "}
                                {entry.kind === "report"
                                  ? "report's required_packs_for_continuation"
                                  : "handover's must_read"}
                                .
                              </div>
                            )}
                          {state.status === "loaded" &&
                            state.candidates.map((cid) => {
                              const already = alreadySet.has(cid);
                              const isPicked = picked.has(cid);
                              return (
                                <label
                                  key={cid}
                                  className={`picker-candidate${
                                    already ? " picker-row-disabled" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isPicked}
                                    disabled={already}
                                    onChange={() => togglePick(cid)}
                                  />
                                  <span className="picker-row-evid">
                                    {cid}
                                  </span>
                                  {already && (
                                    <span className="picker-row-tag">
                                      already added
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                        </div>
                      )}
                    </div>
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
            </>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primary"
            onClick={handleConfirm}
            disabled={picked.size === 0}
          >
            Add to mustRead ({picked.size})
          </button>
        </div>
      </div>
    </div>
  );
}

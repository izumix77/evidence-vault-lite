import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { EvidenceNode } from "../types";

export function ReportViewer() {
  const [reports, setReports] = useState<EvidenceNode[]>([]);
  const [selected, setSelected] = useState<EvidenceNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getReports()
      .then((nodes) => {
        // ev_id に ".report-" が含まれるものだけフィルタ
        const filtered = nodes.filter(
          (n) => n.ev_id && n.ev_id.includes(".report-"),
        );
        setReports(filtered);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty">Loading reports...</div>;
  if (error) return <div className="banner-error">{error}</div>;

  return (
    <div className="report-viewer">
      <div className="report-list">
        {reports.length === 0 && (
          <div className="empty">
            No reports found.
            <br />
            Run <code>evlite report &lt;name&gt;</code> to create one.
          </div>
        )}
        {reports.map((r) => (
          <div
            key={r.ev_id}
            className={`report-item${
              selected?.ev_id === r.ev_id ? " selected" : ""
            }`}
            onClick={() => setSelected(r)}
          >
            <span className="report-item-evid">{r.ev_id}</span>
            {r.title && <span className="report-item-title">{r.title}</span>}
          </div>
        ))}
      </div>

      <div className="report-detail">
        {!selected && (
          <div className="empty">Select a report to view details.</div>
        )}
        {selected && (
          <div className="report-detail-content">
            <h2>{selected.ev_id}</h2>
            {selected.title && (
              <p className="report-detail-title">{selected.title}</p>
            )}
            <div className="report-detail-meta">
              <div className="form-row">
                <label>path</label>
                <span className="report-detail-value">{selected.path}</span>
              </div>
              {selected.status && (
                <div className="form-row">
                  <label>status</label>
                  <span className="report-detail-value">
                    {selected.status}
                  </span>
                </div>
              )}
              {selected.tags.length > 0 && (
                <div className="form-row">
                  <label>tags</label>
                  <span className="report-detail-value">
                    {selected.tags.join(", ")}
                  </span>
                </div>
              )}
              {selected.excerpt && (
                <div className="report-detail-excerpt">
                  <label>excerpt</label>
                  <pre>{selected.excerpt}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

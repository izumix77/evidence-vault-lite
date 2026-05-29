import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { HandoverNode } from "../types";

type Props = {
  onCreated?: () => void;
};

export function HandoverViewer({ onCreated }: Props) {
  const [handovers, setHandovers] = useState<HandoverNode[]>([]);
  const [selected, setSelected] = useState<HandoverNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdMsg, setCreatedMsg] = useState("");

  function loadHandovers() {
    setLoading(true);
    api
      .getHandovers()
      .then((nodes) => {
        setHandovers(nodes);
        setError("");
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHandovers();
  }, []);

  const nameValid = /^[A-Za-z0-9._-]+$/.test(name.trim());
  const outputPreview = name.trim()
    ? `artifacts/handovers/${name.trim()}.handover.md`
    : "";

  async function handleCreate() {
    if (!nameValid) return;
    setCreating(true);
    setCreateError("");
    setCreatedMsg("");
    try {
      const result = await api.createHandover({ name: name.trim() });
      setCreatedMsg(`✔ generated → ${result.path}`);
      setName("");
      loadHandovers();
      onCreated?.();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="handover-viewer">
      <div className="handover-create">
        <h3>New Handover</h3>
        <div className="form-row">
          <label>name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-session"
            disabled={creating}
          />
        </div>
        <div className="form-row">
          <label>output</label>
          <span className="handover-output-preview">
            {outputPreview || "—"}
          </span>
        </div>
        <div className="form-actions">
          <button
            className="primary"
            onClick={handleCreate}
            disabled={creating || !name.trim() || !nameValid}
          >
            {creating ? "Creating..." : "Create Handover"}
          </button>
          {!nameValid && name.trim() && (
            <span className="error-msg">
              name may only contain letters, digits, '.', '_', '-'
            </span>
          )}
          {createError && <span className="error-msg">{createError}</span>}
          {createdMsg && <span className="saved-msg">{createdMsg}</span>}
        </div>
        <div className="field-hint">
          Tip: run <code>evlite scan</code> after creation to see it in the
          list below.
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="report-viewer">
        <div className="report-list">
          {loading && <div className="empty">Loading handovers...</div>}
          {!loading && handovers.length === 0 && !error && (
            <div className="empty">
              No handovers found.
              <br />
              Use the form above or{" "}
              <code>evlite handover &lt;name&gt;</code>, then{" "}
              <code>evlite scan</code>.
            </div>
          )}
          {handovers.map((h) => (
            <div
              key={h.ev_id ?? h.path}
              className={`report-item${
                selected?.ev_id === h.ev_id ? " selected" : ""
              }`}
              onClick={() => setSelected(h)}
            >
              <span className="report-item-evid">{h.ev_id}</span>
              {h.title && (
                <span className="report-item-title">{h.title}</span>
              )}
              <div className="handover-item-meta">
                {h.status && (
                  <span className={`file-status status-${h.status}`}>
                    {h.status}
                  </span>
                )}
                {h.created_at && (
                  <span className="handover-item-date">{h.created_at}</span>
                )}
                {h.must_read && h.must_read.length > 0 && (
                  <span className="handover-badge">
                    must_read: {h.must_read.length}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="report-detail">
          {!selected && (
            <div className="empty">Select a handover to view details.</div>
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
                {selected.created_at && (
                  <div className="form-row">
                    <label>created_at</label>
                    <span className="report-detail-value">
                      {selected.created_at}
                    </span>
                  </div>
                )}
                {selected.must_read && selected.must_read.length > 0 && (
                  <div className="form-row">
                    <label>must_read</label>
                    <span className="report-detail-value">
                      {selected.must_read.join(", ")}
                    </span>
                  </div>
                )}
                {selected.next_actions && selected.next_actions.length > 0 && (
                  <div className="form-row">
                    <label>next_actions</label>
                    <span className="report-detail-value">
                      {selected.next_actions.join(", ")}
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
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  EVIDENCE_STATUSES,
  type EvidenceStatus,
  type MarkdownFilePayload,
  type Registry,
} from "../types";
import { EvIdListEditor } from "./EvIdListEditor";

type FormState = {
  ev_id: string;
  stack: string;
  status: EvidenceStatus | "";
  tags: string;
  depends_on: string[];
  related: string[];
  supersedes: string[];
};

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function asStringArrayCsv(value: unknown): string {
  return asStringArray(value).join(", ");
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getStatus(value: unknown): EvidenceStatus | "" {
  if (
    typeof value === "string" &&
    (EVIDENCE_STATUSES as readonly string[]).includes(value)
  ) {
    return value as EvidenceStatus;
  }
  return "";
}

function frontmatterToForm(fm: Record<string, unknown>): FormState {
  return {
    ev_id: getString(fm.ev_id),
    stack: getString(fm.stack),
    status: getStatus(fm.status),
    tags: asStringArrayCsv(fm.tags),
    depends_on: asStringArray(fm.depends_on),
    related: asStringArray(fm.related),
    supersedes: asStringArray(fm.supersedes),
  };
}

// "docs/Constitution_v0_1.md" → "docs"
// "Constitution_v0_1.md"      → "" （ルート直下はフォルダなし）
function getStackFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts[parts.length - 2];
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeFormIntoFrontmatter(
  form: FormState,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const fm: Record<string, unknown> = { ...original };

  const setOrDelete = (key: string, value: string) => {
    if (value) fm[key] = value;
    else delete fm[key];
  };

  setOrDelete("ev_id", form.ev_id);
  setOrDelete("stack", form.stack);
  setOrDelete("status", form.status);

  fm.tags = parseCsv(form.tags);
  fm.depends_on = form.depends_on.filter(Boolean);
  fm.related = form.related.filter(Boolean);
  fm.supersedes = form.supersedes.filter(Boolean);

  return fm;
}

type Props = {
  path: string | null;
  registry: Registry;
  onScan: () => Promise<void> | void;
};

export function MetadataEditor({ path, registry, onScan }: Props) {
  const [payload, setPayload] = useState<MarkdownFilePayload | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!path) {
      setPayload(null);
      setForm(null);
      return;
    }
    let cancelled = false;
    setState("loading");
    api
      .getFile(path)
      .then((p) => {
        if (cancelled) return;
        setPayload(p);
        setForm(frontmatterToForm(p.frontmatter));
        setState("idle");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) {
    return <div className="empty">Select a file to edit metadata</div>;
  }
  if (state === "loading" || !form || !payload) {
    return <div className="empty">Loading...</div>;
  }

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const expectedStack = path ? getStackFromPath(path) : "";
  const stackMismatch = expectedStack !== "" && form.stack !== expectedStack;

  function applyStackFromPath() {
    if (!path) return;
    const newStack = getStackFromPath(path);
    if (!newStack) return;

    setForm((prev) => {
      if (!prev) return prev;
      // ev_id の "ev:{oldStack}." を "ev:{newStack}." に置換
      const newEvId = prev.ev_id.replace(/^ev:[^.]+\./, `ev:${newStack}.`);
      return { ...prev, stack: newStack, ev_id: newEvId };
    });
  }

  async function handleAddMetadata() {
    if (!path) return;
    setState("saving");
    setErrorMsg("");
    try {
      const newPayload = await api.initMeta(path);
      setPayload(newPayload);
      setForm(frontmatterToForm(newPayload.frontmatter));
      setState("idle");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
      return;
    }
    try {
      await onScan();
    } catch {
      // registry refresh failure doesn't roll back init-meta
    }
  }

  async function handleSave() {
    if (!path || !payload || !form) return;
    setState("saving");
    setErrorMsg("");
    try {
      const newFrontmatter = mergeFormIntoFrontmatter(form, payload.frontmatter);
      await api.putFile(path, {
        frontmatter: newFrontmatter,
        body: payload.body,
      });
      setPayload({ ...payload, frontmatter: newFrontmatter });
      setState("saved");
      setTimeout(() => {
        setState((current) => (current === "saved" ? "idle" : current));
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  const hasFrontmatter = Object.keys(payload.frontmatter).length > 0;

  return (
    <div className="metadata-editor">
      <h2>{path}</h2>

      {!hasFrontmatter && (
        <div className="add-metadata-banner">
          <button
            type="button"
            className="primary"
            onClick={handleAddMetadata}
            disabled={state === "saving"}
          >
            {state === "saving" ? "Adding..." : "+ Add Metadata"}
          </button>
          <span className="add-metadata-hint">
            This file has no frontmatter yet — start with a draft block.
          </span>
        </div>
      )}

      <div className="form-row">
        <label>ev_id</label>
        <input
          value={form.ev_id}
          onChange={(e) => updateField("ev_id", e.target.value)}
          placeholder="ev:stack.name"
        />
      </div>

      <div className="form-row">
        <label>stack</label>
        <input
          value={form.stack}
          onChange={(e) => updateField("stack", e.target.value)}
        />
        <button
          type="button"
          onClick={applyStackFromPath}
          disabled={!stackMismatch}
          className={stackMismatch ? "btn-warn" : ""}
          title={
            stackMismatch
              ? `stack mismatch — expected "${expectedStack}"`
              : "stack matches path"
          }
        >
          ← path
        </button>
      </div>

      <div className="form-row">
        <label>status</label>
        <select
          value={form.status}
          onChange={(e) =>
            updateField("status", e.target.value as EvidenceStatus | "")
          }
        >
          <option value="">—</option>
          {EVIDENCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>tags</label>
        <input
          value={form.tags}
          onChange={(e) => updateField("tags", e.target.value)}
          placeholder="comma-separated"
        />
      </div>

      <EvIdListEditor
        label="depends_on"
        values={form.depends_on}
        onChange={(v) => updateField("depends_on", v)}
        registry={registry}
        listIdPrefix="metadata-depends_on"
      />

      <EvIdListEditor
        label="related"
        values={form.related}
        onChange={(v) => updateField("related", v)}
        registry={registry}
        listIdPrefix="metadata-related"
      />

      <EvIdListEditor
        label="supersedes"
        values={form.supersedes}
        onChange={(v) => updateField("supersedes", v)}
        registry={registry}
        listIdPrefix="metadata-supersedes"
      />

      <div className="form-actions">
        <button
          className="primary"
          onClick={handleSave}
          disabled={state === "saving"}
        >
          {state === "saving" ? "Saving..." : "Save Metadata"}
        </button>
        {state === "saved" && <span className="saved-msg">✔ Saved</span>}
        {state === "error" && (
          <span className="error-msg">{errorMsg || "Error"}</span>
        )}
      </div>
    </div>
  );
}

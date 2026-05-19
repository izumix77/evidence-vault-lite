import { useState } from "react";
import { api } from "../api/client";
import type { SnapshotResult } from "../types";
import { StringListEditor } from "./StringListEditor";

type SnapshotState = "idle" | "generating" | "success" | "error";

type FormState = {
  path: string;
  stack: string;
  title: string;
  include: string[];
  exclude: string[];
  noContent: boolean;
};

const EMPTY_FORM: FormState = {
  path: "",
  stack: "",
  title: "",
  include: [],
  exclude: [],
  noContent: false,
};

function nonEmpty(values: string[]): string[] | undefined {
  const filtered = values.map((v) => v.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered : undefined;
}

export function SnapshotBuilder() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [state, setState] = useState<SnapshotState>("idle");
  const [result, setResult] = useState<SnapshotResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    if (!form.path.trim()) return;
    setState("generating");
    setErrorMsg("");
    setResult(null);
    try {
      const meta = await api.generateSnapshot({
        path: form.path.trim(),
        stack: form.stack.trim() || undefined,
        title: form.title.trim() || undefined,
        include: nonEmpty(form.include),
        exclude: nonEmpty(form.exclude),
        noContent: form.noContent || undefined,
      });
      setResult(meta);
      setState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  return (
    <div className="snapshot-builder">
      <div className="form-row">
        <label>path</label>
        <input
          value={form.path}
          onChange={(e) => updateField("path", e.target.value)}
          placeholder="packages/core/src"
        />
      </div>

      <div className="form-row">
        <label>stack</label>
        <input
          value={form.stack}
          onChange={(e) => updateField("stack", e.target.value)}
          placeholder="(default: basename of path)"
        />
      </div>

      <div className="form-row">
        <label>title</label>
        <input
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="(default: Directory: {path})"
        />
      </div>

      <StringListEditor
        label="include"
        values={form.include}
        onChange={(v) => updateField("include", v)}
        placeholder="**/*.ts"
      />

      <StringListEditor
        label="exclude"
        values={form.exclude}
        onChange={(v) => updateField("exclude", v)}
        placeholder="**/*.spec.ts"
      />

      <div className="form-row form-row-checkbox">
        <label>no-content</label>
        <label className="checkbox-cell">
          <input
            type="checkbox"
            checked={form.noContent}
            onChange={(e) => updateField("noContent", e.target.checked)}
          />
          <span>tree only (omit file contents)</span>
        </label>
      </div>

      <div className="form-actions">
        <button
          className="primary"
          onClick={handleGenerate}
          disabled={!form.path.trim() || state === "generating"}
        >
          {state === "generating" ? "Generating..." : "Generate Snapshot"}
        </button>
        {state === "error" && (
          <span className="error-msg">{errorMsg || "Error"}</span>
        )}
      </div>

      {state === "success" && result && (
        <div className="snapshot-result">
          <div className="snapshot-result-line">
            <span className="saved-msg">✔ generated → {result.output}</span>
          </div>
          <div className="snapshot-result-line">
            <span className="snapshot-result-label">ev_id</span>
            <code>{result.evId}</code>
          </div>
          <div className="snapshot-result-line">
            <span className="snapshot-result-label">files</span>
            <code>{result.fileCount}</code>
          </div>
        </div>
      )}
    </div>
  );
}

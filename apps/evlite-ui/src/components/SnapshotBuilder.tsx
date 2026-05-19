import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SnapshotResult } from "../types";
import { StringListEditor } from "./StringListEditor";

type PickedDirectory = { name: string };

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: () => Promise<PickedDirectory>;
};

function detectDirectoryPickerSupport(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithDirectoryPicker;
  return typeof w.showDirectoryPicker === "function";
}

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

type Props = {
  onRegistryUpdate: () => void | Promise<void>;
};

export function SnapshotBuilder({ onRegistryUpdate }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [state, setState] = useState<SnapshotState>("idle");
  const [result, setResult] = useState<SnapshotResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [registryUpdated, setRegistryUpdated] = useState<boolean>(false);
  const [browseWarn, setBrowseWarn] = useState<string>("");
  const [browseSupported] = useState<boolean>(detectDirectoryPickerSupport);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    api
      .getFavorites()
      .then(setFavorites)
      .catch(() => {
        // ignore — favorites are optional
      });
  }, []);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveFavorite() {
    const value = form.path.trim();
    if (!value) return;
    try {
      const next = await api.addFavorite(value);
      setFavorites(next);
    } catch (err: unknown) {
      setBrowseWarn(
        `Save favorite failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  function handleUseFavorite(value: string) {
    setForm((prev) => ({ ...prev, path: value }));
    if (browseWarn) setBrowseWarn("");
  }

  async function handleDeleteFavorite(idx: number) {
    try {
      const next = await api.deleteFavorite(idx);
      setFavorites(next);
    } catch (err: unknown) {
      setBrowseWarn(
        `Delete favorite failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleBrowse() {
    const w = window as WindowWithDirectoryPicker;
    if (!w.showDirectoryPicker) return;
    try {
      const handle = await w.showDirectoryPicker();
      setForm((prev) => ({ ...prev, path: handle.name }));
      setBrowseWarn(
        `Picked "${handle.name}". Browsers cannot expose absolute paths — replace this with the path relative to the server root (e.g., packages/${handle.name}).`,
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBrowseWarn(
        `Browse failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleGenerate() {
    if (!form.path.trim()) return;
    setState("generating");
    setErrorMsg("");
    setResult(null);
    setRegistryUpdated(false);
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
      try {
        await api.scan();
        await onRegistryUpdate();
        setRegistryUpdated(true);
      } catch {
        // snapshot succeeded but scan / registry refresh failed —
        // surface the snapshot result anyway, user can rescan manually
      }
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
          onChange={(e) => {
            updateField("path", e.target.value);
            if (browseWarn) setBrowseWarn("");
          }}
          placeholder="packages/core/src"
        />
        {browseSupported && (
          <button
            type="button"
            className="browse-button"
            onClick={handleBrowse}
          >
            Browse...
          </button>
        )}
      </div>
      {browseWarn && (
        <div className="field-hint browse-warn">{browseWarn}</div>
      )}

      <div className="favorites-actions">
        <button
          type="button"
          className="favorite-save-button"
          onClick={handleSaveFavorite}
          disabled={!form.path.trim()}
        >
          ★ Save to Favorites
        </button>
      </div>

      {favorites.length > 0 && (
        <div className="favorites">
          <div className="favorites-title">Favorites</div>
          {favorites.map((fav, i) => (
            <div key={`${i}::${fav}`} className="favorite-row">
              <span className="favorite-path">{fav}</span>
              <button
                type="button"
                onClick={() => handleUseFavorite(fav)}
              >
                Use
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFavorite(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

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
          {registryUpdated && (
            <div className="snapshot-result-line">
              <span className="saved-msg">✔ registry updated</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

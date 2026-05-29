import { useEffect, useState } from "react";
import { ContextPackSchema } from "@ev-lite/shared";
import { api } from "../api/client";
import type { ContextPack, Registry } from "../types";
import { EvIdListEditor } from "./EvIdListEditor";
import { RegistryPicker } from "./RegistryPicker";
import { ReportHandoverPicker } from "./ReportHandoverPicker";

type ListKey = "doNotInfer" | "outputGoal";

type PackState =
  | "idle"
  | "loading"
  | "saving"
  | "building"
  | "deleting"
  | "error";

const EMPTY_PACK: ContextPack = {
  id: "",
  goal: "",
  mustRead: [],
  doNotInfer: [],
  outputGoal: [],
  related: [],
};

type PickerKind = "mustRead-registry" | "mustRead-report" | "related-registry";

function mergeUnique(base: string[], incoming: string[]): string[] {
  const seen = new Set(base);
  const out = [...base];
  for (const v of incoming) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

type Props = {
  registry: Registry;
};

export function PackBuilder({ registry }: Props) {
  const [packIds, setPackIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [pack, setPack] = useState<ContextPack>(EMPTY_PACK);
  const [preview, setPreview] = useState<string>("");
  const [state, setState] = useState<PackState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  const [picker, setPicker] = useState<PickerKind | null>(null);

  useEffect(() => {
    api
      .getPacks()
      .then(setPackIds)
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setState("error");
      });
  }, []);

  async function loadPack(id: string) {
    setSelectedId(id);
    setPreview("");
    if (!id) {
      setPack(EMPTY_PACK);
      return;
    }
    setState("loading");
    try {
      const p = await api.getPack(id);
      setPack(p);
      setState("idle");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  function newPack() {
    setSelectedId("");
    setPack(EMPTY_PACK);
    setPreview("");
    setState("idle");
    setErrorMsg("");
  }

  async function handleSave() {
    const targetId = selectedId || pack.id;
    if (!targetId) return;
    setState("saving");
    setErrorMsg("");
    try {
      await api.putPack(targetId, pack);
      const ids = await api.getPacks();
      setPackIds(ids);
      setSelectedId(targetId);
      setState("idle");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm(`Delete ${selectedId} ?`)) return;
    setState("deleting");
    setErrorMsg("");
    try {
      await api.deletePack(selectedId);
      const ids = await api.getPacks();
      setPackIds(ids);
      setSelectedId("");
      setPack(EMPTY_PACK);
      setPreview("");
      setState("idle");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  async function handleBuild() {
    if (!pack.id) return;
    setState("building");
    setErrorMsg("");
    try {
      const md = await api.buildPack(pack.id);
      setPreview(md);
      setState("idle");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  function updateListItem(key: ListKey, idx: number, value: string) {
    setPack((prev) => {
      const arr = [...prev[key]];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  }

  function addListItem(key: ListKey) {
    setPack((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  }

  function removeListItem(key: ListKey, idx: number) {
    setPack((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  }

  function openImport() {
    setImportOpen(true);
    setImportText("");
    setImportError("");
  }

  function closeImport() {
    setImportOpen(false);
    setImportError("");
  }

  async function handleImport() {
    setImportError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`Invalid JSON: ${msg}`);
      return;
    }
    const result = ContextPackSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      setImportError(`Schema validation failed:\n${issues}`);
      return;
    }
    const imported = result.data as ContextPack;
    setPack(imported);
    setSelectedId("");
    setPreview("");
    setImportOpen(false);
    setState("saving");
    setErrorMsg("");
    try {
      await api.putPack(imported.id, imported);
      const ids = await api.getPacks();
      setPackIds(ids);
      setSelectedId(imported.id);
      setState("idle");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context / permission denied)
    }
  }

  const isExisting = selectedId !== "";

  return (
    <div className="pack-builder">
      <div className="pack-list">
        <select
          value={selectedId}
          onChange={(e) => loadPack(e.target.value)}
        >
          <option value="">— select pack —</option>
          {packIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button onClick={newPack}>New</button>
        <button onClick={openImport}>Import JSON</button>
        <button
          onClick={handleDelete}
          disabled={!selectedId || state === "deleting"}
        >
          {state === "deleting" ? "Deleting..." : "Delete"}
        </button>
      </div>

      <div className="form-row">
        <label>id</label>
        <input
          value={pack.id}
          onChange={(e) => setPack({ ...pack, id: e.target.value })}
          placeholder="pack:name"
          readOnly={isExisting}
          className={isExisting ? "field-readonly" : ""}
        />
      </div>
      {isExisting && (
        <div className="field-hint">id is immutable after creation</div>
      )}

      <div className="form-row">
        <label>goal</label>
        <textarea
          value={pack.goal}
          onChange={(e) => setPack({ ...pack, goal: e.target.value })}
        />
      </div>

      <EvIdListEditor
        label="mustRead"
        values={pack.mustRead}
        onChange={(v) => setPack((prev) => ({ ...prev, mustRead: v }))}
        registry={registry}
        listIdPrefix="pack-mustRead"
        reorderable={true}
      />
      <div className="picker-actions">
        <button
          type="button"
          onClick={() => setPicker("mustRead-registry")}
        >
          + Add from registry
        </button>
        <button
          type="button"
          onClick={() => setPicker("mustRead-report")}
        >
          + From report/handover
        </button>
      </div>

      <ListField
        label="doNotInfer"
        items={pack.doNotInfer}
        onAdd={() => addListItem("doNotInfer")}
        onUpdate={(i, v) => updateListItem("doNotInfer", i, v)}
        onRemove={(i) => removeListItem("doNotInfer", i)}
      />

      <ListField
        label="outputGoal"
        items={pack.outputGoal}
        onAdd={() => addListItem("outputGoal")}
        onUpdate={(i, v) => updateListItem("outputGoal", i, v)}
        onRemove={(i) => removeListItem("outputGoal", i)}
      />

      <EvIdListEditor
        label="related"
        values={pack.related ?? []}
        onChange={(v) =>
          setPack((prev) => ({ ...prev, related: v }))
        }
        registry={registry}
        listIdPrefix="pack-related"
        reorderable={true}
      />
      <div className="picker-actions">
        <button
          type="button"
          onClick={() => setPicker("related-registry")}
        >
          + Add related
        </button>
      </div>

      <div className="form-actions">
        <button
          className="primary"
          onClick={handleSave}
          disabled={(!selectedId && !pack.id) || state === "saving"}
        >
          {state === "saving" ? "Saving..." : "Save Pack"}
        </button>
        <button
          onClick={handleBuild}
          disabled={!pack.id || state === "building"}
        >
          {state === "building" ? "Building..." : "Generate pack.md"}
        </button>
        {state === "error" && (
          <span className="error-msg">{errorMsg || "Error"}</span>
        )}
      </div>

      {preview && (
        <div className="preview">
          <h3>Preview: pack.md</h3>
          <div className="preview-body">
            <button className="preview-copy" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre>{preview}</pre>
          </div>
        </div>
      )}

      {importOpen && (
        <div
          className="modal-backdrop"
          onClick={closeImport}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Import ContextPack JSON"
          >
            <div className="modal-header">
              <h3>Import ContextPack JSON</h3>
              <button
                className="modal-close"
                onClick={closeImport}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">
                Paste a ContextPack JSON below. Required fields:{" "}
                <code>id</code>, <code>goal</code>, <code>mustRead</code>,{" "}
                <code>doNotInfer</code>, <code>outputGoal</code>.
              </p>
              <textarea
                className="modal-textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"id":"pack:example","goal":"...","mustRead":[],"doNotInfer":[],"outputGoal":[]}'
                spellCheck={false}
                autoFocus
              />
              {importError && (
                <pre className="modal-error">{importError}</pre>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeImport}>Cancel</button>
              <button
                className="primary"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {picker === "mustRead-registry" && (
        <RegistryPicker
          title="Add to mustRead — from registry"
          nodes={registry.nodes}
          alreadySelected={pack.mustRead}
          onCancel={() => setPicker(null)}
          onConfirm={(ids) => {
            setPack((prev) => ({
              ...prev,
              mustRead: mergeUnique(prev.mustRead, ids),
            }));
            setPicker(null);
          }}
        />
      )}

      {picker === "mustRead-report" && (
        <ReportHandoverPicker
          alreadySelected={pack.mustRead}
          onCancel={() => setPicker(null)}
          onConfirm={(ids) => {
            setPack((prev) => ({
              ...prev,
              mustRead: mergeUnique(prev.mustRead, ids),
            }));
            setPicker(null);
          }}
        />
      )}

      {picker === "related-registry" && (
        <RegistryPicker
          title="Add to related"
          nodes={registry.nodes}
          alreadySelected={pack.related ?? []}
          onCancel={() => setPicker(null)}
          onConfirm={(ids) => {
            setPack((prev) => ({
              ...prev,
              related: mergeUnique(prev.related ?? [], ids),
            }));
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

type ListFieldProps = {
  label: string;
  items: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
};

function ListField({
  label,
  items,
  onAdd,
  onUpdate,
  onRemove,
  placeholder,
}: ListFieldProps) {
  return (
    <div className="list-field">
      <div className="list-label">
        <label>{label}</label>
        <button onClick={onAdd}>+</button>
      </div>
      {items.length === 0 && (
        <div className="list-empty">— empty —</div>
      )}
      {items.map((item, i) => (
        <div key={i} className="list-row">
          <input
            value={item}
            onChange={(e) => onUpdate(i, e.target.value)}
            placeholder={placeholder}
          />
          <button onClick={() => onRemove(i)}>×</button>
        </div>
      ))}
    </div>
  );
}

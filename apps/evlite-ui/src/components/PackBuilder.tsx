import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ContextPack } from "../types";

type ListKey = "mustRead" | "doNotInfer" | "outputGoal";

type PackState = "idle" | "loading" | "saving" | "building" | "error";

const EMPTY_PACK: ContextPack = {
  id: "",
  goal: "",
  mustRead: [],
  doNotInfer: [],
  outputGoal: [],
};

export function PackBuilder() {
  const [packIds, setPackIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [pack, setPack] = useState<ContextPack>(EMPTY_PACK);
  const [preview, setPreview] = useState<string>("");
  const [state, setState] = useState<PackState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

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
    if (!pack.id) return;
    setState("saving");
    setErrorMsg("");
    try {
      await api.putPack(pack.id, pack);
      const ids = await api.getPacks();
      setPackIds(ids);
      setSelectedId(pack.id);
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
      </div>

      <div className="form-row">
        <label>id</label>
        <input
          value={pack.id}
          onChange={(e) => setPack({ ...pack, id: e.target.value })}
          placeholder="pack:name"
        />
      </div>

      <div className="form-row">
        <label>goal</label>
        <textarea
          value={pack.goal}
          onChange={(e) => setPack({ ...pack, goal: e.target.value })}
        />
      </div>

      <ListField
        label="mustRead"
        items={pack.mustRead}
        onAdd={() => addListItem("mustRead")}
        onUpdate={(i, v) => updateListItem("mustRead", i, v)}
        onRemove={(i) => removeListItem("mustRead", i)}
        placeholder="ev:stack.name"
      />

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

      <div className="form-actions">
        <button
          className="primary"
          onClick={handleSave}
          disabled={!pack.id || state === "saving"}
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
          <pre>{preview}</pre>
        </div>
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

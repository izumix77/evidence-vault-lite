import { useState } from "react";
import type { Registry } from "../types";
import { EvIdInput } from "./EvIdInput";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  registry: Registry;
  listIdPrefix: string;
  reorderable?: boolean;
};

export function EvIdListEditor({
  label,
  values,
  onChange,
  registry,
  listIdPrefix,
  reorderable = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateAt(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  function addRow() {
    onChange([...values, ""]);
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...values];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === values.length - 1) return;
    const next = [...values];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...values];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  }

  return (
    <div className="list-field">
      <div className="list-label">
        <label>{label}</label>
        <button onClick={addRow}>+</button>
      </div>
      {values.length === 0 && (
        <div className="list-empty">— empty —</div>
      )}
      {values.map((value, i) => (
        <div
          key={i}
          className="list-row"
          style={reorderable && dragIndex === i ? { opacity: 0.5 } : undefined}
          onDragOver={reorderable ? (e) => e.preventDefault() : undefined}
          onDrop={reorderable ? () => handleDrop(i) : undefined}
        >
          {reorderable && (
            <span
              className="list-drag-handle"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              title="Drag to reorder"
            >
              ⠿
            </span>
          )}
          <EvIdInput
            value={value}
            onChange={(v) => updateAt(i, v)}
            registry={registry}
            listId={`${listIdPrefix}-${i}`}
          />
          {reorderable && (
            <>
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0}
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === values.length - 1}
                title="Move down"
              >
                ↓
              </button>
            </>
          )}
          <button onClick={() => removeAt(i)}>×</button>
        </div>
      ))}
    </div>
  );
}

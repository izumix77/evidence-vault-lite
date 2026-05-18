import type { Registry } from "../types";
import { EvIdInput } from "./EvIdInput";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  registry: Registry;
  listIdPrefix: string;
};

export function EvIdListEditor({
  label,
  values,
  onChange,
  registry,
  listIdPrefix,
}: Props) {
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
        <div key={i} className="list-row">
          <EvIdInput
            value={value}
            onChange={(v) => updateAt(i, v)}
            registry={registry}
            listId={`${listIdPrefix}-${i}`}
          />
          <button onClick={() => removeAt(i)}>×</button>
        </div>
      ))}
    </div>
  );
}

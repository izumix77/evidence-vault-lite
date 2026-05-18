import type { EvidenceNode, Registry } from "../types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  registry: Registry;
  listId: string;
  placeholder?: string;
};

type NodeWithEvId = EvidenceNode & { ev_id: string };

export function EvIdInput({
  value,
  onChange,
  registry,
  listId,
  placeholder,
}: Props) {
  const options = registry.nodes.filter(
    (n): n is NodeWithEvId => n.ev_id !== null,
  );

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        placeholder={placeholder ?? "ev:stack.name"}
      />
      <datalist id={listId}>
        {options.map((n) => (
          <option key={n.ev_id} value={n.ev_id}>
            {n.ev_id} — {n.title ?? n.path}
          </option>
        ))}
      </datalist>
    </>
  );
}

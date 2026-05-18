import type {
  ContextPack,
  EvidenceNode,
  MarkdownFilePayload,
  Registry,
} from "../types";

const API_BASE = "/api";

async function request<T>(
  path: string,
  init?: RequestInit,
  parse: "json" | "text" = "json",
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  if (parse === "text") return (await res.text()) as T;
  return (await res.json()) as T;
}

export const api = {
  scan: () => request<Registry>("/scan", { method: "POST" }),

  getRegistry: () => request<Registry>("/registry"),

  getFiles: () => request<EvidenceNode[]>("/files"),

  getFile: (path: string) =>
    request<MarkdownFilePayload>(`/file?path=${encodeURIComponent(path)}`),

  putFile: (
    path: string,
    payload: { frontmatter: Record<string, unknown>; body: string },
  ) =>
    request<{ ok: boolean }>(`/file?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getPacks: () => request<string[]>("/packs"),

  getPack: (id: string) =>
    request<ContextPack>(`/packs/${encodeURIComponent(id)}`),

  putPack: (id: string, pack: ContextPack) =>
    request<{ ok: boolean }>(`/packs/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(pack),
    }),

  buildPack: (id: string) =>
    request<string>(
      `/packs/${encodeURIComponent(id)}/build`,
      { method: "POST" },
      "text",
    ),
};

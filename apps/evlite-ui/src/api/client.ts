import type {
  ContextPack,
  EvidenceNode,
  HandoverCreateInput,
  HandoverCreateResult,
  HandoverNode,
  MarkdownFilePayload,
  Registry,
  SnapshotInput,
  SnapshotResult,
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

  getReports: () => request<EvidenceNode[]>("/reports"),

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

  initMeta: (path: string) =>
    request<MarkdownFilePayload>(
      `/file/init-meta?path=${encodeURIComponent(path)}`,
      { method: "POST" },
    ),

  getPacks: () => request<string[]>("/packs"),

  getPack: (id: string) =>
    request<ContextPack>(`/packs/${encodeURIComponent(id)}`),

  putPack: (id: string, pack: ContextPack) =>
    request<{ ok: boolean }>(`/packs/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(pack),
    }),

  deletePack: (id: string) =>
    request<void>(`/packs/${encodeURIComponent(id)}`, { method: "DELETE" }),

  generateSnapshot: (input: SnapshotInput) =>
    request<SnapshotResult>("/snapshot", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  buildPack: (id: string) =>
    request<string>(
      `/packs/${encodeURIComponent(id)}/build`,
      { method: "POST" },
      "text",
    ),

  getFavorites: () => request<string[]>("/favorites"),

  addFavorite: (path: string) =>
    request<string[]>("/favorites", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  deleteFavorite: (idx: number) =>
    request<string[]>(`/favorites/${idx}`, { method: "DELETE" }),

  getHandovers: () => request<HandoverNode[]>("/handovers"),

  createHandover: (input: HandoverCreateInput) =>
    request<HandoverCreateResult>("/handover", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

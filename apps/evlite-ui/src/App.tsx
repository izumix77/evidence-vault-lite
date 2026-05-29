import { useEffect, useState } from "react";
import { api } from "./api/client";
import { FileList } from "./components/FileList";
import { MetadataEditor } from "./components/MetadataEditor";
import { PackBuilder } from "./components/PackBuilder";
import { SnapshotBuilder } from "./components/SnapshotBuilder";
import { ReportViewer } from "./components/ReportViewer";
import { HandoverViewer } from "./components/HandoverViewer";
import type { Registry } from "./types";
import "./App.css";

type Tab = "metadata" | "pack" | "snapshot" | "reports" | "handovers";

const EMPTY_REGISTRY: Registry = {
  generated_at: "",
  root: "",
  nodes: [],
};

function getBasename(root: string): string {
  if (!root) return "";
  const normalized = root.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() ?? "";
}

export function App() {
  const [registry, setRegistry] = useState<Registry>(EMPTY_REGISTRY);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("metadata");
  const [scanning, setScanning] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  async function loadRegistry() {
    try {
      const r = await api.getRegistry();
      setRegistry(r);
      setLoadError("");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    loadRegistry();
  }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const r = await api.scan();
      setRegistry(r);
      setLoadError("");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleSelect(path: string) {
    setSelectedPath(path);
    setTab("metadata");
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          EvidenceVault Lite
          {getBasename(registry.root) && (
            <span className="app-header-repo">
              {" "}
              | {getBasename(registry.root)}
            </span>
          )}
        </h1>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <FileList
            files={registry.nodes}
            selectedPath={selectedPath}
            scanning={scanning}
            onSelect={handleSelect}
            onScan={handleScan}
          />
        </aside>
        <main className="main">
          <nav className="tabs">
            <button
              className={tab === "metadata" ? "active" : ""}
              onClick={() => setTab("metadata")}
            >
              Metadata Editor
            </button>
            <button
              className={tab === "pack" ? "active" : ""}
              onClick={() => setTab("pack")}
            >
              Pack Builder
            </button>
            <button
              className={tab === "snapshot" ? "active" : ""}
              onClick={() => setTab("snapshot")}
            >
              Snapshot
            </button>
            <button
              className={tab === "reports" ? "active" : ""}
              onClick={() => setTab("reports")}
            >
              Reports
            </button>
            <button
              className={tab === "handovers" ? "active" : ""}
              onClick={() => setTab("handovers")}
            >
              Handovers
            </button>
          </nav>
          <div className="tab-content">
            {loadError && (
              <div className="banner-error">
                Failed to load registry: {loadError}
                {" "}
                <span className="banner-hint">
                  (run <code>evlite scan</code> or click [Scan ▶])
                </span>
              </div>
            )}
            {tab === "metadata" && (
              <MetadataEditor
                path={selectedPath}
                registry={registry}
                onScan={handleScan}
              />
            )}
            {tab === "pack" && <PackBuilder registry={registry} />}
            {tab === "snapshot" && (
              <SnapshotBuilder onRegistryUpdate={loadRegistry} />
            )}
            {tab === "reports" && <ReportViewer />}
            {tab === "handovers" && (
              <HandoverViewer onCreated={loadRegistry} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

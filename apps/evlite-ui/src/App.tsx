import { useEffect, useState } from "react";
import { api } from "./api/client";
import { FileList } from "./components/FileList";
import { MetadataEditor } from "./components/MetadataEditor";
import { PackBuilder } from "./components/PackBuilder";
import type { EvidenceNode } from "./types";
import "./App.css";

type Tab = "metadata" | "pack";

export function App() {
  const [files, setFiles] = useState<EvidenceNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("metadata");
  const [scanning, setScanning] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  async function loadFiles() {
    try {
      const f = await api.getFiles();
      setFiles(f);
      setLoadError("");
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const registry = await api.scan();
      setFiles(registry.nodes);
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
        <h1>EvidenceVault Lite</h1>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <FileList
            files={files}
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
          </nav>
          <div className="tab-content">
            {loadError && (
              <div className="banner-error">
                Failed to load files: {loadError}
                {" "}
                <span className="banner-hint">
                  (run <code>evlite scan</code> or click [Scan ▶])
                </span>
              </div>
            )}
            {tab === "metadata" && <MetadataEditor path={selectedPath} />}
            {tab === "pack" && <PackBuilder />}
          </div>
        </main>
      </div>
    </div>
  );
}

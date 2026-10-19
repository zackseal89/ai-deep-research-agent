"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Download, ExternalLink, FileText, Globe2, ListChecks, RotateCw } from "@/components/icons";
import { FileViewerModal } from "@/components/FileViewerModal";
import { ValuationEditor } from "@/components/ValuationEditor";
import type { Deal, ResearchFile, Source } from "@/types/research";

type Tab = "checklist" | "artifacts" | "evidence" | "valuation";

function downloadFile(file: ResearchFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.path.split("/").pop() || "diligence.md";
  link.click();
  URL.revokeObjectURL(url);
}

function EvidenceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return <div className="workspace-empty"><Globe2 size={20} /><strong>No evidence loaded</strong><span>Run a dated SEC review to attach source links.</span></div>;
  return <div className="evidence-list">{sources.map((source) => (
    <article className="evidence-item" key={source.id}>
      <div className="evidence-topline"><span className={`evidence-type evidence-${source.kind}`}>{source.kind}</span><span className="evidence-ticker">{source.ticker || "PUBLIC SOURCE"}</span><span className="evidence-verification">{source.verification.replaceAll("_", " ")}</span></div>
      <a className="evidence-title" href={source.url} target="_blank" rel="noreferrer noopener">{source.title}<ExternalLink size={13} /></a>
      <p className="evidence-excerpt">{source.excerpt || "Open the original source to review its supporting passage."}</p>
      <div className="evidence-date">Published/filed {source.source_date || "date not supplied"} · Retrieved {new Date(source.retrieved_at).toLocaleDateString()}</div>
    </article>
  ))}</div>;
}

export function Workspace({ deal, onSaveValuation }: { deal: Deal; onSaveValuation: (value: Deal["valuation"]) => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<Tab>("artifacts");
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [copiedPath, setCopiedPath] = useState("");
  const [copyError, setCopyError] = useState("");
  const files = deal.artifacts ?? [];
  const sources = deal.sources ?? [];
  const stages = deal.stages ?? [];
  const evidenceCount = sources.length;
  const completedCount = stages.filter((stage) => stage.status === "completed").length;
  const metrics = useMemo(() => deal.metrics ?? [], [deal.metrics]);

  async function copyFile(file: ResearchFile) {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      setCopyError("");
      window.setTimeout(() => setCopiedPath(""), 1800);
    } catch {
      setCopyError("Clipboard permission was denied. Select the preview text and copy it manually.");
    }
  }

  function exportAll() {
    const content = files.map((file) => `<!-- ${file.path} · revision ${file.revision} -->\n${file.content}`).join("\n\n---\n\n");
    downloadFile({ path: "/reports/IC-diligence-draft.md", content, revision: 1, updated_at: new Date().toISOString() });
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "checklist", label: "Due diligence", count: stages.length },
    { id: "artifacts", label: "Artifacts", count: files.length },
    { id: "evidence", label: "Evidence & citations", count: evidenceCount },
    { id: "valuation", label: "Valuation inputs" },
  ];

  return (
    <section className="workspace-panel" aria-label="Deal room workspace">
      <div className="workspace-heading">
        <div><div className="section-eyebrow">DEAL ROOM · {deal.peers.length + 1} COMPANIES</div><h3>Review workspace</h3><p>{completedCount} of {stages.length} workflow stages compiled · {evidenceCount} evidence records</p></div>
        {files.length > 0 && <button className="export-button" onClick={exportAll}><Download size={15} /> Export all drafts</button>}
      </div>

      <div className="workspace-tabs" role="tablist" aria-label="Deal room views">
        {tabs.map((tab) => <button role="tab" aria-selected={activeTab === tab.id} className={`workspace-tab ${activeTab === tab.id ? "tab-active" : ""}`} key={tab.id} onClick={() => setActiveTab(tab.id)}>
          {tab.label}{tab.count !== undefined && <span>{tab.count}</span>}
        </button>)}
      </div>

      <div className="workspace-content" role="tabpanel">
        {activeTab === "checklist" && <div className="checklist-list">{stages.map((stage, index) => <article className="checklist-item" key={stage.stage}>
          <div className={`checklist-mark mark-${stage.status}`}>{stage.status === "completed" ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</div>
          <div className="checklist-main"><div className="checklist-title"><span>{stage.stage}</span><span className={`stage-status status-${stage.status}`}>{stage.status.replaceAll("_", " ")}</span></div><p>{stage.detail}</p><span className="checklist-evidence">{stage.evidence_count} linked evidence records</span></div>
        </article>)}</div>}

        {activeTab === "artifacts" && <div className="artifact-list">{files.length ? files.map((file) => <article className="artifact-item" key={file.path}>
          <button className="artifact-open" onClick={() => setSelectedFile(file)}><span className="artifact-icon"><FileText size={17} /></span><span className="artifact-info"><strong>{file.path.split("/").pop()}</strong><small>Revision {file.revision} · Saved {new Date(file.updated_at).toLocaleString()}</small></span></button>
          <div className="artifact-actions"><button aria-label={`Copy ${file.path}`} title="Copy Markdown" onClick={() => void copyFile(file)}>{copiedPath === file.path ? <Check size={15} /> : <Clipboard size={15} />}</button><button aria-label={`Download ${file.path}`} title="Download Markdown" onClick={() => downloadFile(file)}><Download size={15} /></button></div>
        </article>) : <div className="workspace-empty"><FileText size={20} /><strong>No draft artifacts yet</strong><span>Run the five-stage review to compile the memo, valuation model and risk register.</span></div>}
          {copyError && <p role="alert" className="copy-error">{copyError}</p>}
        </div>}

        {activeTab === "evidence" && <EvidenceList sources={sources} />}

        {activeTab === "valuation" && <ValuationEditor deal={deal} onSave={onSaveValuation} />}
      </div>

      <div className="workspace-footer"><span><span className="footer-dot" /> DRAFT · HUMAN REVIEW REQUIRED</span><span>{deal.coverage?.commercial ? "Commercial discovery returned leads" : "Commercial coverage incomplete"} · {deal.coverage?.news ? "News leads retrieved" : "News coverage incomplete"}</span></div>
      <FileViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
    </section>
  );
}

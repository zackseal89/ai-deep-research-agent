"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListTodo,
  FileText,
  Download,
  Globe,
  Check,
  Circle,
  CircleDot,
  X,
} from "lucide-react";
import { ResearchState, Todo, ResearchFile, Source } from "@/types/research";
import { FileViewerModal } from "@/components/FileViewerModal";

// Helper function to download file content
function downloadFile(file: ResearchFile) {
  const blob = new Blob([file.content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.path.split("/").pop() || "file.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface WorkspaceProps {
  state: ResearchState;
}

// Collapsible section component with smooth transitions
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="workspace-section">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="workspace-section-header w-full transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <span className="font-semibold text-[var(--color-text-primary)]">
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span
              style={{
                background: "var(--color-accent)",
                color: "var(--color-background)",
                padding: "var(--space-1) var(--space-2)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--font-semibold)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-[var(--color-text-tertiary)] transition-transform" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)] transition-transform" />
        )}
      </button>
      {isOpen && <div className="workspace-section-content">{children}</div>}
    </div>
  );
}

// Todo list component with animations
function TodoList({ todos }: { todos: Todo[] }) {
  if (todos.length === 0) {
    return (
      <div
        className="empty-state"
        style={{
          paddingTop: "var(--space-8)",
          paddingBottom: "var(--space-8)",
          animation: "fadeIn 0.4s ease",
        }}
      >
        <ListTodo
          size={32}
          strokeWidth={1.5}
          style={{
            color: "var(--color-text-tertiary)",
            marginBottom: "var(--space-3)",
          }}
        />
        <p style={{ fontSize: "var(--text-sm)" }}>No tasks yet</p>
        <p className="text-xs mt-1">Research tasks will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className={`todo-item animate-fadeSlideIn ${
            todo.status === "completed"
              ? "todo-item-completed"
              : todo.status === "in_progress"
                ? "todo-item-inprogress"
                : "todo-item-pending"
          }`}
        >
          <span
            className={`${
              todo.status === "completed"
                ? "status-completed"
                : todo.status === "in_progress"
                  ? "status-inprogress"
                  : "status-pending"
            }`}
          >
            {todo.status === "completed" ? (
              <Check size={14} />
            ) : todo.status === "in_progress" ? (
              <CircleDot size={14} />
            ) : (
              <Circle size={14} />
            )}
          </span>
          <span className="text-sm">{todo.content}</span>
        </div>
      ))}
    </div>
  );
}

// File list component with click-to-view and animations
function FileList({
  files,
  onFileClick,
}: {
  files: ResearchFile[];
  onFileClick: (file: ResearchFile) => void;
}) {
  if (files.length === 0) {
    return (
      <div
        className="empty-state"
        style={{
          paddingTop: "var(--space-8)",
          paddingBottom: "var(--space-8)",
          animation: "fadeIn 0.4s ease",
        }}
      >
        <FileText
          size={32}
          strokeWidth={1.5}
          style={{
            color: "var(--color-text-tertiary)",
            marginBottom: "var(--space-3)",
          }}
        />
        <p style={{ fontSize: "var(--text-sm)" }}>No files yet</p>
        <p className="text-xs mt-1">Research artifacts will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <div
          key={`${file.path}-${i}`}
          className="file-item animate-fadeSlideIn"
          onClick={() => onFileClick(file)}
        >
          <div className="flex items-center gap-3">
            <div className="file-item-icon">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {file.path.split("/").pop()}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {file.path}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Don't trigger file view on download click
              downloadFile(file);
            }}
            className="p-2 rounded-lg hover:bg-[var(--color-glass-subtle)] transition-colors"
            aria-label="Download file"
            title="Download file"
          >
            <Download className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Source list component with error states and animations
function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return (
      <div
        className="empty-state"
        style={{
          paddingTop: "var(--space-8)",
          paddingBottom: "var(--space-8)",
          animation: "fadeIn 0.4s ease",
        }}
      >
        <Globe
          size={32}
          strokeWidth={1.5}
          style={{
            color: "var(--color-text-tertiary)",
            marginBottom: "var(--space-3)",
          }}
        />
        <p style={{ fontSize: "var(--text-sm)" }}>No sources yet</p>
        <p className="text-xs mt-1">Web sources will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source, i) => (
        <div
          key={`${source.url}-${i}`}
          className={`file-item animate-fadeSlideIn ${source.status === "failed" ? "source-failed" : ""}`}
          title={
            source.status === "failed"
              ? "Failed to scrape this source"
              : undefined
          }
        >
          <div className="flex items-center gap-3">
            <span
              className={`source-indicator ${
                source.status === "scraped"
                  ? "status-completed"
                  : source.status === "failed"
                    ? ""
                    : "status-pending"
              }`}
              style={
                source.status === "failed"
                  ? { color: "var(--color-error)" }
                  : undefined
              }
            >
              {source.status === "scraped" ? (
                <Check size={14} style={{ color: "var(--color-success)" }} />
              ) : source.status === "failed" ? (
                <X size={14} style={{ color: "var(--color-error)" }} />
              ) : (
                <Circle size={14} />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {source.title ||
                  (() => {
                    try {
                      return new URL(source.url).hostname;
                    } catch {
                      return source.url.slice(0, 40);
                    }
                  })()}
              </p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] truncate block"
              >
                {source.url}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Workspace component
export function Workspace({ state }: WorkspaceProps) {
  const { todos, files, sources } = state;
  const fileCount = files.length;
  const todoCount = todos.length;
  const sourceCount = sources.length;
  const completedTodos = todos.filter((t) => t.status === "completed").length;

  // State for file viewer modal
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExportAll = () => {
    if (files.length === 0) return;
    const combinedContent = files
      .map(
        (f) =>
          `# ${f.path}\n*Generated: ${new Date(f.createdAt).toLocaleString()}*\n\n${f.content}\n\n---\n`
      )
      .join("\n");

    const blob = new Blob([combinedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deep-research-dossier-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    if (files.length === 0) return;
    const summary = files.map((f) => `### ${f.path}\n${f.content}`).join("\n\n");
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="workspace-panel p-6 h-full flex flex-col overflow-y-auto">
      {/* Header with Telemetry & Actions */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Research Workspace
            </h2>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
              FDE Grounding
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Real-time execution artifacts, virtual filesystem & evidence
          </p>

          {/* Quick Stats Pill Strip */}
          <div className="flex items-center gap-3 mt-3">
            <div className="text-xs px-2.5 py-1 rounded-md bg-[var(--color-glass-dark)] border border-[var(--color-border-glass)] text-[var(--color-text-secondary)]">
              Plan: <strong className="text-[var(--color-text-primary)]">{completedTodos}/{todoCount}</strong>
            </div>
            <div className="text-xs px-2.5 py-1 rounded-md bg-[var(--color-glass-dark)] border border-[var(--color-border-glass)] text-[var(--color-text-secondary)]">
              Artifacts: <strong className="text-[var(--color-text-primary)]">{fileCount}</strong>
            </div>
            <div className="text-xs px-2.5 py-1 rounded-md bg-[var(--color-glass-dark)] border border-[var(--color-border-glass)] text-[var(--color-text-secondary)]">
              Sources: <strong className="text-[var(--color-text-primary)]">{sourceCount}</strong>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-glass)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] transition-all font-medium"
              title="Copy all generated text to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <FileText className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy All"}
            </button>
            <button
              onClick={handleExportAll}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:opacity-90 text-white font-medium shadow-sm transition-all"
              title="Download consolidated Markdown dossier"
            >
              <Download className="w-3.5 h-3.5" />
              Export Dossier (.md)
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Section title="Autonomous Research Plan" icon={ListTodo} badge={todoCount}>
          <TodoList todos={todos} />
        </Section>

        <Section title="Filesystem Artifacts" icon={FileText} badge={fileCount}>
          <FileList files={files} onFileClick={setSelectedFile} />
        </Section>

        <Section title="Grounded Sources & Citations" icon={Globe} badge={sourceCount}>
          <SourceList sources={sources} />
        </Section>
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </div>
  );
}

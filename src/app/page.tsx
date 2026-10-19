"use client";

import { useState, useRef } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { useDefaultTool } from "@copilotkit/react-core";
import { Workspace } from "@/components/Workspace";
import { ResearchState, INITIAL_STATE, Todo } from "@/types/research";
import { ToolCard } from "@/components/ToolCard";

export default function Page() {
  const [state, setState] = useState<ResearchState>(INITIAL_STATE);
  const processedKeysRef = useRef<Set<string>>(new Set());

  useDefaultTool({
    render: (props) => {
      const { name, status, args, result } = props;

      // Prevent duplicate processing on re-renders
      if (status === "complete") {
        const resultStr = result ? JSON.stringify(result) : "";
        const resultHash = resultStr
          ? `${resultStr.length}-${resultStr.slice(0, 100)}`
          : "";
        const key = `${name}-${JSON.stringify(args)}-${resultHash}`;
        if (processedKeysRef.current.has(key)) {
          return <ToolCard {...props} />;
        }
        processedKeysRef.current.add(key);
      }

      // Handle research tool - track summary and sources
      if (name === "research" && status === "complete" && result) {
        const researchResult = result as {
          summary: string;
          sources: Array<{
            url: string;
            title: string;
            content?: string;
            status: "found" | "scraped" | "failed";
          }>;
        };

        // Track sources in state
        if (researchResult.sources && researchResult.sources.length > 0) {
          queueMicrotask(() =>
            setState((prev) => ({
              ...prev,
              sources: [...prev.sources, ...researchResult.sources],
            })),
          );
        }

        console.log(
          `[UI] Research completed: ${researchResult.sources?.length || 0} sources found`,
        );
      }

      // Handle write_todos tool
      if (name === "write_todos" && status === "complete" && args?.todos) {
        const todosWithIds = (
          args.todos as Array<{ id?: string; content: string; status: string }>
        ).map((todo, index) => ({
          ...todo,
          id: todo.id || `todo-${Date.now()}-${index}`,
        }));
        queueMicrotask(() =>
          setState((prev) => ({ ...prev, todos: todosWithIds as Todo[] })),
        );
      }

      // Handle write_file tool
      // Deep Agents uses file_path (not path) as the parameter name
      if (name === "write_file" && status === "complete" && args?.file_path) {
        queueMicrotask(() =>
          setState((prev) => ({
            ...prev,
            files: [
              ...prev.files,
              {
                path: args.file_path as string,
                content: args.content as string,
                createdAt: new Date().toISOString(),
              },
            ],
          })),
        );
      }

      return <ToolCard {...props} />;
    },
  });

  return (
    <div className="relative min-h-screen">
      {/* Animated background */}
      <div className="abstract-bg">
        <div className="blob-3" />
      </div>

      {/* Main content */}
      <main className="relative z-10 h-screen flex overflow-hidden">
        {/* Chat panel - left side (38%) */}
        <div className="w-[38%] h-full border-r border-[var(--color-border-glass)] bg-[var(--color-glass-dark)] backdrop-blur-xl overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Header */}
            <header
              style={{ padding: "var(--space-6) var(--space-8)" }}
              className="border-b border-[var(--color-border-glass)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                  AI Forward Deployed Engineering
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                  AG-UI • LangGraph • CopilotKit
                </span>
              </div>
              <h1
                style={{
                  fontSize: "var(--text-2xl)",
                  fontWeight: "var(--font-extrabold)",
                  fontFamily: "var(--font-display)",
                }}
                className="text-gradient"
              >
                Deep Research Assistant
              </h1>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-secondary)",
                  marginTop: "var(--space-1)",
                }}
              >
                Autonomous planning, multi-source web scouring & verified synthesis
              </p>

              {/* Research Starter Chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  "Kenya Climate Change Act 2023 Regulations",
                  "Agentic Reverse Engineering & Binary Ground Truth",
                  "Post-Quantum Cryptography in Banking",
                ].map((prompt, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] cursor-default transition-all"
                    title={`Suggested inquiry: ${prompt}`}
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </header>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                padding: "var(--space-6)",
              }}
            >
              <CopilotChat
                className="h-full"
                labels={{
                  title: "Deep Research Assistant",
                  initial: "What topic would you like me to research? Ask a question or explore one of the suggested topics above.",
                  placeholder: "Enter research inquiry (e.g. Clean Energy Grid penetration in Africa)...",
                }}
              />
            </div>
          </div>
        </div>

        {/* Workspace panel - right side (62%) */}
        <div className="w-[62%] h-full overflow-hidden">
          <Workspace state={state} />
        </div>
      </main>
    </div>
  );
}

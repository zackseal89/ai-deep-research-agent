"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotReadable, useDefaultTool } from "@copilotkit/react-core";
import { Workspace } from "@/components/Workspace";
import { ToolCard } from "@/components/ToolCard";
import type { AgentInfo, Deal } from "@/types/research";

const API = process.env.NEXT_PUBLIC_DILIGENCE_API_URL || "http://127.0.0.1:8123";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `Request failed (${response.status}).`);
  return payload as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Page() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [ticker, setTicker] = useState("");
  const [peerTickers, setPeerTickers] = useState("");
  const [thesis, setThesis] = useState("");
  const [asOf, setAsOf] = useState(today());
  const [targetEv, setTargetEv] = useState("");
  const [evDate, setEvDate] = useState(today());
  const [evSource, setEvSource] = useState("");
  const [scenarioText, setScenarioText] = useState<Record<string, { growth: string; multiple: string }>>({
    downside: { growth: "", multiple: "" },
    base: { growth: "", multiple: "" },
    upside: { growth: "", multiple: "" },
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedIdRef = useRef("");
  const snapshotRequestId = useRef(0);

  useDefaultTool({ render: (props) => <ToolCard {...props} /> });

  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (selectedId) window.localStorage.setItem("meridian-selected-deal", selectedId);
  }, [selectedId]);

  useCopilotReadable({
    description: "The selected saved public-company diligence deal. All referenced evidence is subject to human review.",
    value: deal ? {
      deal_id: deal.id,
      target: { ticker: deal.ticker, legal_name: deal.company_name, cik: deal.cik, industry: deal.sic_description },
      as_of: deal.as_of,
      thesis: deal.thesis,
      peers: deal.peers,
      stage_status: deal.stages,
      metric_summary: deal.metrics?.map((company) => ({ ticker: company.company?.ticker, periods: company.periods, cagr: company.cagr })),
      evidence_index: deal.sources?.map(({ id, title, url, source_date, verification, ticker }) => ({ id, ticker, title, url, source_date, verification })).slice(0, 40),
    } : { selected_deal: "No deal is selected. Ask which public ticker to research." },
    available: info?.live_assistant ? "enabled" : "disabled",
  }, [deal, info?.live_assistant]);

  const refreshDeals = useCallback(async () => {
    const result = await request<Deal[]>("/api/deals");
    setDeals(result);
    return result;
  }, []);

  const refreshSelected = useCallback(async (id: string) => {
    if (!id) return;
    const requestId = ++snapshotRequestId.current;
    const result = await request<Deal>(`/api/deals/${id}`);
    if (selectedIdRef.current !== id || snapshotRequestId.current !== requestId) return;
    setDeal(result);
    setDeals((previous) => previous.map((item) => item.id === id ? { ...item, ...result } : item));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([request<AgentInfo>("/api/info"), request<Deal[]>("/api/deals")])
      .then(([agentInfo, saved]) => {
        if (!active) return;
        setInfo(agentInfo);
        setDeals(saved);
        if (saved.length) {
          const rememberedId = window.localStorage.getItem("meridian-selected-deal");
          setSelectedId(saved.some((item) => item.id === rememberedId) ? rememberedId! : saved[0].id);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not connect to the local diligence service.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId) void refreshSelected(selectedId).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load saved deal."));
  }, [selectedId, refreshSelected]);

  useEffect(() => {
    if (!selectedId || !deal || deal.id !== selectedId || !["running", "compiling"].includes(deal.status)) return;
    const timer = window.setInterval(() => {
      void refreshSelected(selectedId).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not refresh the diligence run."));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [deal, selectedId, refreshSelected]);

  const parsedPeers = useMemo(() => peerTickers.split(/[\s,]+/).map((item) => item.trim().toUpperCase()).filter(Boolean), [peerTickers]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsCreating(true);
    try {
      if (parsedPeers.length > 3) throw new Error("Choose up to three public peers.");
      if (new Set(parsedPeers).size !== parsedPeers.length) throw new Error("Remove duplicate peer tickers.");
      if (parsedPeers.includes(ticker.trim().toUpperCase())) throw new Error("The target ticker cannot also be a peer.");
      for (const [name, scenario] of Object.entries(scenarioText)) {
        if (Boolean(scenario.growth) !== Boolean(scenario.multiple)) throw new Error(`${name}: provide both scenario assumptions or leave both blank.`);
        if (scenario.growth && (Number(scenario.growth) < -90 || Number(scenario.growth) > 200)) throw new Error(`${name}: growth must be between -90% and 200%.`);
        if (scenario.multiple && (Number(scenario.multiple) <= 0 || Number(scenario.multiple) > 100)) throw new Error(`${name}: exit EV/revenue must be between 0 and 100x.`);
      }
      const enterpriseValues: Record<string, { value_millions: string; as_of: string; source_note: string }> = {};
      if (targetEv) {
        if (!evSource.trim()) throw new Error("Add a source note for the user-entered enterprise value.");
        enterpriseValues[ticker.trim().toUpperCase()] = { value_millions: targetEv, as_of: evDate, source_note: evSource.trim() };
      }
      const scenarios = Object.fromEntries(Object.entries(scenarioText)
        .filter(([, value]) => value.growth !== "" && value.multiple !== "")
        .map(([name, value]) => [name, { annual_growth_percent: value.growth, exit_ev_revenue: value.multiple }]));
      const created = await request<Deal>("/api/deals", {
        method: "POST",
        body: JSON.stringify({ ticker, thesis, peers: parsedPeers, as_of: asOf, valuation: { enterprise_values: enterpriseValues, scenarios } }),
      });
      setSelectedId(created.id);
      setDeal(created);
      setNotice(`${created.company_name} resolved. Starting the dated public-company review.`);
      const started = await request<Deal>(`/api/deals/${created.id}/analysis`, { method: "POST" });
      setDeal(started);
      await refreshDeals();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the deal.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRestart(id: string) {
    setError("");
    setNotice("Research restarted. The saved snapshot will update as stages finish.");
    try {
      const result = await request<Deal>(`/api/deals/${id}/analysis`, { method: "POST" });
      setSelectedId(id);
      setDeal(result);
      await refreshDeals();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restart research.");
    }
  }

  async function handleValuationSave(value: Deal["valuation"]) {
    if (!deal) return;
    const result = await request<{ deal: Deal }>(`/api/deals/${deal.id}/valuation`, {
      method: "PATCH", body: JSON.stringify(value),
    });
    setDeal(result.deal);
    setDeals((previous) => previous.map((item) => item.id === deal.id ? { ...item, ...result.deal } : item));
    setNotice("Valuation assumptions and affected draft artifacts were saved.");
  }

  function selectDeal(id: string) {
    setError("");
    setNotice("");
    setSelectedId(id);
  }

  return (
    <main className="diligence-shell">
      <aside className="deal-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">M</div>
          <div><p className="brand-kicker">INVESTMENT RESEARCH</p><h1>Meridian</h1></div>
          <span className="version-label">V1 DEMO</span>
        </div>

        <form className="deal-form" onSubmit={handleCreate}>
          <div className="section-eyebrow">NEW COMPANY REVIEW</div>
          <label className="field-label" htmlFor="ticker">US ticker <span>required</span></label>
          <input id="ticker" className="field-input ticker-input" value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} placeholder="e.g. AAPL" maxLength={10} required />

          <label className="field-label" htmlFor="peers">Public peers <span>up to 3</span></label>
          <input id="peers" className="field-input" value={peerTickers} onChange={(event) => setPeerTickers(event.target.value)} placeholder="MSFT, DELL" />

          <label className="field-label" htmlFor="as-of">Research as of</label>
          <input id="as-of" className="field-input" type="date" max={today()} value={asOf} onChange={(event) => setAsOf(event.target.value)} required />

          <label className="field-label" htmlFor="thesis">Initial deal thesis <span>optional</span></label>
          <textarea id="thesis" className="field-input field-textarea" value={thesis} onChange={(event) => setThesis(event.target.value)} placeholder="Why is this opportunity interesting?" rows={3} maxLength={2500} />

          <details className="assumption-details">
            <summary>Optional valuation inputs</summary>
            <div className="assumption-body">
              <label className="field-label" htmlFor="target-ev">Target EV · USD millions</label>
              <input id="target-ev" className="field-input" type="number" min="0.001" step="any" value={targetEv} onChange={(event) => setTargetEv(event.target.value)} placeholder="User supplied" />
              <label className="field-label" htmlFor="ev-date">EV as of</label>
              <input id="ev-date" className="field-input" type="date" max={today()} value={evDate} onChange={(event) => setEvDate(event.target.value)} />
              <label className="field-label" htmlFor="ev-source">Source note</label>
              <input id="ev-source" className="field-input" value={evSource} onChange={(event) => setEvSource(event.target.value)} placeholder="e.g. User supplied from deal brief" />
              <p className="field-hint">Assumptions remain visibly separate from reported facts.</p>
              <div className="scenario-heading">Three-year scenarios</div>
              {Object.entries(scenarioText).map(([name, value]) => (
                <div className="scenario-row" key={name}>
                  <strong>{name}</strong>
                  <input aria-label={`${name} annual revenue growth percent`} className="field-input" type="number" min="-90" max="200" step="any" placeholder="Growth %" value={value.growth} onChange={(event) => setScenarioText((old) => ({ ...old, [name]: { ...old[name], growth: event.target.value } }))} />
                  <input aria-label={`${name} exit EV to revenue multiple`} className="field-input" type="number" min="0.01" max="100" step="any" placeholder="Exit EV / rev" value={value.multiple} onChange={(event) => setScenarioText((old) => ({ ...old, [name]: { ...old[name], multiple: event.target.value } }))} />
                </div>
              ))}
              <p className="field-hint">Complete both inputs in a row to include that scenario.</p>
            </div>
          </details>

          <button className="primary-button" type="submit" disabled={isCreating || !info?.sec_configured}>
            {isCreating ? "Resolving company…" : "Start diligence review"}
            <span aria-hidden="true">↗</span>
          </button>
          {!info?.sec_configured && <p className="field-hint warning-copy">Configure SEC_USER_AGENT in the project .env to create a live SEC-backed deal.</p>}
        </form>

        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {notice && <div className="notice notice-success" role="status">{notice}</div>}
        {info?.sec_configured && !info.public_research_configured && <p className="field-hint">SEC research is enabled. Commercial and news discovery remain incomplete until TAVILY_API_KEY is configured.</p>}

        <section className="saved-deals" aria-labelledby="saved-heading">
          <div className="saved-heading"><span className="section-eyebrow" id="saved-heading">SAVED DEALS</span><span className="saved-count">{deals.length}</span></div>
          {deals.map((item) => (
            <button className={`saved-deal ${selectedId === item.id ? "is-selected" : ""}`} key={item.id} onClick={() => selectDeal(item.id)}>
              <span className="saved-ticker">{item.ticker}</span>
              <span className="saved-company">{item.company_name}</span>
              <span className="saved-meta">{item.fixture ? "GUIDED FIXTURE" : item.as_of} · {item.status.toUpperCase()}</span>
            </button>
          ))}
          {!deals.length && <p className="empty-copy">Saved deal reviews will appear here.</p>}
        </section>

        <div className="sidebar-footer">
          <span className={`connection-indicator ${info?.live_assistant ? "is-live" : ""}`} />
          {info?.live_assistant ? `Assistant · ${info.provider}` : "Evidence tools · local"}
        </div>
      </aside>

      <section className="main-stage">
        {deal ? (
          <>
            <header className="deal-header">
              <div className="deal-header-top">
                <div className="deal-identity">
                  <div className="ticker-badge">{deal.ticker}</div>
                  <div><div className="section-eyebrow">PUBLIC COMPANY REVIEW · {deal.exchange || "US SEC FILER"}</div><h2>{deal.company_name}</h2></div>
                </div>
                <div className="header-actions">
                  <span className="draft-badge"><span /> DRAFT · NEEDS REVIEW</span>
                  {deal.status === "error" && <button className="secondary-button" onClick={() => void handleRestart(deal.id)}>Restart research</button>}
                </div>
              </div>
              <div className="deal-meta-line">
                <span>CIK {deal.cik || "unavailable"}</span><span>{deal.sic_description || "Industry pending first SEC filing lookup"}</span>
                <span>AS OF {deal.as_of}</span><span>USD · REPORTED FINANCIALS IN MILLIONS</span>
              </div>
              {deal.fixture && <div className="fixture-banner"><strong>Guided fixture.</strong> No facts are preloaded. Run the SEC refresh to create a live evidence-backed review.</div>}
              {deal.status === "error" && deal.error && <div className="notice notice-error" role="alert">{deal.error}</div>}
            </header>

            <div className="stage-strip" aria-label="Diligence stages">
              {deal.stages.map((stage, index) => <div className={`stage-chip stage-${stage.status}`} key={stage.stage}>
                <span className="stage-index">{stage.status === "completed" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <span className="stage-name">{stage.stage === "Screening" ? "Screening" : stage.stage === "Financial" ? "Financials" : stage.stage === "Commercial" ? "Commercial" : stage.stage === "Risk" ? "Risk review" : "IC memo"}</span>
                <span className="stage-state">{stage.status.replace("_", " ")}</span>
              </div>)}
            </div>

            {deal.status === "draft" && <div className="run-banner"><div><strong>Company resolved and saved.</strong><span>Run dated SEC filings and financials to build your three diligence drafts.</span></div><button className="primary-button compact-button" onClick={() => void handleRestart(deal.id)}>Run public research <span aria-hidden="true">↗</span></button></div>}

            <div className="workspace-wrap"><Workspace deal={deal} onSaveValuation={handleValuationSave} /></div>

            <details className="assistant-details">
              <summary>Ask the research assistant about this deal</summary>
              {info?.live_assistant ? <div className="assistant-chat"><CopilotChat className="h-[420px]" labels={{ title: "Diligence research assistant", initial: `The active deal is ${deal.company_name} (${deal.ticker}), as of ${deal.as_of}. Use the selected deal's available evidence; label gaps and draft status.`, placeholder: `Ask about ${deal.ticker} evidence, financials or risks…` }} /></div> : <p className="field-hint">The chat assistant needs a configured live model. SEC research and deterministic valuation remain available without it.</p>}
            </details>
          </>
        ) : (
          <div className="welcome-stage">
            <div className="welcome-rule" />
            <span className="section-eyebrow">A CLEARER VIEW OF THE DEAL</span>
            <h2>Evidence first.<br /><em>Decisions with context.</em></h2>
            <p>Resolve a US public company and review its SEC history, comparable financials, source coverage and open diligence questions in one saved workspace.</p>
            <div className="welcome-pill-row"><span>01 · SCREEN</span><span>02 · UNDERWRITE</span><span>03 · REVIEW</span></div>
            <p className="welcome-hint">Choose a guided fixture or enter a ticker to begin.</p>
          </div>
        )}
      </section>
    </main>
  );
}

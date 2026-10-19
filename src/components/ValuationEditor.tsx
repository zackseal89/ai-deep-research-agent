"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "@/components/icons";
import type { Deal, EnterpriseValueInput, ScenarioInput } from "@/types/research";

interface ValuationEditorProps {
  deal: Deal;
  onSave: (value: Deal["valuation"]) => Promise<void>;
}

type EditableEV = { value_millions: string; as_of: string; source_note: string };
type EditableScenario = { annual_growth_percent: string; exit_ev_revenue: string };

const SCENARIO_NAMES = ["downside", "base", "upside"] as const;

export function ValuationEditor({ deal, onSave }: ValuationEditorProps) {
  const companies = useMemo(() => [deal.ticker, ...deal.peers], [deal.ticker, deal.peers]);
  const [enterpriseValues, setEnterpriseValues] = useState<Record<string, EditableEV>>({});
  const [scenarios, setScenarios] = useState<Record<string, EditableScenario>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = deal.valuation?.enterprise_values ?? {};
    const next: Record<string, EditableEV> = {};
    for (const ticker of companies) {
      const item = current[ticker] as EnterpriseValueInput | undefined;
      next[ticker] = item ? { value_millions: item.value_millions, as_of: item.as_of, source_note: item.source_note } : { value_millions: "", as_of: deal.as_of, source_note: "" };
    }
    setEnterpriseValues(next);
    const values: Record<string, EditableScenario> = {};
    for (const name of SCENARIO_NAMES) {
      const item = deal.valuation?.scenarios?.[name] as ScenarioInput | undefined;
      values[name] = item ? { annual_growth_percent: item.annual_growth_percent, exit_ev_revenue: item.exit_ev_revenue } : { annual_growth_percent: "", exit_ev_revenue: "" };
    }
    setScenarios(values);
  }, [deal.id, deal.as_of, companies, deal.valuation]);

  async function save() {
    setIsSaving(true);
    setError("");
    try {
      const values: Record<string, EnterpriseValueInput> = {};
      for (const [ticker, entry] of Object.entries(enterpriseValues)) {
        if (!entry.value_millions) continue;
        const amount = Number(entry.value_millions);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${ticker}: enterprise value must be a positive USD million value.`);
        if (!entry.as_of) throw new Error(`${ticker}: provide the enterprise value date.`);
        if (entry.source_note.trim().length < 3) throw new Error(`${ticker}: add a source note for this assumption.`);
        values[ticker] = { ...entry, source_note: entry.source_note.trim() };
      }
      const inputScenarios: Record<string, ScenarioInput> = {};
      for (const name of SCENARIO_NAMES) {
        const entry = scenarios[name];
        const hasGrowth = Boolean(entry?.annual_growth_percent);
        const hasMultiple = Boolean(entry?.exit_ev_revenue);
        if (!hasGrowth && !hasMultiple) continue;
        if (!hasGrowth || !hasMultiple) throw new Error(`${name}: provide both growth and exit multiple, or leave both blank.`);
        const growth = Number(entry.annual_growth_percent);
        const multiple = Number(entry.exit_ev_revenue);
        if (!Number.isFinite(growth) || growth < -90 || growth > 200) throw new Error(`${name}: growth must be between -90% and 200%.`);
        if (!Number.isFinite(multiple) || multiple <= 0 || multiple > 100) throw new Error(`${name}: exit EV/revenue must be between 0 and 100x.`);
        inputScenarios[name] = entry;
      }
      await onSave({ enterprise_values: values, scenarios: inputScenarios });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save valuation inputs.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="valuation-editor">
      <div className="editor-intro"><strong>Assumptions stay separate from reported facts.</strong><span>Values and projections below are labeled as user supplied and illustrative.</span></div>
      <h4>Dated enterprise value · USD millions</h4>
      <div className="valuation-input-list">{companies.map((ticker) => <div className="valuation-input-card" key={ticker}>
        <strong>{ticker}{ticker === deal.ticker ? " · target" : " · peer"}</strong>
        <label>Enterprise value (USD mm)<input type="number" min="0.001" step="any" value={enterpriseValues[ticker]?.value_millions ?? ""} onChange={(event) => setEnterpriseValues((old) => ({ ...old, [ticker]: { ...old[ticker], value_millions: event.target.value } }))} placeholder="Not supplied" /></label>
        <label>Valuation date<input type="date" value={enterpriseValues[ticker]?.as_of ?? deal.as_of} onChange={(event) => setEnterpriseValues((old) => ({ ...old, [ticker]: { ...old[ticker], as_of: event.target.value } }))} /></label>
        <label>Source note<input value={enterpriseValues[ticker]?.source_note ?? ""} onChange={(event) => setEnterpriseValues((old) => ({ ...old, [ticker]: { ...old[ticker], source_note: event.target.value } }))} placeholder="User supplied; cite the source" /></label>
      </div>)}</div>

      <h4>Three-year revenue scenarios</h4>
      <div className="scenario-editor-list">{SCENARIO_NAMES.map((name) => <div className="scenario-editor-row" key={name}>
        <strong>{name}</strong>
        <label>Annual growth %<input type="number" min="-90" max="200" step="any" value={scenarios[name]?.annual_growth_percent ?? ""} onChange={(event) => setScenarios((old) => ({ ...old, [name]: { ...old[name], annual_growth_percent: event.target.value } }))} placeholder="Assumption" /></label>
        <label>Exit EV / revenue<input type="number" min="0.01" max="100" step="any" value={scenarios[name]?.exit_ev_revenue ?? ""} onChange={(event) => setScenarios((old) => ({ ...old, [name]: { ...old[name], exit_ev_revenue: event.target.value } }))} placeholder="Multiple" /></label>
      </div>)}</div>
      <p className="field-hint">Calculations use reported annual revenue and Decimal arithmetic. EV/EBITDA, P/E, automatic share prices and LBO returns are not inferred.</p>
      {error && <p role="alert" className="copy-error">{error}</p>}
      <button className="primary-button editor-save" onClick={() => void save()} disabled={isSaving || ["running", "compiling"].includes(deal.status)}><Save size={15} />{isSaving ? "Saving…" : "Save assumptions & update drafts"}</button>
    </div>
  );
}

export type StageName = "Screening" | "Financial" | "Commercial" | "Risk" | "Memo";
export type StageStatus = "pending" | "in_progress" | "completed" | "partial" | "failed";

export interface DealStage {
  stage: StageName;
  status: StageStatus;
  detail: string;
  evidence_count: number;
  updated_at: string;
}

export interface Source {
  id: string;
  ticker?: string;
  kind: "regulatory" | "commercial" | "news";
  title: string;
  url: string;
  source_date?: string | null;
  retrieved_at: string;
  excerpt: string;
  verification: string;
}

export interface ResearchFile {
  path: string;
  content: string;
  revision: number;
  updated_at: string;
}

export interface EnterpriseValueInput {
  value_millions: string;
  as_of: string;
  source_note: string;
}

export interface ScenarioInput {
  annual_growth_percent: string;
  exit_ev_revenue: string;
}

export interface Deal {
  id: string;
  ticker: string;
  company_name: string;
  cik: string | null;
  exchange: string | null;
  sic_description: string | null;
  thesis: string;
  peers: string[];
  valuation: {
    enterprise_values: Record<string, EnterpriseValueInput>;
    scenarios: Record<string, ScenarioInput>;
  };
  coverage: Record<string, boolean>;
  as_of: string;
  status: "fixture" | "draft" | "running" | "compiling" | "partial" | "completed" | "error";
  fixture: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
  stages: DealStage[];
  sources?: Source[];
  metrics?: Array<Record<string, any>>;
  artifacts?: ResearchFile[];
}

export interface AgentInfo {
  provider: string;
  live_assistant: boolean;
  sec_configured: boolean;
  public_research_configured: boolean;
  storage: string;
  tool_names: string[];
}

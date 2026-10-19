# Meridian | Investment Diligence V1

Meridian is a local guided demo for evidence-backed diligence on US public companies. Enter a ticker and optional peers, review SEC filing metadata and annual USD financials, add dated valuation assumptions, and export three draft IC artifacts. Every draft is marked **Draft—Needs Review**. The app does not approve investments or claim to complete diligence.

The UI keeps five workflow stages, saved deal snapshots, cited evidence, and artifact revisions in a local SQLite database. Live financial facts come from SEC EDGAR submissions and company-facts endpoints. Tavily is optional for public commercial and news discovery; without it, those coverage areas remain explicitly incomplete. A configured live model enables the assistant chat. The saved fixtures work without a model but contain no researched findings.

## Run locally

Requirements: Node.js 22+, Python 3.12+, and `uv`.

1. Copy `.env.example` to `.env`. Set `SEC_USER_AGENT` to your application name and a monitored contact email. This identifies SEC requests; no SEC API key is needed. Add `TAVILY_API_KEY` if you want commercial/news source discovery. To enable chat, select a provider and add its real API key.
2. Install frontend dependencies with `npm ci`.
3. In one terminal, run the backend:

   ```powershell
   cd agent
   uv sync --locked
   uv run python main.py
   ```

4. In a second terminal from the repository root, run `npm run dev` and open `http://127.0.0.1:3000`.

The local SQLite database is stored under `%LOCALAPPDATA%/MnaDiligenceDemo/diligence.sqlite3` on Windows, or `~/.local/share/MnaDiligenceDemo/diligence.sqlite3` elsewhere. Set `DILIGENCE_DATA_DIR` to choose another local directory. The service binds to loopback by default.

## Run with Docker Compose

After configuring `.env`, run `docker compose up --build`. The frontend and backend are published only on `127.0.0.1` ports 3000 and 8123. SQLite persists in the `diligence-data` volume.

## Workflow and outputs

Create a review with a US ticker, a research as-of date, optional thesis, and up to three US public peers. The service resolves the legal name from the SEC ticker list before saving. Run the five stages: screening, financials, commercial evidence, risk leads, and memo compilation. If retrieval is incomplete, the app saves a qualified partial draft and lists the gaps. Interrupted or failed work remains in the saved-deal list and can be restarted.

The workspace provides the due-diligence checklist, deal-room artifacts, evidence and citations, and valuation inputs. It compiles:

- `/reports/01_executive_investment_memo.md`
- `/reports/02_financial_valuation_model.md`
- `/reports/03_risk_matrix_and_red_flags.md`

Historical annual revenue, gross profit, operating income, and net income are extracted only when compatible SEC company-facts observations exist. Growth, gross margin, and revenue CAGR are calculated from cited facts. EBITDA and ARR remain unavailable unless directly supported. Enterprise values and three-year revenue scenarios are explicit user assumptions; calculations use Decimal arithmetic and retain inputs and formulas. No automatic share prices, transaction comps, or LBO returns are produced.

Commercial and news search results are dated leads, not verified findings. If source passage retrieval is missing, the UI labels the result as discovery-only. Risk likelihood and impact remain **Unassessed** until a reviewer documents support. Review the source filings and original public sources before using any output.

## Configuration

| Variable | Purpose |
|---|---|
| `SEC_USER_AGENT` | Required for SEC requests; include an app name and monitored email address. |
| `TAVILY_API_KEY` | Optional public commercial/news discovery. Missing key means incomplete coverage. |
| `LLM_PROVIDER` | Optional `openai`, `gemini`, `anthropic`, or `ollama`; unset/no key selects clearly labeled fixture mode. |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` | Provider credentials for live assistant chat. |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Optional local OpenAI-compatible Ollama endpoint. |
| `DILIGENCE_DATA_DIR` | Optional local SQLite storage directory. |
| `ALLOWED_ORIGINS` | Optional comma-separated local frontend origins for the backend CORS policy. |

## Checks

From the repository root:

```powershell
npm run typecheck
npm run build
```

From `agent/`:

```powershell
uv run --locked python -m unittest discover -s tests -v
```

A live SEC-backed run also requires a valid `SEC_USER_AGENT` and outbound internet access.

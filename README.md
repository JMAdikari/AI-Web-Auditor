# Website Audit Tool

An AI-powered tool that extracts factual metrics from any webpage and generates structured SEO, content, and UX analysis using Google Gemini. Built for the EIGHT25MEDIA AI-Native Software Engineer assessment.

## Quick Start

```bash
git clone https://github.com/JMAdikari/AI-Web-Auditor.git
cd AI-Web-Auditor
npm install
cp .env.example .env          # add your Gemini API key
node server/index.js
```

Open `http://localhost:3000` in your browser.

**Get a free Gemini API key:** https://aistudio.google.com/app/apikey

---

## Architecture Overview

The system has three distinct layers with zero cross-contamination:

```
URL input
  → HTTP fetch with browser headers         (server/scraper/fetcher.js)
  → HTML parsing — metric extraction        (server/scraper/metricExtractor.js)
  → HTML parsing — content extraction       (server/scraper/contentExtractor.js)
  → Structured metrics JSON
  → Prompt construction                     (server/ai/promptBuilder.js)
  → Gemini API call + response parsing      (server/ai/analyzer.js)
  → Prompt exchange logged to disk          (server/logger/promptLogger.js)
  → JSON response to frontend
  → Visual rendering                        (client/app.js)
```

### Layer 1 — Scraping (`server/scraper/`)

Pure data extraction. No AI, no interpretation. Every value is a raw number or string directly from the HTML:

| File | Responsibility |
|---|---|
| `fetcher.js` | HTTP GET with full browser headers to bypass bot detection, 15s timeout, redirect following |
| `metricExtractor.js` | Extracts all 7 required metrics: word count, H1/H2/H3 counts + texts, CTA detection, internal/external links, image alt coverage, meta tags |
| `contentExtractor.js` | Strips non-content HTML (scripts, nav, footer), extracts up to 3,000 chars of body text for AI context |

### Layer 2 — AI Analysis (`server/ai/`)

Receives the structured metrics and content summary as input. Has no knowledge of the raw HTML.

| File | Responsibility |
|---|---|
| `prompts/systemPrompt.txt` | Defines the AI's role, grounding rules, and enforces JSON output schema |
| `promptBuilder.js` | Assembles the labeled plain-text user prompt from metric values |
| `analyzer.js` | Calls Gemini, strips markdown code fences from output, parses JSON |

### Layer 3 — API + Frontend (`server/routes/`, `client/`)

| File | Responsibility |
|---|---|
| `routes/audit.js` | `POST /api/audit` — orchestrates the pipeline, returns `factualMetrics` and `aiAnalysis` as sibling keys |
| `routes/audit.js` | `POST /api/compare` — audits two pages in parallel, runs comparison AI call |
| `client/` | Renders metrics with "Extracted Data" badge, AI insights with "AI Generated" badge |

---

## Factual Metrics Extracted

Every metric is a concrete number — no interpretation:

| Metric | How Extracted |
|---|---|
| Total word count | Body text after removing scripts, styles, noscript |
| H1 / H2 / H3 counts | Cheerio element counts + text content |
| CTA count | Buttons, `a.btn`, `[class*="btn"]`, `input[type="submit"]`, `[role="button"]` |
| Internal / external links | `a[href]` elements parsed against page hostname |
| Image count | `img` element count |
| Images missing alt text | `img` elements with missing or empty `alt` attribute |
| Meta title + length | `<title>` tag text |
| Meta description + length | `meta[name="description"]` content attribute |

---

## AI Design Decisions

### Structured JSON output over free text

The system prompt enforces a strict JSON schema with five scored categories (`seoAnalysis`, `messagingAnalysis`, `ctaAnalysis`, `contentDepthAnalysis`, `uxConcerns`) and a `recommendations` array. This enables programmatic rendering — scores drive color indicators, findings can be sorted by impact, recommendations can be prioritized — rather than dumping a text block at the user.

### Grounding constraint in the system prompt

Every finding must include a `metric` field naming the exact extracted value it references. The system prompt explicitly states: *"Every insight MUST reference specific numbers from the metrics. Do not make vague claims."* This prevents the model from generating advice that could apply to any website.

### Plain text user prompt over nested JSON input

The user prompt formats metrics as a labeled list rather than passing the raw JSON object. Tests showed the model produces more specific metric references when the input mirrors how a human analyst would read a report (labeled rows) rather than parsing a machine-readable blob.

### Separate system prompt file

The system prompt lives in `server/ai/prompts/systemPrompt.txt`, not inline in code. This makes it version-controllable and independently iterable without touching application logic.

### Content capped at 3,000 characters

Page content is summarized to ~3,000 characters before being sent to the AI. Full page text would waste tokens and dilute the analysis. The model gets enough context for messaging analysis without processing the entire document.

### Single API call per audit

One structured call returns the entire analysis. Multi-call chaining (e.g., separate calls per category) would cost more, introduce latency variance, and risk inconsistency across sections.

---

## Trade-offs

| Decision | Benefit | Cost |
|---|---|---|
| Cheerio over Puppeteer | Fast, lightweight, no headless browser overhead | Cannot scrape JavaScript-rendered SPAs |
| Single Gemini call | Low latency, lower cost, consistent output | Limited to one model context window |
| JSON output enforcement | Structured rendering, programmatic sorting | Occasional parse failures when model wraps JSON in markdown fences (handled by stripping code fences) |
| Content cap at 3,000 chars | Token efficiency, focused analysis | May miss important content on long pages |
| Full browser headers | Bypasses most CDN-level bot detection | Some sites (Cloudflare-protected, paywalled) still block at application level |

---

## What I Would Improve With More Time

1. **Puppeteer fallback** — Detect when Cheerio retrieves minimal content (JS-rendered SPA) and automatically re-fetch using headless Chrome.

2. **Multi-page crawl option** — Audit the homepage + 2–3 key landing pages for a site-wide assessment rather than single-page only.

3. **Historical tracking** — Store audit results in a database and show trends across multiple audits of the same URL over time.

4. **Lighthouse integration** — Pull Core Web Vitals (LCP, CLS, FID) alongside content metrics for a complete performance picture.

5. **Retry logic on AI parse failure** — Currently throws if the model returns malformed JSON. A retry with a stricter prompt would make the tool more resilient.

6. **Export to PDF** — Generate a client-ready audit report from the rendered results.

---

## Prompt Logs

All AI exchanges are logged automatically to `logs/` during runtime. Curated examples from real audits are in `prompt-logs/`:

| File | Site Audited |
|---|---|
| `audit_geeksforgeeks.json` | geeksforgeeks.org — large technical content site |
| `audit_nsbm.json` | nsbm.ac.lk — university marketing page |
| `audit_bbcgoodfood.json` | bbcgoodfood.com — content/recipe site |

Each log contains:
- `prompts.system` — the full system prompt sent to the model
- `prompts.user` — the constructed user prompt with all extracted metrics
- `rawModelOutput` — the unprocessed model response before JSON parsing
- `performance.latencyMs` — API response time
- `model` — model identifier used

---

## Project Structure

```
├── server/
│   ├── index.js                    # Express entry point
│   ├── scraper/
│   │   ├── fetcher.js              # HTTP fetch with browser headers
│   │   ├── metricExtractor.js      # All factual metric extraction
│   │   └── contentExtractor.js     # Page content for AI context
│   ├── ai/
│   │   ├── prompts/
│   │   │   └── systemPrompt.txt    # System prompt (version-controlled)
│   │   ├── promptBuilder.js        # Constructs user prompt from metrics
│   │   └── analyzer.js             # Gemini API call + JSON parsing
│   ├── logger/
│   │   └── promptLogger.js         # Logs all prompt exchanges to disk
│   └── routes/
│       └── audit.js                # /api/audit and /api/compare endpoints
├── client/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── prompt-logs/                    # Curated real audit examples
├── .env.example
└── package.json
```

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend | Node.js + Express | Fast to set up, strong scraping ecosystem |
| Scraping | Cheerio | Lightweight HTML parsing, no browser overhead |
| AI | Google Gemini 2.5 Flash | Strong structured output, free tier available |
| Frontend | Vanilla HTML/CSS/JS | No framework overhead for a single-page tool |

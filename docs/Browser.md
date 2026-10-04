# Browser flight workspace

Copyright © 2025-2026 by Alan M. Marcum, Nescorna Professional.
All rights reserved.

Revision: 1

The browser application in `web/` imports JPI downloads, displays interactive
TypeScript/ECharts plots, checks recorded alarm events, and downloads Excel or
CSV. Python parsing and workbook generation run in a Pyodide WebAssembly worker.
There is no upload API, database, account requirement, or server-side processing
of flight data. The web server distributes the application and runtime assets.

## Run from a checkout

Use Python 3.10+ (3.13 recommended) and Node 22.13+ (24 recommended). The macOS
system `python3` may be older; substitute an appropriate interpreter below.

```sh
python3.13 -m venv .venv
.venv/bin/python -m pip install -e . et-xmlfile==2.0.0
cd web
npm ci
cd ..
.venv/bin/python pgms/prepare_browser.py
cd web
npm run dev
```

Open `http://localhost:3000`. The preparation script has `--help`. Vite and
Playwright commands accept `--help` through `npm run <command> -- --help`.
Re-run preparation after changing Python code. Runtime binaries and the Python
bundle are generated, ignored by Git, and copied into the production build.
The upstream decoder is verified against the pinned Git commit before bundling.

For a production build, run `npm run build`, then `npm run preview`. The build
retains the Sites-compatible Cloudflare Worker structure. No production site is
provisioned or deployed by these commands. Runtime assets must be served at the
site root over HTTP(S); opening an HTML file via `file://` is unsupported.

## User workflow

1. Choose or drag one or more `.JPI` files into the page. Validation failures
   appear separately; valid members of the batch remain available.
2. Choose a flight to view its charts and sample table. Times are recorded local
   timestamps with no inferred timezone. Hover for values, use the zoom slider,
   and toggle series through chart legends. A sensor selector exposes every
   decoded channel, including channels outside the temperature overview charts.
3. Click **Check anomalies** to evaluate the active flight. Click a finding to
   focus charts and the sample table on its interval.
4. Check flights in the sidebar and choose combined Excel, separate Excel, or
   CSV. **Download** uses a browser download. Multiple separate files arrive in
   one ZIP. Excel chart inclusion is optional.

Flights shorter than five minutes are viewable and initially unchecked for
export. Explicitly checking one includes it without a second duration filter.
This differs from the CLI's explicit-selection cutoff; the browser selection
is authoritative. Duplicate imports and duplicate flight numbers retain distinct
session identities. Browser-controlled download naming may add a suffix rather
than overwrite an existing local file.

Excel data, formatting, and native Excel charts use the existing exporter.
Analyses that have been run are included as a Findings sheet in Excel. Unchecked
analyses are not invented; CSV retains the existing sensor table schema. The
original JPI file is never modified. Clearing or refreshing discards session data;
there is no durable flight history or offline installation/service worker.

## Initial checks and limits

`analysis.py` reports contiguous readings at or beyond the file's configured
high/low alarm thresholds, plus entirely missing declared channels. The default
minimum span is 10 seconds; users may change it. Span is the last observed
qualifying timestamp minus the first, including variable recording intervals.
Missing values break events. An isolated sample has zero span. Threshold equality
matches Excel conditional formatting. These rules have stable version identifiers.

These observations do not establish mechanical causes or engine health. There
is no flight-phase classification, manufacturer profile, cross-flight baseline,
spike detector, stuck-sensor detector, or fault-signature classifier yet. Startup,
shutdown, and intentional operating changes may trigger alarms. Recorded alarm
settings are not automatically equivalent to manufacturer operating limits.

Current parser support remains legacy single-engine EDM-700/800 with fuel code
0. Individual input files are limited to 32 MiB in this browser interface; memory
consumption also depends on expanded sample count. The runtime loads about
12 MiB of uncompressed assets on first use. Device performance and available
memory determine practical session size. Use **Cancel and clear** to stop processing and discard the session.

## Validation

```sh
.venv/bin/python pgms/run_tests.py --verbose
.venv/bin/python pgms/prepare_browser.py
cd web
npm run typecheck
npm run lint
npm audit --omit=dev --audit-level=high
npm run build
npx playwright install chromium webkit
JPI_TEST_SERVER='npm run preview' npm test
```

The Python suite checks original-fixture parity, corrupt inputs, duplicate
identity, data exports, archive contents, and event boundary cases. Playwright
uses the actual WebAssembly worker in Chromium and WebKit, reads real fixtures,
checks charts and findings, downloads XLSX/CSV/ZIP, and reopens artifacts using
native Python. Workbook rows are compared to the native decoder/exporter.
Tests also check narrow layouts and that the workflow sends no external requests.
GitHub Actions runs Python 3.10/3.13 and both browsers against the production build.

The application does not require a decoder rewrite. Future analysis rules belong
in Python alongside `analysis.py`; the browser bridge returns structured findings
for TypeScript visualization. Keep binary format changes governed by the existing
format regression requirements.

## Dependency audit scope

Production dependencies pass `npm audit --omit=dev`. The full development audit
currently reports the unpatched `braces` stack-exhaustion advisory
GHSA-vfj7-8cjw-p6xm through the build/lint globbing tools. Those tools operate on
repository paths; imported JPI contents are never passed to them. The audit is
not described as fully clean. Recheck upstream fixes when upgrading the toolchain.

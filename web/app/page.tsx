"use client";
// Revision: 1. Import, explore, check, and download in a device-local workspace.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import FlightChart from "../components/FlightChart";
import { Engine, saveDownload, timeLabel } from "../lib/engine";
import type { Analysis, Download, ExportResult, Flight } from "../lib/engine";

const subscribe = () => () => {};
export default function Home() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const engine = useRef<Engine | null>(null);
  const operation = useRef(0);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [minimumSeconds, setMinimumSeconds] = useState(10);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState("xlsx");
  const [graphs, setGraphs] = useState(true);
  const [sensor, setSensor] = useState("MAP");
  const [samplePage, setSamplePage] = useState(0);
  const flights = downloads.flatMap((download) => download.flights);
  const flight = flights.find((item) => item.key === activeKey);
  const owner = downloads.find((download) =>
    download.flights.some((item) => item.key === activeKey),
  );
  const analysis = analyses[activeKey];
  const engineCodes = useMemo(
    () =>
      flight?.channels
        .filter((channel) => /^E\d+$|^T\d+$|^FF$/.test(channel.code))
        .map((channel) => channel.code) ?? [],
    [flight],
  );
  const cylinderCodes = useMemo(
    () =>
      flight?.channels
        .filter((channel) => /^C\d+$|^OILT$|^RPM$/.test(channel.code))
        .map((channel) => channel.code) ?? [],
    [flight],
  );
  const otherCodes = useMemo(() => [sensor], [sensor]);
  useEffect(() => () => engine.current?.destroy(), []);
  function runtime() {
    return (engine.current ??= new Engine());
  }
  function chooseFlight(item: Flight) {
    setActiveKey(item.key);
    setFocus(null);
    setSamplePage(0);
    setSensor(
      item.channels.find((channel) => channel.code === "MAP")?.code ??
        item.channels[0]?.code ??
        "",
    );
  }
  async function importFiles(files: File[]) {
    if (!ready || busy || !files.length) return;
    const current = operation.current;
    setErrors([]);
    setNotice("");
    const added: Download[] = [];
    const failures: string[] = [];
    setBusy("Preparing the local engine… First use may take a moment.");
    try {
      for (const file of files) {
        if (file.size > 32 * 1024 * 1024) {
          failures.push(`${file.name}: File exceeds the 32 MiB browser limit.`);
          continue;
        }
        setBusy(`Validating and decoding ${file.name}…`);
        try {
          const bytes = await file.arrayBuffer();
          if (current !== operation.current) return;
          added.push(
            await runtime().request<Download>(
              "import",
              { name: file.name },
              bytes,
            ),
          );
        } catch (error) {
          failures.push(`${file.name}: ${String(error)}`);
        }
        if (current !== operation.current) return;
      }
      setDownloads((previous) => [...previous, ...added]);
      setSelected(
        (previous) =>
          new Set([
            ...previous,
            ...added.flatMap((download) =>
              download.flights
                .filter((item) => item.duration >= 300)
                .map((item) => item.key),
            ),
          ]),
      );
      if (added[0]?.flights[0]) chooseFlight(added[0].flights[0]);
      setErrors(failures);
      setNotice(
        `${added.length} file${added.length === 1 ? "" : "s"} imported. Files that failed validation were not added.`,
      );
    } finally {
      if (current === operation.current) setBusy("");
    }
  }
  async function analyze() {
    if (!flight || busy) return;
    const current = operation.current;
    setBusy(`Checking flight ${flight.id}…`);
    setErrors([]);
    try {
      const result = await runtime().request<Analysis>("analyze", {
        key: flight.key,
        minimumSeconds,
      });
      if (current !== operation.current) return;
      setAnalyses((previous) => ({ ...previous, [flight.key]: result }));
      setFocus(null);
    } catch (error) {
      if (current === operation.current) setErrors([String(error)]);
    } finally {
      if (current === operation.current) setBusy("");
    }
  }
  async function exportFiles() {
    const current = operation.current;
    setBusy("Creating your download…");
    setErrors([]);
    try {
      const result = await runtime().request<ExportResult>("export", {
        keys: flights
          .filter((item) => selected.has(item.key))
          .map((item) => item.key),
        mode,
        graphs,
      });
      if (current !== operation.current) return;
      saveDownload(result);
      setNotice(
        `Download started: ${result.name}.${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}`,
      );
    } catch (error) {
      if (current === operation.current) setErrors([String(error)]);
    } finally {
      if (current === operation.current) setBusy("");
    }
  }
  function clear() {
    operation.current++;
    setBusy("");
    engine.current?.destroy();
    engine.current = null;
    setDownloads([]);
    setActiveKey("");
    setSelected(new Set());
    setAnalyses({});
    setErrors([]);
    setNotice("Workspace cleared.");
    setFocus(null);
  }
  return (
    <main>
      <header>
        <span className="brand">
          JPI2Excel <small>FLIGHT WORKSPACE</small>
        </span>
        <div className="toolbar">
          <span className="pill">On-device processing</span>
          {(downloads.length > 0 || busy) && (
            <button className="secondary" onClick={clear}>
              {busy ? "Cancel and clear" : "Clear workspace"}
            </button>
          )}
        </div>
      </header>
      <section className="intro">
        <p className="eyebrow">ENGINE MONITOR DATA</p>
        <h1>Your flight. Every detail.</h1>
        <p>
          Explore your engine readings, review recorded limits, and take your
          data to Excel.
        </p>
      </section>
      <section
        className={`panel import ${downloads.length ? "compact" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void importFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div>
          <h2>
            {downloads.length
              ? "Add another download"
              : "Open a flight download"}
          </h2>
          <p>Drop .JPI files here · Legacy single-engine EDM-700 / 800</p>
        </div>
        <label className={`button ${busy ? "disabled" : ""}`}>
          Choose JPI files
          <input
            aria-label="Choose JPI files"
            type="file"
            accept=".jpi,.JPI"
            multiple
            disabled={!ready || !!busy}
            onChange={(event) => {
              void importFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
        <p className="muted">
          Files stay on your device. Refreshing or clearing this page removes
          the imported session.
        </p>
      </section>
      <div
        role="status"
        aria-live="polite"
        className={busy || notice ? "status" : ""}
      >
        {busy || notice}
      </div>
      {errors.length > 0 && (
        <section role="alert" className="error panel">
          <h2>Could not complete this action</h2>
          {errors.map((error, i) => (
            <pre key={i}>{error}</pre>
          ))}
        </section>
      )}
      {flights.length > 0 && (
        <div className="workspace">
          <aside className="panel flight-list">
            <div className="section-title">
              <h2>
                Flights <span className="count">{flights.length}</span>
              </h2>
            </div>
            <p className="muted">
              Check flights to export. Short flights are available but unchecked
              initially.
            </p>
            <div className="toolbar">
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  setSelected(new Set(flights.map((item) => item.key)))
                }
              >
                Select all
              </button>
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() => setSelected(new Set())}
              >
                None
              </button>
            </div>
            {downloads.map((download) => (
              <div key={download.key} className="source-group">
                <p className="source-name">{download.name}</p>
                {download.flights.map((item) => (
                  <div
                    className={`flight-row ${activeKey === item.key ? "active" : ""}`}
                    key={item.key}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Export ${download.name} flight ${item.id} import ${download.key}`}
                      checked={selected.has(item.key)}
                      disabled={!!busy}
                      onChange={(event) =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          if (event.target.checked) next.add(item.key);
                          else next.delete(item.key);
                          return next;
                        })
                      }
                    />
                    <button
                      className="flight-button"
                      aria-pressed={activeKey === item.key}
                      onClick={() => chooseFlight(item)}
                    >
                      <strong>Flight {item.id}</strong>
                      <span>{item.start}</span>
                      <span>
                        {timeLabel(item.duration)} ·{" "}
                        {item.samples.toLocaleString()} samples
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <div className="export-box">
              <h3>
                Export {selected.size} flight{selected.size === 1 ? "" : "s"}
              </h3>
              <label>
                File format
                <select
                  aria-label="Export format"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                  disabled={!!busy}
                >
                  <option value="xlsx">Excel · combined workbook</option>
                  <option value="separate">Excel · workbook per flight</option>
                  <option value="csv">CSV · file per flight</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={graphs}
                  disabled={mode === "csv" || !!busy}
                  onChange={(event) => setGraphs(event.target.checked)}
                />
                Include Excel charts
              </label>
              <button
                className="wide"
                disabled={!!busy || !selected.size}
                onClick={() => void exportFiles()}
              >
                Download {mode === "csv" ? "CSV" : "Excel"}
              </button>
              <p className="muted">
                Multiple separate files arrive as a ZIP. Checked-flight findings
                are included in Excel.
              </p>
            </div>
          </aside>
          <div className="flight-content">
            {flight && owner && (
              <>
                <section className="panel flight-summary">
                  <div>
                    <p className="eyebrow">{flight.source}</p>
                    <h2>Flight {flight.id}</h2>
                    <p>
                      {flight.start}{" "}
                      <span className="muted">
                        · recorded local time; timezone not supplied
                      </span>
                    </p>
                  </div>
                  <div className="stats">
                    <div>
                      <strong>{timeLabel(flight.duration)}</strong>
                      <span>Duration</span>
                    </div>
                    <div>
                      <strong>{flight.samples.toLocaleString()}</strong>
                      <span>Samples</span>
                    </div>
                    <div>
                      <strong>{flight.channels.length}</strong>
                      <span>Channels</span>
                    </div>
                  </div>
                </section>
                {!!engineCodes.length && (
                  <FlightChart
                    flight={flight}
                    title="Exhaust temperature & fuel flow"
                    codes={engineCodes}
                    alarms={owner.alarms}
                    focus={focus}
                  />
                )}
                {!!cylinderCodes.length && (
                  <FlightChart
                    flight={flight}
                    title="Cylinder temperature & RPM"
                    codes={cylinderCodes}
                    alarms={owner.alarms}
                    focus={focus}
                  />
                )}
                <div className="sensor-picker">
                  <label>
                    Explore a sensor{" "}
                    <select
                      aria-label="Sensor"
                      value={sensor}
                      onChange={(event) => setSensor(event.target.value)}
                    >
                      {flight.channels.map((channel) => (
                        <option key={channel.code} value={channel.code}>
                          {channel.label}
                          {channel.unit ? ` (${channel.unit})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="muted">
                    Dashed red lines show recorded alarm limits.
                  </span>
                </div>
                {sensor && (
                  <FlightChart
                    flight={flight}
                    title="Sensor detail"
                    codes={otherCodes}
                    alarms={owner.alarms}
                    focus={focus}
                  />
                )}
                <section className="panel findings">
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">REVIEW ASSISTANT</p>
                      <h2>Anomaly checks</h2>
                    </div>
                    <button
                      disabled={
                        !!busy ||
                        !Number.isFinite(minimumSeconds) ||
                        minimumSeconds < 0
                      }
                      onClick={() => void analyze()}
                    >
                      Check anomalies
                    </button>
                  </div>
                  <p>
                    Find sustained readings at or beyond recorded alarms and
                    channels with no data. Normal startup or shutdown can
                    trigger these checks.
                  </p>
                  <label className="inline-field">
                    Minimum observed event span{" "}
                    <input
                      aria-label="Minimum event seconds"
                      type="number"
                      min="0"
                      step="1"
                      value={Number.isNaN(minimumSeconds) ? "" : minimumSeconds}
                      onChange={(event) =>
                        setMinimumSeconds(event.target.valueAsNumber)
                      }
                    />{" "}
                    seconds
                  </label>
                  <p className="muted">
                    These checks do not identify mechanical causes or establish
                    engine health.
                  </p>
                  {analysis ? (
                    <>
                      <p className="result-count">
                        {analysis.findings.length} finding
                        {analysis.findings.length === 1 ? "" : "s"} · minimum
                        span {analysis.minimumSeconds}s
                      </p>
                      <p className="muted">{analysis.scope}</p>
                      {analysis.findings.length === 0 ? (
                        <p>No findings from these checks.</p>
                      ) : (
                        <div className="findings-list">
                          {analysis.findings.map((finding, index) => (
                            <button
                              className="finding"
                              key={index}
                              onClick={() => {
                                setSensor(finding.sensor);
                                setFocus([finding.start, finding.end]);
                                setSamplePage(
                                  Math.floor(
                                    Math.max(
                                      0,
                                      flight.elapsed.findIndex(
                                        (value) => value >= finding.start,
                                      ),
                                    ) / 50,
                                  ),
                                );
                              }}
                            >
                              <span>
                                <strong>{finding.label}</strong>
                                <span className="badge">{finding.kind}</span>
                              </span>
                              <span>{finding.message}</span>
                              <span className="muted">
                                {timeLabel(finding.start)}–
                                {timeLabel(finding.end)}
                                {finding.peak !== null
                                  ? ` · extreme ${finding.peak} ${finding.unit} · limit ${finding.threshold} ${finding.unit}`
                                  : ""}{" "}
                                · Click to focus charts
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="muted">
                      This flight has not been checked yet.
                    </p>
                  )}
                </section>
                <details className="panel">
                  <summary>
                    Sample data · {flight.samples.toLocaleString()} rows
                  </summary>
                  <div className="toolbar sample-nav">
                    <button
                      className="secondary"
                      disabled={samplePage === 0}
                      onClick={() => setSamplePage((value) => value - 1)}
                    >
                      Previous samples
                    </button>
                    <span>
                      Rows {samplePage * 50 + 1}–
                      {Math.min((samplePage + 1) * 50, flight.samples)}
                    </span>
                    <button
                      className="secondary"
                      disabled={(samplePage + 1) * 50 >= flight.samples}
                      onClick={() => setSamplePage((value) => value + 1)}
                    >
                      Next samples
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Sample</th>
                          <th>Elapsed (s)</th>
                          {flight.channels.map((channel) => (
                            <th key={channel.code}>
                              {channel.label}
                              <small>{channel.unit}</small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {flight.elapsed
                          .slice(samplePage * 50, (samplePage + 1) * 50)
                          .map((elapsed, i) => (
                            <tr key={elapsed}>
                              <td>{samplePage * 50 + i + 1}</td>
                              <td>{elapsed}</td>
                              {flight.channels.map((channel) => (
                                <td key={channel.code}>
                                  {flight.series[channel.code][
                                    samplePage * 50 + i
                                  ] ?? "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <details className="panel">
                  <summary>Source metadata & validation warnings</summary>
                  {owner.warnings.map((warning, index) => (
                    <p className="warning" key={index}>
                      {warning}
                    </p>
                  ))}
                  <dl className="metadata">
                    {Object.entries(owner.metadata).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </>
            )}
          </div>
        </div>
      )}
      <footer>
        JPI2Excel · Source data is preserved.{" "}
        <a href="/runtime/THIRD-PARTY.txt">Third-party attribution</a>
      </footer>
    </main>
  );
}

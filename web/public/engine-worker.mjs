// Revision: 1. Python runs off the UI thread; inputs never leave this worker.
let runtime;
async function initialize() {
  const { loadPyodide } = await import("./runtime/pyodide.mjs");
  const py = await loadPyodide({
    indexURL: new URL("./runtime/", self.location.href).href,
  });
  const response = await fetch(
    new URL("./runtime/jpi-python.zip", self.location.href),
  );
  if (!response.ok)
    throw new Error(
      "Python bundle unavailable. Run the browser preparation step.",
    );
  py.unpackArchive(await response.arrayBuffer(), "zip", {
    extractDir: "/home/pyodide",
  });
  py.runPython(
    "from jpi2excel.browser import BrowserSession, payload_json\nsession = BrowserSession()",
  );
  return py;
}
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  // Serialize work so two imports cannot overwrite Python globals.
  queue = queue.then(async () => {
    const { id, action, payload } = data;
    let py;
    try {
      runtime ??= initialize().catch((error) => {
        runtime = undefined;
        throw error;
      });
      py = await runtime;
      py.globals.set("request_json", JSON.stringify(payload ?? {}));
      py.runPython("import json\nrequest = json.loads(request_json)");
      if (action === "import") {
        py.globals.set("input_bytes", new Uint8Array(data.bytes));
        const result = py.runPython(
          'payload_json(session.import_file(request["name"], bytes(input_bytes)))',
        );
        self.postMessage({ id, result: JSON.parse(result) });
      } else if (action === "analyze") {
        const result = py.runPython(
          'payload_json(session.analyze(request["key"], request["minimumSeconds"]))',
        );
        self.postMessage({ id, result: JSON.parse(result) });
      } else if (action === "export") {
        py.runPython(
          'export_name, export_bytes, export_warnings = session.export(request["keys"], request["mode"], request["graphs"])',
        );
        const proxy = py.globals.get("export_bytes");
        const bytes = new Uint8Array(proxy.toJs());
        proxy.destroy();
        const name = py.globals.get("export_name");
        const warnings = JSON.parse(
          py.runPython("payload_json(export_warnings)"),
        );
        self.postMessage({ id, result: { name, bytes, warnings } }, [
          bytes.buffer,
        ]);
      } else if (action === "clear") {
        py.runPython("session.clear()");
        self.postMessage({ id, result: null });
      } else if (action === "ready") {
        self.postMessage({ id, result: true });
      } else throw new Error("Unknown browser action");
    } catch (error) {
      const message = String(error.message ?? error)
        .trim()
        .split("\n")
        .at(-1);
      self.postMessage({ id, error: message });
    } finally {
      if (py)
        py.runPython(
          'for _name in ("input_bytes", "export_bytes"):\n    if _name in globals():\n        del globals()[_name]',
        );
    }
  });
};

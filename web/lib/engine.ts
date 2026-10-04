// Revision: 1. Typed worker protocol and session ownership.
export interface Channel {
  code: string;
  label: string;
  unit: string;
}
export interface Flight {
  key: string;
  id: number;
  source: string;
  start: string;
  duration: number;
  samples: number;
  elapsed: number[];
  series: Record<string, (number | null)[]>;
  channels: Channel[];
}
export interface Download {
  key: string;
  name: string;
  metadata: Record<string, unknown>;
  warnings: string[];
  alarms: Record<string, [number | null, number | null]>;
  flights: Flight[];
}
export interface Finding {
  sensor: string;
  label: string;
  unit: string;
  rule: string;
  kind: string;
  start: number;
  end: number;
  duration: number;
  peak: number | null;
  threshold: number | null;
  message: string;
}
export interface Analysis {
  minimumSeconds: number;
  findings: Finding[];
  scope: string;
}
export interface ExportResult {
  name: string;
  bytes: Uint8Array;
  warnings: string[];
}
export class Engine {
  private worker = new Worker("/engine-worker.mjs", { type: "module" });
  private sequence = 0;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  constructor() {
    this.worker.onmessage = ({ data }) => {
      const task = this.pending.get(data.id);
      if (!task) return;
      this.pending.delete(data.id);
      if (data.error) task.reject(new Error(data.error));
      else task.resolve(data.result);
    };
    this.worker.onerror = () =>
      this.fail(
        new Error(
          "The processing worker stopped. Clear the workspace and try again.",
        ),
      );
    this.worker.onmessageerror = () =>
      this.fail(
        new Error(
          "Unable to read the processing result. Clear the workspace and try again.",
        ),
      );
  }
  private fail(error: Error) {
    for (const task of this.pending.values()) task.reject(error);
    this.pending.clear();
  }
  request<T>(
    action: string,
    payload: unknown = {},
    bytes?: ArrayBuffer,
  ): Promise<T> {
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      this.worker.postMessage(
        { id, action, payload, bytes },
        bytes ? [bytes] : [],
      );
    });
  }
  destroy() {
    this.worker.terminate();
    this.fail(new Error("Workspace cleared"));
  }
}
export function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
export function saveDownload(result: ExportResult) {
  const type = result.name.endsWith(".xlsx")
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : result.name.endsWith(".zip")
      ? "application/zip"
      : "text/csv;charset=utf-8";
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(result.bytes)], { type }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Revision: 1. Real fixture, worker, charts, and artifact acceptance.
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "../..");
const fixture = resolve(root, "testdata/U260919.JPI");
const python = process.env.JPI_TEST_PYTHON ?? resolve(root, ".venv/bin/python");

test("import, chart, inspect, analyze, and download native-equivalent workbook", async ({
  page,
}) => {
  const exceptions: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => exceptions.push(error.message));
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://localhost:3000") &&
      !request.url().startsWith("blob:")
    )
      external.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByLabel("Choose JPI files")).toBeEnabled();
  await page.getByLabel("Choose JPI files").setInputFiles(fixture);
  await expect(page.getByRole("button", { name: /Flight 418/ })).toBeVisible();
  await page.getByRole("button", { name: /Flight 418/ }).click();
  await expect(page.getByText("5,507", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Exhaust temperature/ }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(3);
  await page.getByRole("button", { name: "None", exact: true }).click();
  await page.getByRole("checkbox", { name: /Export .* flight 418/ }).check();
  await page.getByRole("button", { name: "Check anomalies" }).click();
  await expect(page.locator(".result-count")).toBeVisible();
  if (await page.locator(".finding").count())
    await page.locator(".finding").first().click();
  await page.getByText("Sample data · 5,507 rows").click();
  await expect(page.locator("tbody tr")).toHaveCount(50);
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Excel" }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("JPI2Excel.xlsx");
  execFileSync(python, [
    "-c",
    `
import sys
from openpyxl import load_workbook
from jpi2excel.reader import read_jpi
from jpi2excel.export import rows
from io import BytesIO
from pathlib import Path
book = load_workbook(BytesIO(Path(sys.argv[1]).read_bytes())); d = read_jpi(sys.argv[2])
f = next(f for f in d.flights if f.id == 418)
s = next(s for s in book if s.title.startswith('Flight'))
assert s.max_row == f.samples + 1
assert list(s.iter_rows(min_row=2, values_only=True)) == [tuple(None if v == '' else v for v in r) for r in rows(f, d)]
assert 'Findings' in book.sheetnames
assert any(s._charts for s in book)
assert len(s.conditional_formatting) > 0
book.close()
`,
    (await download.path())!,
    fixture,
  ]);
  expect(exceptions).toEqual([]);
  expect(external).toEqual([]);
});

test("reject corrupt input, preserve duplicate imports, and export short flight CSV", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Choose JPI files")).toBeEnabled();
  await page.getByLabel("Choose JPI files").setInputFiles([
    {
      name: "corrupt.JPI",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("invalid"),
    },
    {
      name: "wrong.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid"),
    },
    {
      name: "valid.JPI",
      mimeType: "application/octet-stream",
      buffer: (await import("node:fs")).readFileSync(fixture),
    },
  ]);
  await expect(page.getByRole("alert")).toContainText("Missing $U header");
  await expect(page.getByRole("alert")).toContainText("Choose a .JPI file");
  await expect(page.getByRole("button", { name: /Flight 418/ })).toHaveCount(1);
  await page.getByLabel("Choose JPI files").setInputFiles(fixture);
  await expect(page.getByRole("button", { name: /Flight 418/ })).toHaveCount(2);
  await page.getByRole("button", { name: "None", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Export .* flight 417/ })
    .first()
    .check();
  await page.getByLabel("Export format").selectOption("csv");
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const download = await promise;
  execFileSync(python, [
    "-c",
    `
import csv, sys
from jpi2excel.reader import read_jpi
from jpi2excel.export import rows
f = read_jpi(sys.argv[2]); flight = next(x for x in f.flights if x.id == 417)
with open(sys.argv[1]) as source: actual = list(csv.reader(source))
expected = [[str(v) if v is not None else '' for v in row] for row in rows(flight, f)]
assert actual[1:] == expected
`,
    (await download.path())!,
    fixture,
  ]);
  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByRole("button", { name: /Flight 418/ })).toHaveCount(0);
});

test("narrow layout and separate-workbook ZIP export", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Choose JPI files")).toBeEnabled();
  await page.getByLabel("Choose JPI files").setInputFiles(fixture);
  await expect(page.getByRole("button", { name: /Flight 418/ })).toBeVisible();
  await page.getByLabel("Export format").selectOption("separate");
  await page.getByLabel("Include Excel charts").uncheck();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Excel" }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("JPI2Excel.zip");
  execFileSync(python, [
    "-c",
    `
import io, sys, zipfile
from openpyxl import load_workbook
with zipfile.ZipFile(sys.argv[1]) as z:
 assert len(z.namelist()) == 3
 for name in z.namelist():
  b = load_workbook(io.BytesIO(z.read(name)))
  assert b['Summary'].sheet_state == 'hidden'
  assert not any(s._charts for s in b)
  b.close()
`,
    (await download.path())!,
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("cancel initialization and reimport without retaining stale flights", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Choose JPI files")).toBeEnabled();
  await page.getByLabel("Choose JPI files").setInputFiles(fixture);
  await page.getByRole("button", { name: "Cancel and clear" }).click();
  await expect(page.getByRole("status")).toContainText("Workspace cleared");
  await expect(page.getByRole("button", { name: /Flight 418/ })).toHaveCount(0);
  await page.getByLabel("Choose JPI files").setInputFiles(fixture);
  await expect(page.getByRole("button", { name: /Flight 418/ })).toHaveCount(1);
});

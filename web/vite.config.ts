// Revision: 1. Build a self-contained browser runtime with the Sites layout.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig({
  plugins: [
    {
      name: "require-browser-runtime",
      apply: "build",
      buildStart() {
        for (const name of [
          "pyodide.mjs",
          "pyodide.asm.js",
          "pyodide.asm.wasm",
          "python_stdlib.zip",
          "jpi-python.zip",
        ]) {
          if (!existsSync(resolve("public/runtime", name))) {
            throw new Error(
              "Browser runtime missing. Run .venv/bin/python pgms/prepare_browser.py from the repository root.",
            );
          }
        }
      },
    },
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: localBindingConfig,
    }),
  ],
});

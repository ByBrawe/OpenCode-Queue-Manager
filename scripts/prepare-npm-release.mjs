import { readFile, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { releaseVersionForCommit } from "../src/release/version.mjs";

async function main() {
  const manifestPath = resolve("package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.name !== "@bybrawe/opencode-queue-manager") {
    throw new Error("Unexpected package name. Refusing to publish.");
  }
  if (process.env.GITHUB_REPOSITORY !== "ByBrawe/OpenCode-Queue-Manager") {
    throw new Error("Release is only permitted in the canonical GitHub repository.");
  }
  const sha = process.env.GITHUB_SHA;
  const endpoint = "https://registry.npmjs.org/" + encodeURIComponent(manifest.name) + "/latest";
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Cannot check npm registry (" + response.status + "); not publishing.");
  }
  const latest = response.status === 404 ? null : await response.json();
  if (latest && latest.name !== manifest.name) {
    throw new Error("Unexpected package metadata returned by npm registry.");
  }
  const next = releaseVersionForCommit(manifest.version, latest, sha);
  const output = process.env.GITHUB_OUTPUT;
  if (next === null) {
    console.log("Commit already published on npm. Skipping duplicate release.");
    if (output) await appendFile(output, "publish=false\n");
    return;
  }
  manifest.version = next;
  manifest.releaseCommit = sha;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("Prepared " + manifest.name + "@" + next + " from Git commit " + sha);
  if (output) await appendFile(output, "publish=true\nversion=" + next + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

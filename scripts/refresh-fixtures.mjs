import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = join(root, "src/tests/fixtures");
const sources = JSON.parse(readFileSync(join(fixturesDir, "sources.json"), "utf8"));

// Copied from src/parsers/common.ts's HTML_HEADERS — keep in sync if that changes.
const HTML_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshFixture(filename, url) {
  const fixturePath = join(fixturesDir, filename);
  let newContent;
  try {
    const response = await fetch(url, { headers: HTML_HEADERS });
    if (!response.ok) {
      // Cloudflare-walled sources 403ing is expected, not fatal — the
      // fixture simply doesn't get refreshed this run.
      console.log(`failed     ${filename} — HTTP ${response.status}`);
      return "failed";
    }
    newContent = await response.text();
  } catch (error) {
    console.log(
      `failed     ${filename} — ${error instanceof Error ? error.message : String(error)}`,
    );
    return "failed";
  }

  const oldContent = readFileSync(fixturePath, "utf8");
  if (newContent === oldContent) {
    console.log(`unchanged  ${filename}`);
    return "unchanged";
  }

  try {
    writeFileSync(fixturePath, newContent);
    console.log(`changed    ${filename}`);
    return "changed";
  } catch (error) {
    console.error(
      `write failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "write-failed";
  }
}

async function main() {
  const entries = Object.entries(sources).filter(([key]) => key !== "_synthetic");
  const results = [];

  for (const [filename, url] of entries) {
    results.push(await refreshFixture(filename, url));
    await sleep(DELAY_MS);
  }

  const summary = results.reduce((counts, result) => {
    counts[result] = (counts[result] ?? 0) + 1;
    return counts;
  }, {});
  console.log(
    `\n${entries.length} fixture(s): ${JSON.stringify(summary)}. Run 'npm test' next — a failure means a site changed and the parser (or the assertions) need updating.`,
  );

  if (results.includes("write-failed")) process.exit(1);
}

void main();

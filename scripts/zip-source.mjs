import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, relative } from "path";
import { zipSync } from "fflate";
import { fileURLToPath } from "url";
import { dirname } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, "release");
const outputPath = join(releaseDir, "fanfic-downloader-source.zip");

const EXCLUDE_DIRS = new Set(["node_modules", "dist", "release", "data-samples"]);

function collectFiles(dir) {
    const files = {};
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDE_DIRS.has(entry.name)) continue;
            Object.assign(files, collectFiles(fullPath));
        } else {
            const relPath = relative(root, fullPath);
            files[relPath] = [readFileSync(fullPath), { level: 6 }];
        }
    }
    return files;
}

mkdirSync(releaseDir, { recursive: true });
const zipped = zipSync(collectFiles(root));
writeFileSync(outputPath, zipped);
console.log(`Created release/fanfic-downloader-source.zip (${(zipped.length / 1024).toFixed(1)} KB)`);

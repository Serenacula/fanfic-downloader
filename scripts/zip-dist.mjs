import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { zipSync } from "fflate";
import { fileURLToPath } from "url";
import { dirname } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const outputPath = join(distDir, "fanfic-downloader.xpi");

function collectFiles(dir) {
    const files = {};
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            Object.assign(files, collectFiles(fullPath));
        } else {
            const relPath = relative(distDir, fullPath);
            if (relPath !== "fanfic-downloader.xpi") {
                files[relPath] = [readFileSync(fullPath), { level: 6 }];
            }
        }
    }
    return files;
}

const zipped = zipSync(collectFiles(distDir));
writeFileSync(outputPath, zipped);
console.log(`Created fanfic-downloader.xpi (${(zipped.length / 1024).toFixed(1)} KB)`);

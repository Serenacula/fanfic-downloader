import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json")));
const manifestJson = JSON.parse(readFileSync(join(root, "manifest.json")));

if (packageJson.version !== manifestJson.version) {
    console.error(
        `Version mismatch: package.json is "${packageJson.version}" but manifest.json is "${manifestJson.version}". Update both to match before merging.`,
    );
    process.exit(1);
}

console.log(`Versions in sync: ${packageJson.version}`);

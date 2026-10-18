import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Keep the safety checks in every production-shaped build; they do not call the model.
await import("./safety-check.mjs");

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const sourcePath = path.join(appRoot, "index.html");
const outputDirectory = path.join(appRoot, "public");
const outputPath = path.join(outputDirectory, "index.html");

await mkdir(outputDirectory, { recursive: true });
await copyFile(sourcePath, outputPath);

const [source, output] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(outputPath, "utf8"),
]);
if (source !== output) {
  throw new Error("Published HTML does not match the reviewed source index.html.");
}

console.log("BUILD PASS: safety checks passed and the isolated coding-agent page was published to public/index.html.");

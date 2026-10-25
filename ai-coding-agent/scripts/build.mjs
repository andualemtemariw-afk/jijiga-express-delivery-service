import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const sourcePath = path.join(appRoot, "index.html");
const outputDirectory = path.join(appRoot, "public");
const outputPath = path.join(outputDirectory, "index.html");

// Safety and TypeScript checks run during every build, without calling an AI model.
await import("./safety-check.mjs");
execFileSync(
  process.execPath,
  [path.join(appRoot, "node_modules", "typescript", "bin", "tsc"), "--noEmit"],
  { cwd: appRoot, stdio: "inherit" }
);

await mkdir(outputDirectory, { recursive: true });
await copyFile(sourcePath, outputPath);

const [source, output] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(outputPath, "utf8"),
]);
if (source !== output) {
  throw new Error("Published HTML does not match the reviewed source index.html.");
}

console.log("BUILD PASS: safety checks, TypeScript check, and static page publishing completed.");

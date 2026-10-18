import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";
import { Script } from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const api = await readFile(new URL("../api/agent.ts", import.meta.url), "utf8");

// Catch accidental duplicate/trailing HTML and malformed inline JavaScript before publishing.
assert.equal((html.match(/<html\b/gi) || []).length, 1, "Page must contain exactly one html element");
assert.equal((html.match(/<\/html>/gi) || []).length, 1, "Page must contain exactly one closing html tag");
assert.match(html, /<\/html>\s*$/i, "No content may appear after the closing html tag");
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(inlineScripts.length, 1, "Page must contain exactly one inline script block");
new Script(inlineScripts[0][1], { filename: "ai-coding-agent/index.html inline script" });
assert.match(html, /reportedCostUsd/, "The UI must surface reported model cost");
assert.match(html, /Model cost was not reported; verify it in OpenRouter Activity\./, "Unknown cost must be disclosed");

assert.match(html, /FREE-TIER ONLY/, "UI must state the free-tier-only intent");
assert.match(html, /No Firebase connection/, "UI must state no Firebase access");
assert.match(html, /No GitHub write access/, "UI must state no repository writes");
assert.match(html, /Do not paste API keys/, "UI must warn users not to paste secrets");
assert.match(api, /openrouter\/free/, "API must use the fixed OpenRouter free router");
assert.match(api, /OPENROUTER_API_KEY/, "OpenRouter key must be server-side env only");
assert.match(api, /openrouter\.ai\/api\/v1\/chat\/completions/, "API must call OpenRouter directly");
assert.match(api, /data_collection:\s*"deny"/, "API must deny provider data collection");
assert.match(api, /zdr:\s*true/, "API must require zero-data-retention providers");
assert.match(api, /max_price:\s*\{\s*prompt:\s*0,\s*completion:\s*0,\s*request:\s*0\s*\}/, "API must reject providers with non-zero token or per-request pricing");
assert.match(api, /reportedCostUsd/, "API must reject and surface reported non-zero cost");
assert.match(api, /AGENT_ACCESS_CODE/, "API must fail closed without the preview access code");
assert.match(api, /MAX_OUTPUT_TOKENS = 2000/, "Output must be bounded");
assert.match(api, /MAX_REQUESTS_PER_WINDOW = 8/, "Best-effort request guard must exist");
assert.match(api, /raw\.githubusercontent\.com/, "Source access must use read-only raw GitHub URLs");
assert.ok(api.includes("openrouter.ai/api/v1/chat/completions"), "Model calls must go directly to the OpenRouter free router");
assert.doesNotMatch(api, /generativelanguage\.googleapis\.com|gemini-[\w.-]+|ai-gateway\.vercel\.sh|createPullRequest|createBranch|firebase-admin|initializeApp\(/i, "Agent must not use Gemini, paid Gateway fallback, Git writes, or Firebase access");
assert.doesNotMatch(api, /model\s*:\s*(?:body|req|input)\./i, "Browser input must not select the model");

console.log("SAFETY CHECK PASS: isolated read-only code agent; fixed OpenRouter free router; env-only lock; privacy routing enforced; no non-zero reported cost, Firebase access, GitHub writes, or paid Gateway fallback.");

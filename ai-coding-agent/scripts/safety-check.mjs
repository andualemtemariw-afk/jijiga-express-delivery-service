import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const api = await readFile(new URL("../api/agent.ts", import.meta.url), "utf8");

assert.match(html, /FREE-TIER ONLY/, "UI must state the free-tier-only intent");
assert.match(html, /No Firebase connection/, "UI must state no Firebase access");
assert.match(html, /No GitHub write access/, "UI must state no repository writes");
assert.match(html, /Do not paste API keys/, "UI must warn users not to paste secrets");
assert.match(api, /gemini-2\.5-flash-lite/, "API must use the fixed free-tier model");
assert.match(api, /GEMINI_API_KEY/, "API key must be server-side env only");
assert.match(api, /AGENT_ACCESS_CODE/, "API must fail closed without the preview access code");
assert.match(api, /MAX_OUTPUT_TOKENS = 2000/, "Output must be bounded");
assert.match(api, /MAX_REQUESTS_PER_WINDOW = 8/, "Best-effort request guard must exist");
assert.match(api, /raw\.githubusercontent\.com/, "Source access must use read-only raw GitHub URLs");
assert.ok(api.includes("generativelanguage.googleapis.com"), "Model calls must go directly to Google free-tier API");
assert.doesNotMatch(api, /ai-gateway\.vercel\.sh|createPullRequest|createBranch|firebase-admin|initializeApp\(/i, "Agent must not add a paid Gateway fallback, Git writes, or Firebase access");

console.log("SAFETY CHECK PASS: isolated read-only code agent; fixed Gemini free-tier model; env-only lock; no Firebase, GitHub writes, or paid Gateway fallback.");

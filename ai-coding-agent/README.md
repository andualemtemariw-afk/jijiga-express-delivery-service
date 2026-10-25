# Jijiga Express — Free-Tier Coding Agent

This is an isolated application in `ai-coding-agent/`. It does not replace the React/Vite delivery app. It has no Firebase SDK or GitHub write permission.

## What it does

- Reads a small, allowlisted set of source files from a chosen branch of `andualemtemariw-afk/jijiga-express-delivery-service`.
- Sends redacted source excerpts and the user's task to the fixed OpenRouter Free Models Router, `openrouter/free`.
- Requests providers with data collection denied and Zero Data Retention required. If no free endpoint satisfies those controls, the request fails rather than relaxing privacy requirements.
- Returns findings, a recommended fix, tests to run, and a proposed patch.
- Does **not** commit code, create branches or pull requests, merge, deploy, access live Firestore records, or change production settings.

## Strict $0 operating conditions

1. Use only the fixed model ID `openrouter/free`. The browser cannot select a model or provider, and the API never requests a paid-model fallback.
2. OpenRouter documents `openrouter/free` as a router for free-variant models with $0 prompt/completion pricing. Free-tier accounts are currently limited to 50 requests/day and 20 requests/minute; limits and available providers can change. The endpoint surfaces rate-limit failures instead of switching to a paid model.
3. Do not configure automatic top-ups or intentionally invoke paid models. The OpenRouter API key's spending limit is only a cap if a billable request is made; it is **not** free credit. The code is pinned to the free router, but confirm usage/cost in OpenRouter Activity after preview tests.
4. Do not configure Vercel AI Gateway, paid-model fallback, paid model IDs, or a paid Vercel plan for this app. Keep the existing Vercel Hobby project.
5. Configure the following environment variables in the Vercel project **Preview** target only, never Production:
   - `OPENROUTER_API_KEY`: OpenRouter key, stored as a sensitive/encrypted value.
   - `AGENT_ACCESS_CODE`: a unique high-entropy access code at least 8 characters long; keep it private and do not reuse an account password.
   - `GITHUB_READ_TOKEN`: required because the repository is private. Use a fine-grained GitHub token scoped to this repository with **Contents: read only**.
6. If `OPENROUTER_API_KEY` or `AGENT_ACCESS_CODE` is absent, the endpoint returns 503 before sending a model request. The browser never receives the API key. The endpoint also refuses to return a response if OpenRouter reports a non-zero request cost.
7. The process-local request guard is best-effort, not a durable global quota. OpenRouter's free-tier limit and the fixed free router are the external no-charge boundary; this code does not promise unlimited availability.

The source redaction is best-effort, not a guarantee. Do not paste credentials, customer information, live orders, payment details, access codes, or other secrets. Before sending proprietary source code, review OpenRouter's current privacy settings and eligible provider terms. The API request sets both `data_collection: "deny"` and `zdr: true`; if no matching free provider is available, it fails closed.

## Deploy and test as a Vercel preview

The existing Vercel project is `jijiga-express-ai-coding-agent`, linked to this repository with root directory `ai-coding-agent`. Use a feature branch and test through its protected preview. Do not merge or promote to Production as part of this task. Do not put the OpenRouter key or agent access code in Production variables.

The package scripts run a static safety check without calling an AI model:

- `npm test`
- `npm run build`

A preview can render while `OPENROUTER_API_KEY` is missing; agent calls remain locked and no model request is sent.

After adding `OPENROUTER_API_KEY` to **Preview** variables, redeploy the preview and run one non-sensitive coding task. Confirm the response reports `$0.00` when OpenRouter returns usage cost, and independently inspect OpenRouter Activity for the request's actual cost. If cost is absent from a response, treat it as unverified until Activity confirms it.

## Safe expansion sequence

Phase 1: source review and patch drafting only.

Phase 2: add customer/delivery help for Mamilas, khat batches, orders, and rider/runner coordination. That assistant must use explicit, role-authorized server-side tools; never expose customer records or allow payment/custody actions solely on model judgment. Keep the EEU physical-card errand in its separate workflow and ledger.

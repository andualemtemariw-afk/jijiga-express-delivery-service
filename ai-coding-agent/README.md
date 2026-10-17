# Jijiga Express — Free-Tier Coding Agent

This is an isolated application in `ai-coding-agent/`. It does not replace the existing React/Vite delivery app and has no Firebase SDK or GitHub write permission.

## What it does

- Reads a small, allowlisted set of source files from a chosen branch of `andualemtemariw-afk/jijiga-express-delivery-service`.
- Sends redacted source excerpts and the user's task to one fixed model, `gemini-2.5-flash-lite`, through Google's Gemini Developer API.
- Returns findings, a recommended fix, tests to run, and a proposed patch.
- Does **not** commit code, create branches or pull requests, merge, deploy, read live Firestore records, or change production settings.

## Strict $0 operating conditions

1. Use a Google AI Studio API key for a project on the **Free** tier.
2. Do not attach a billing account to that Google project or enable paid usage. When free quota is exhausted, the API should reject/throttle requests; this app returns the failure and does not use paid-model fallback.
3. The model is hard-coded to `gemini-2.5-flash-lite`. The browser cannot choose a provider/model.
4. Do not configure Vercel AI Gateway, paid model providers, AI Gateway credits, or auto top-up for this app. It calls the Gemini Developer API directly.
5. Keep Vercel on the existing Hobby plan. This static page and function use included Hobby usage, subject to current limits; no paid plan or add-on is needed for this project.
6. Configure the following environment variables in the Vercel **Preview** target only, never Production:
   - `GEMINI_API_KEY`: Google AI Studio free-tier API key; store as a sensitive/encrypted value.
   - `AGENT_ACCESS_CODE`: a unique high-entropy access code at least 8 characters long.
   - `GITHUB_READ_TOKEN` (optional): only needed if the repository is private or unauthenticated source fetching is rate-limited. Use a fine-grained token scoped to this repository with **Contents: read only**.
7. If either `GEMINI_API_KEY` or `AGENT_ACCESS_CODE` is absent, the endpoint returns 503 before sending a model request. The preview is deliberately locked until both are set.

Google documents that free-tier content may be used to improve its products. Use only source code you are comfortable sending under that policy. Do not paste credentials, customer information, orders, payment details, or live production data. Secret-like strings found in source are redacted before model submission, but redaction is not guaranteed; never commit secrets in the repository.

## Deploy as a Vercel preview

Create a separate Vercel project named `jijiga-express-ai-coding-agent` with root directory `ai-coding-agent`. Do not reuse the existing `jijiga-express` or `jijiga-express-khat-card` projects. Keep Preview protected with Vercel authentication if available. Do not assign a production domain or put the Google key/access code in Production environment variables.

The root `build` script runs a static safety check without invoking an AI model. A preview can be built and checked while its model environment variables remain absent; the page will render, but agent calls stay locked and do not incur model usage.

## Costs and changing limits

- Vercel Hobby is a free tier with usage caps. Exceeding a cap can pause/throttle a feature until the quota resets.
- Google AI Studio free-tier model availability, RPM/TPM/RPD limits, and terms can change. Check the project's **active limits** in Google AI Studio before testing.
- This repository does not guarantee an unlimited free agent. Strict $0 means no attached billing account, no paid plan, no paid fallback, and accepting throttling/failure once the free quota is reached.

## Safe expansion sequence

Phase 1: source review and patch drafting only.

Phase 2: add customer/delivery help for Mamilas, khat batches, orders, rider/runner coordination, and the separate EEU physical-card errand. That assistant must use explicit, role-authorized server-side tools; never expose customer records or allow payment/custody actions solely on model judgment.

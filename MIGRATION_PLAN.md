# Migration Plan: Together.ai to Lemonfox WhisperAPI + OpenRouter

This document outlines how to replace Together.ai across the app with:

- Lemonfox WhisperAPI for speech-to-text (audio transcription)
- OpenRouter for text LLM tasks (title generation, summaries, notes, blog/email generation, etc.)

It includes the current usage map, target architecture, adapter designs, concrete code changes, environment updates, and validation steps.

---

## Goals

- Remove all Together.ai client and SDK usage (server and client).
- Keep existing product UX and flows intact (upload → transcribe → transform).
- Introduce two provider adapters, each swappable and minimal:
  - WhisperAPIAdapter (Lemonfox) for transcription
  - OpenRouterAdapter for chat/summarization/transforms (streaming + non‑streaming)
- Preserve BYOK (bring-your-own-key) behavior, now split per provider.
- Cleanly remove Helicone integration and Together-specific branding in UI and README.

---

## Current Integration Summary (files to touch)

- Together client and usage
  - lib/apiClients.ts: Together clients for Vercel AI SDK and base SDK
  - app/api/transform/route.ts: Streams LLM transforms via Together model using `ai` SDK
  - trpc/routers/whisper.ts: Transcribes via Together Whisper model and generates title via Together LLM
  - app/api/validate-key/route.ts: Validates a Together API key by making a small LLM call

- Key plumbing and limits
  - trpc/init.ts: Reads `TogetherAPIToken` header into `ctx.togetherApiKey`
  - trpc/client.tsx: Injects `TogetherAPIToken` header using TogetherApiKeyProvider
  - components/TogetherApiKeyProvider.tsx: Stores/reads Together API key in sessionStorage
  - components/hooks/ModalCustomApiKey.tsx: UI for entering Together API key, validates via `/api/validate-key`
  - lib/limits.ts: Has special-cased Together email and BYOK checks
  - components/hooks/useLimits.ts: Minutes/transformations gating uses current BYOK signal

- UI references to Together
  - components/Header.tsx, components/Footer.tsx, components/landing-page.tsx
  - README.md mentions Together.ai as provider

---

## Target Architecture

- STT (Transcription): Lemonfox WhisperAPI
  - Server makes a single POST to Lemonfox with an S3 `audio_url` (preferred) and optional `language`.
  - Response returns transcript text; stored as today in `Whisper.fullTranscription` and per-track `AudioTrack.partialTranscription`.

- LLM (Transforms): OpenRouter (OpenAI-compatible)
  - Use Vercel AI SDK with an OpenAI-compatible client pointing to `https://openrouter.ai/api/v1`.
  - Provide both non-streaming (generate title) and streaming (transform route) functions.

- BYOK
  - Two independent keys:
    - WhisperAPI key (Lemonfox) affects transcription minutes limit
    - OpenRouter key affects transformations/day limit
  - Headers carried from client to server for server-initiated calls:
    - `WhisperAPIToken: <lemonfox_api_key>`
    - `OpenRouterAPIToken: <openrouter_api_key>`

---

## Adapters

### WhisperAPIAdapter (Lemonfox)

- Base URL: `https://api.lemonfox.ai`
- Endpoint (confirmed accessible; requires key): `POST /v1/speech-to-text`
- Auth: `Authorization: Bearer <LEMONFOX_API_KEY>`
- Request (JSON; to verify against docs):
  - `audio_url: string` (S3 URL uploaded by the app)
  - `language?: string` (e.g. `"en"`)
  - Optional quality/format fields as supported by Lemonfox (e.g., diarization, timestamps) – start minimal and expand if needed.
- Response (shape to confirm; minimal contract):
  - `text: string` — full transcript
- Functions:
  - `transcribeFromUrl(audioUrl: string, opts?: { language?: string }, apiKey?: string): Promise<string>`
  - Optional: `transcribeFile(formData)` if direct file upload becomes desirable later.
- Errors:
  - 401 → invalid key; 400 → missing/invalid `audio_url`; propagate clean messages back to caller.

### OpenRouterAdapter

- Base URL: `https://openrouter.ai/api/v1` (OpenAI-compatible)
- Auth: `Authorization: Bearer <OPENROUTER_API_KEY>`
- Recommended headers (per docs):
  - `HTTP-Referer: <your app url>`
  - `X-Title: <your app name>`
- Client: Use Vercel AI SDK’s OpenAI adapter, e.g. `createOpenAI({ apiKey, baseURL, headers })` from `@ai-sdk/openai`.
- Functions:
  - `model(name: string)` returns an AI SDK model instance for use with `generateText` / `streamText`.
  - `generateText(opts)` for short, non-streaming tasks (title generation).
  - `streamText(opts)` for streaming transforms in `/api/transform` to retain current UX.
- Models:
  - Make model IDs configurable via env, e.g. `OPENROUTER_MODEL_SUMMARIZE`, default to a strong instruct model such as `meta-llama/llama-3.3-70b-instruct`.

---

## Concrete Code Changes

### 1) Dependencies

- Remove Together packages from `package.json`:
  - `@ai-sdk/togetherai`
  - `together-ai`
- Add OpenRouter-compatible client:
  - `@ai-sdk/openai` (preferred) or `@ai-sdk/openai-compatible`
- Keep `ai` (Vercel AI SDK) as-is.

### 2) New adapter files

- Add `lib/adapters/whisperapi.ts`:
  - Exports `transcribeFromUrl(audioUrl, { language }, apiKey?)` performing `POST https://api.lemonfox.ai/v1/speech-to-text` with Bearer auth and JSON body.
  - Reads key from param first, then `process.env.LEMONFOX_API_KEY`.
  - Returns plain `string` transcript; throws on non-2xx with a friendly message.

- Add `lib/adapters/openrouter.ts`:
  - Imports `createOpenAI` from `@ai-sdk/openai` and exports a factory `openRouterClient(apiKey?)`.
  - Uses headers: `Authorization`, `HTTP-Referer` (from `OPENROUTER_SITE_URL`), `X-Title` (from `OPENROUTER_APP_NAME`).
  - Helper exports for common models (e.g., `getTransformModel()`), sourced from env or default.

### 3) Replace Together client usages

- Delete or repurpose `lib/apiClients.ts` → split into the two adapters above.

- trpc/routers/whisper.ts
  - Replace Together transcription call with `WhisperAPIAdapter.transcribeFromUrl(input.audioUrl, { language: input.language }, ctx.whisperApiKey)`.
  - Replace title generation `generateText` model with OpenRouter: `openRouterClient(ctx.openRouterApiKey).model(<MODEL_ENV>)`.
  - Preserve the minutes limit enforcement, but determine BYOK from `ctx.whisperApiKey` (not Together).

- app/api/transform/route.ts
  - Build the prompt as-is.
  - Replace `togetherVercelAiClient` with `openRouterClient(apiKey)` and stream via `streamText({ model, prompt })`.
  - Add server-side limit check if desired (optional enhancement), e.g. call `limitTransformations` with `isBringingKey: !!apiKey` before starting the stream, otherwise keep current UI-only gating.

- app/api/validate-key/route.ts
  - Replace with a provider-aware endpoint, e.g. `/api/validate-key` expects `{ provider: "openrouter" | "whisper", apiKey: string }` and validates:
    - OpenRouter: small `generateText` call with a trivial prompt
    - WhisperAPI: minimal `POST /v1/speech-to-text` dry-run using a short public test audio URL if API supports it; otherwise call `/v1/spec` and check for 401 vs 200 (fallback) and/or implement a lightweight provider-specific ping if available.
  - Alternative: add two explicit endpoints: `/api/validate-openrouter-key` and `/api/validate-whisper-key`.

### 4) Context and headers

- trpc/init.ts
  - Read both headers into context: `WhisperAPIToken` → `ctx.whisperApiKey`, `OpenRouterAPIToken` → `ctx.openRouterApiKey`.

- trpc/client.tsx
  - Replace `useTogetherApiKey` with a new `useApiKeys` and set both headers in `httpBatchLink({ headers })`:
    - `WhisperAPIToken` (if present)
    - `OpenRouterAPIToken` (if present)

- app/api/transform/route.ts
  - Read `OpenRouterAPIToken` from request headers (instead of `TogetherAPIToken`).

### 5) BYOK state and UI

- Replace `components/TogetherApiKeyProvider.tsx` with `components/ApiKeysProvider.tsx` that stores two keys in sessionStorage:
  - `openrouterApiKey`
  - `whisperApiKey`
  - Export `useApiKeys()` returning `{ openrouterKey, whisperKey, setOpenrouterKey, setWhisperKey }`.

- Update `components/hooks/ModalCustomApiKey.tsx` to show two inputs and validate each via the updated validate-key API.

- Update `components/hooks/useLimits.ts` and `components/Header.tsx` usage:
  - Transcription minutes come from server regardless, but UI may display "Unlimited" when a Whisper (Lemonfox) BYOK key is present.
  - Transformations/day show "Unlimited" when an OpenRouter BYOK key is present; otherwise fetch current limits.

### 6) Limits logic

- lib/limits.ts
  - Remove `isTogetherUser` logic and any special casing for Together emails.
  - Keep the same Redis-based limiters. The `isBringingKey` argument should be decided per use:
    - Transcription flows pass `isBringingKey: !!ctx.whisperApiKey`.
    - Transformation flows pass `isBringingKey: !!ctx.openRouterApiKey`.

### 7) Branding and content cleanup

- Remove Together links/assets and update copy:
  - components/Footer.tsx
  - components/landing-page.tsx
  - README.md (update provider references and setup steps)

### 8) Environment variables

- Add:
  - `LEMONFOX_API_KEY` (server default; optional if always BYOK)
  - `LEMONFOX_BASE_URL` (optional; default `https://api.lemonfox.ai`)
  - `OPENROUTER_API_KEY` (server default; optional if always BYOK)
  - `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`)
  - `OPENROUTER_SITE_URL` (your app/site URL for `HTTP-Referer`)
  - `OPENROUTER_APP_NAME` (for `X-Title`)
  - `OPENROUTER_MODEL_TRANSFORM` (default e.g. `meta-llama/llama-3.3-70b-instruct`)
  - `OPENROUTER_MODEL_TITLE` (for title generation; can reuse above)

- Remove:
  - `TOGETHER_API_KEY`, Helicone-related envs

### 9) README and `.example.env`

- Update README setup to:
  - Create accounts at Lemonfox and OpenRouter
  - Add corresponding API keys
  - Note the two optional BYOK inputs within the app
- Update `.example.env` with new variables; remove Together/Helicone.

---

## File-by-File Change Map

- Delete/replace Together clients
  - lib/apiClients.ts → remove; create `lib/adapters/whisperapi.ts`, `lib/adapters/openrouter.ts`

- Transcription flow
  - trpc/routers/whisper.ts: swap Together STT → WhisperAPI; title LLM → OpenRouter

- Transform (LLM) flow
  - app/api/transform/route.ts: swap Together model → OpenRouter model via AI SDK

- Validate keys
  - app/api/validate-key/route.ts: switch to provider-aware validation (OpenRouter + WhisperAPI)

- Context/headers
  - trpc/init.ts: read `WhisperAPIToken` and `OpenRouterAPIToken`
  - trpc/client.tsx: send both headers using ApiKeysProvider

- State/UI
  - components/TogetherApiKeyProvider.tsx → components/ApiKeysProvider.tsx
  - components/hooks/ModalCustomApiKey.tsx → dual-key UI + validation
  - components/hooks/useLimits.ts → BYOK awareness split per provider
  - components/Header.tsx/Footer.tsx/landing-page.tsx → copy/links cleanup

- Limits
  - lib/limits.ts → remove Together email special-casing, keep BYOK gating per provider

- Docs
  - README.md and `.example.env` updates

---

## Implementation Notes

- WhisperAPI request shape
  - Endpoint responds to unauthenticated requests with 401 (verified). Expect JSON POST; prefer `audio_url` body to avoid proxying file uploads.
  - Start with minimal payload: `{ audio_url, language }` and read `text` from response; extend options as needed per docs (timestamps/diarization).

- OpenRouter via AI SDK
  - Use `@ai-sdk/openai` to keep the current `streamText` / `generateText` flows intact.
  - Example client snippet:
    - `const openai = createOpenAI({ apiKey, baseURL: process.env.OPENROUTER_BASE_URL, headers: { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL, 'X-Title': process.env.OPENROUTER_APP_NAME } });`
    - `model: openai(process.env.OPENROUTER_MODEL_TRANSFORM || 'meta-llama/llama-3.3-70b-instruct')`

- Rate limits
  - Keep current Upstash logic. Pass `isBringingKey` based on the relevant BYOK key at call time.
  - Optionally add server enforcement for transformation limits before starting the stream.

---

## Testing & Validation

- Unit-level
  - WhisperAPI adapter: mock `fetch` and validate successful transcript parsing and error propagation
  - OpenRouter adapter: mock AI SDK client; validate `generateText` and streamed `textStream`

- Integration/manual
  - Upload → S3 → transcribe via Lemonfox; verify new Whisper created and text populated
  - Title auto-generation via OpenRouter
  - Transform streaming (summary, list, quick-note, blog, email)
  - BYOK: enter only Whisper key → unlimited minutes; enter only OpenRouter key → unlimited transformations
  - Missing keys: enforce limits as today

- Smoke
  - Validate keys modal: both providers
  - Dashboard & detail page flows unchanged

---

## Rollout

1) Land adapters + env scaffolding (behind feature flag if desired)
2) Flip server to WhisperAPI/OpenRouter while UI still mentions Together
3) Update UI text/links and BYOK modal
4) Remove Together deps/clients and Helicone headers
5) Update README and `.example.env`

Rollback: adapters are isolated; retaining Together code behind a feature flag temporarily is possible, but not required if cutover is binary.

---

## Acceptance Criteria

- No Together.ai code or dependencies remain in the repo.
- Transcription uses Lemonfox WhisperAPI; transformations and title generation use OpenRouter.
- Two adapters exist and are the only path to providers: `lib/adapters/whisperapi.ts`, `lib/adapters/openrouter.ts`.
- UI supports two separate BYOK keys and displays limits accordingly.
- README and example env updated; app runs locally with provider env keys.


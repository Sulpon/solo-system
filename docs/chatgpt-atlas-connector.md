# Atlas ↔ ChatGPT connector (first slice)

This branch adds a small, server-side API for ChatGPT Actions to read and create Atlas quests. It is intentionally limited: it does not expose deletion, completion, finances, or arbitrary snapshot writes.

## Endpoints

- `GET /api/connector/openapi` — serves the OpenAPI 3.1 contract used to configure a ChatGPT Action.
- `GET /api/connector/categories` — returns existing Atlas category IDs and names.
- `GET /api/connector/quests` — reads the configured Atlas account's quests.
- `POST /api/connector/quests` — creates one active task or habit.

All API endpoints except the OpenAPI document require `Authorization: Bearer <ATLAS_CONNECTOR_API_KEY>`.

## Required server environment

Configure these in the Vercel project settings (and locally in `.env.local` for development):

- `NEXT_PUBLIC_SUPABASE_URL` — existing Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase service-role key. Never use a `NEXT_PUBLIC_` prefix.
- `ATLAS_CONNECTOR_USER_ID` — the UUID of the one Supabase Auth user whose Atlas data may be accessed.
- `ATLAS_CONNECTOR_API_KEY` — a long, randomly generated secret used as the bearer token.
- `ATLAS_CONNECTOR_BASE_URL` — the public HTTPS origin for this deployed Atlas app, e.g. `https://atlas.example.com` (no trailing slash).

Do not commit real secret values. Do not share the service-role key in chat or put it in a client-side variable. The connector deliberately binds to one user ID from server configuration; it does not accept a user ID from request parameters.

## ChatGPT Action setup

1. Deploy this branch to a preview first and configure the environment variables there.
2. Open `https://YOUR-ATLAS-DOMAIN/api/connector/openapi`. It should return an OpenAPI document, not a 503.
3. In a ChatGPT custom GPT's Actions configuration, import that URL or paste its JSON response.
4. Select API Key authentication using Bearer authorization and enter the value of `ATLAS_CONNECTOR_API_KEY`.
5. Test `listAtlasCategories`, `listAtlasQuests`, then `createAtlasQuest` with a test quest.

ChatGPT's account/plan may not expose custom GPT creation or external write-capable MCP apps in the same way. The OpenAPI API is the Actions route; if Actions are unavailable on the current account, the server endpoints can still be deployed but cannot be invoked from this chat until an eligible ChatGPT integration is configured.

## Data and concurrency

Atlas stores its cloud state as one JSON snapshot per user in `public.user_atlas_data`. The connector updates only the `menace-quest-list` collection and preserves the other snapshot fields. Updates use the snapshot version as an optimistic concurrency check; if another device writes at the same time, the connector returns HTTP 409 instead of overwriting that newer snapshot.

## Current limitations

- One configured Atlas account only.
- Quests/categories read; quest creation write.
- Quest creation requires an existing `categoryId`; the category endpoint lets ChatGPT look up valid IDs first.
- This does not yet provide OAuth, per-user account linking, task completion, edit/delete, expense logging, calendar, or reports.
- The server-role key grants broad Supabase privileges, so the connector's fixed user ID and narrow endpoints are security-critical. Add rate limiting and rotate the bearer key if exposed before using this beyond a personal test.

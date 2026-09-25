# Migration status

## Prepared

- GitHub/Vercel-ready Next.js App Router starter created.
- News Radar with RSS fetching, deduplication and isolated source failures.
- Article extraction route using JSON-LD / article / paragraph fallbacks.
- Threads Studio with configurable format/style/source display.
- **Original article highlight excerpts** with per-excerpt copy and copy-all actions.
- AI adapters use an OpenAI-compatible HTTP API and fail safely when not configured.
- Existing governance master files copied into `data/`.

## Blockers to complete 1:1 migration

1. The latest Floot project source tree is temporarily unavailable because the Floot daily build-action limit was reached. The current preview is still live, but the connector cannot read/write the source tree until the reset.
2. The connected GitHub account currently has no accessible repositories and the connector does not expose repository-creation in this session. Create an empty GitHub repository, then the project can be pushed into it.
3. Vercel is connected but no team is exposed in this session; deployment can proceed once the GitHub repository and Vercel project/link are available.

This starter is intentionally labeled as a migration starter rather than a claimed 1:1 export of the latest Floot code.

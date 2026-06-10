# token-factory-indexer

Ponder indexer for the token-factory protocol. Reads `Decoder` and
`AttestorRegistry` events on Base Sepolia (and, when deployed, Base mainnet)
and exposes them via REST + GraphQL.

## Run locally

```bash
npm install
npm run dev          # ponder dev with hot reload, sqlite, port 42069
```

## Endpoints

REST (under `/v1`):

| Path                                      | Returns                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `GET /v1/stats/overview`                  | Totals: attested USD, TOKEN minted, decode + slash counts |
| `GET /v1/leaderboard/mints?limit=N`       | Top recipients by `tokenMinted` (sum across decodes)   |
| `GET /v1/leaderboard/slashers?limit=N`    | Top slashers by `slashedUsd18` × 30% bounty estimate   |
| `GET /v1/decoded/:recipient?limit=N`      | Per-recipient decode history (most recent first)       |

GraphQL: `POST /graphql` — Ponder auto-generates the schema from
`ponder.schema.ts`. Use this for cross-cutting queries.

## CLI integration

The CLI honors the indexer when configured:

```bash
export TF_INDEXER_URL=http://localhost:42069
tokenfactory leaderboard mints --top 10        # served from the indexer
tokenfactory leaderboard slashers --top 10     # served from the indexer
```

Without the env var the CLI falls back to scanning RPC directly.

## Deploy

Spike-stage: not deployed. When promoted, target Fly.io with a persistent
SQLite volume (`/data/db.sqlite`) — Ponder supports both SQLite and Postgres.
For Base mainnet, swap the chain config + start blocks in `ponder.config.ts`.

/** Indexer schema — six tables matching the events we read. Each row is
 *  canonically keyed by (txHash:logIndex) so re-orgs are idempotent.
 *
 *  Aggregate views (per-address totals, leaderboards) are derived at query
 *  time via SQL/GraphQL — we don't pre-compute them here. */

import { onchainTable, index } from "ponder";

export const attestation = onchainTable(
  "attestation",
  (t) => ({
    id: t.text().primaryKey(), // attestation UID
    uid: t.hex().notNull(),
    attester: t.hex().notNull(),
    recipient: t.hex().notNull(),
    usdcCents: t.bigint().notNull(),
    provider: t.hex().notNull(),
    receiptId: t.hex().notNull(),
    ts: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({
    recipientIdx: index().on(t.recipient),
    timestampIdx: index().on(t.timestamp),
  }),
);

export const verification = onchainTable(
  "verification",
  (t) => ({
    id: t.text().primaryKey(), // recipient (one row per recipient; latest wins)
    recipient: t.hex().notNull(),
    uid: t.hex().notNull(),
    attester: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
);

export const decoded = onchainTable(
  "decoded",
  (t) => ({
    id: t.text().primaryKey(), // `${txHash}:${logIndex}`
    attestationUid: t.hex().notNull(),
    recipient: t.hex().notNull(),
    usdcCentsAttested: t.bigint().notNull(),
    tokenMinted: t.bigint().notNull(),
    feeCentsRouted: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({
    recipientIdx: index().on(t.recipient),
    timestampIdx: index().on(t.timestamp),
  }),
);

export const deposited = onchainTable(
  "deposited",
  (t) => ({
    id: t.text().primaryKey(),
    attestor: t.hex().notNull(),
    asset: t.hex().notNull(),
    amount: t.bigint().notNull(),
    sharesMinted: t.bigint().notNull(),
    navAddedUsd18: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({ attestorIdx: index().on(t.attestor) }),
);

export const withdrawn = onchainTable(
  "withdrawn",
  (t) => ({
    id: t.text().primaryKey(),
    attestor: t.hex().notNull(),
    sharesBurned: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({ attestorIdx: index().on(t.attestor) }),
);

export const slashed = onchainTable(
  "slashed",
  (t) => ({
    id: t.text().primaryKey(),
    attestor: t.hex().notNull(),
    sharesBurned: t.bigint().notNull(),
    usdValueRoutedTeam: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
);

export const slashedByProof = onchainTable(
  "slashed_by_proof",
  (t) => ({
    id: t.text().primaryKey(),
    attestor: t.hex().notNull(),
    slasher: t.hex().notNull(),
    sharesBurned: t.bigint().notNull(),
    slashedUsd18: t.bigint().notNull(),
    reason: t.hex().notNull(), // keccak256("REPLAY") or "MISMATCH"
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({
    slasherIdx: index().on(t.slasher),
    attestorIdx: index().on(t.attestor),
    reasonIdx: index().on(t.reason),
  }),
);

export const rosterChange = onchainTable(
  "roster_change",
  (t) => ({
    id: t.text().primaryKey(),
    attestor: t.hex().notNull(),
    promoted: t.boolean().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
);

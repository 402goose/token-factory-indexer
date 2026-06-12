/** GraphQL + REST endpoints — Ponder exposes /graphql automatically from the
 *  schema. We add small REST helpers on top for the CLI's leaderboard reads
 *  so it doesn't need to learn GraphQL.
 *
 *  All routes return JSON. Errors are 4xx/5xx with `{ error }`. */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { graphql } from "ponder";
import { eq, desc, sum, count, sql, and, gte } from "ponder";

const app = new Hono();

// Browser consumers (the app's /agent monitor) fetch these endpoints directly.
app.use("/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

// Ponder's auto-generated GraphQL — handles all schema tables uniformly.
app.use("/graphql", graphql({ db, schema }));

// --- REST: /agent monitor feed (AGENT_PAGE.md F-APP-06-C) ---

/** Recent on-chain decode activity + today's totals for one wallet.
 *  The web /agent monitor reads this; "today" is the UTC day (matches the
 *  agent loop's daily-limit reset). */
app.get("/v1/agent/activity", async (c) => {
  const recipient = c.req.query("recipient")?.toLowerCase();
  if (!recipient || !/^0x[0-9a-f]{40}$/.test(recipient)) {
    return c.json({ error: "recipient query param required (0x address)" }, 400);
  }
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const utcMidnight = Math.floor(Date.now() / 1000 / 86400) * 86400;

  const [recent, today] = await Promise.all([
    db
      .select()
      .from(schema.decoded)
      .where(eq(schema.decoded.recipient, recipient as `0x${string}`))
      .orderBy(desc(schema.decoded.timestamp))
      .limit(limit),
    db
      .select({
        mints: count().as("mints"),
        cents: sum(schema.decoded.usdcCentsAttested).as("cents"),
        tokenMinted: sum(schema.decoded.tokenMinted).as("tokenMinted"),
        feeCents: sum(schema.decoded.feeCentsRouted).as("feeCents"),
      })
      .from(schema.decoded)
      .where(
        and(
          eq(schema.decoded.recipient, recipient as `0x${string}`),
          gte(schema.decoded.timestamp, utcMidnight),
        ),
      ),
  ]);

  return c.json({
    recipient,
    today: {
      sinceUtc: utcMidnight,
      mints: today[0]?.mints ?? 0,
      usdcCents: today[0]?.cents?.toString() ?? "0",
      tokenMinted: today[0]?.tokenMinted?.toString() ?? "0",
      feeCents: today[0]?.feeCents?.toString() ?? "0",
    },
    recent: recent.map((r) => ({
      uid: r.attestationUid,
      usdcCents: r.usdcCentsAttested.toString(),
      tokenMinted: r.tokenMinted.toString(),
      timestamp: r.timestamp,
      txHash: r.txHash,
    })),
  });
});

/** Recent decode events, newest first — feeds the app's "Recent mints" panel
 *  (replaces a client-side eth_getLogs sweep the public RPC rate-limits). */
app.get("/v1/decodes/recent", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 8), 50);
  const rows = await db
    .select()
    .from(schema.decoded)
    .orderBy(desc(schema.decoded.timestamp))
    .limit(limit);
  return c.json({
    decodes: rows.map((r) => ({
      txHash: r.txHash,
      attestationUid: r.attestationUid,
      recipient: r.recipient,
      usdcCents: r.usdcCentsAttested.toString(),
      tokenMinted: r.tokenMinted.toString(),
      feeCents: r.feeCentsRouted.toString(),
      blockNumber: r.blockNumber.toString(),
      timestamp: r.timestamp,
    })),
  });
});

// --- REST: leaderboard helpers (the CLI's headline reads) ---

/** Top recipients by tokens minted. */
app.get("/v1/leaderboard/mints", async (c) => {
  const limit = Number(c.req.query("limit") ?? 10);
  const rows = await db
    .select({
      recipient: schema.decoded.recipient,
      tokenMinted: sum(schema.decoded.tokenMinted).as("tokenMinted"),
      usdcCentsAttested: sum(schema.decoded.usdcCentsAttested).as("usdcCentsAttested"),
      calls: count().as("calls"),
    })
    .from(schema.decoded)
    .groupBy(schema.decoded.recipient)
    .orderBy(desc(sql<bigint>`"tokenMinted"`))
    .limit(limit);

  return c.json({
    leaderboard: "mints",
    rows: rows.map((r, i) => ({
      rank: i + 1,
      address: r.recipient,
      tokenMinted: r.tokenMinted?.toString() ?? "0",
      cents: r.usdcCentsAttested?.toString() ?? "0",
      calls: r.calls ?? 0,
    })),
  });
});

/** Top slashers by total bounty earned (30% of slashedUsd18). */
app.get("/v1/leaderboard/slashers", async (c) => {
  const limit = Number(c.req.query("limit") ?? 10);
  const rows = await db
    .select({
      slasher: schema.slashedByProof.slasher,
      totalFraudUsd18: sum(schema.slashedByProof.slashedUsd18).as("totalFraudUsd18"),
      slashes: count().as("slashes"),
    })
    .from(schema.slashedByProof)
    .groupBy(schema.slashedByProof.slasher)
    .orderBy(desc(sql<bigint>`"totalFraudUsd18"`))
    .limit(limit);

  return c.json({
    leaderboard: "slashers",
    rows: rows.map((r, i) => {
      const totalFraud = BigInt(r.totalFraudUsd18 ?? 0);
      return {
        rank: i + 1,
        address: r.slasher,
        totalFraudUsd18: totalFraud.toString(),
        bountyEstimatedUsd18: ((totalFraud * 3_000n) / 10_000n).toString(),
        slashes: r.slashes ?? 0,
      };
    }),
  });
});

/** Total cumulative attested USD across all decoded events. */
app.get("/v1/stats/overview", async (c) => {
  const rows = await db
    .select({
      totalCents: sum(schema.decoded.usdcCentsAttested).as("totalCents"),
      totalMinted: sum(schema.decoded.tokenMinted).as("totalMinted"),
      decodeCount: count().as("decodeCount"),
    })
    .from(schema.decoded);

  const slashCount = await db.select({ c: count().as("c") }).from(schema.slashedByProof);

  const r = rows[0]!;
  return c.json({
    totalCentsAttested: r.totalCents?.toString() ?? "0",
    totalUsdAttested: Number(r.totalCents ?? 0n) / 100,
    totalTokenMinted: r.totalMinted?.toString() ?? "0",
    decodeCount: r.decodeCount ?? 0,
    slashByProofCount: slashCount[0]?.c ?? 0,
  });
});

/** All decode events for a given recipient (their personal history). */
app.get("/v1/decoded/:recipient", async (c) => {
  const recipient = c.req.param("recipient").toLowerCase() as `0x${string}`;
  const limit = Number(c.req.query("limit") ?? 50);
  const rows = await db
    .select()
    .from(schema.decoded)
    .where(eq(schema.decoded.recipient, recipient))
    .orderBy(desc(schema.decoded.blockNumber))
    .limit(limit);
  return c.json({
    recipient,
    count: rows.length,
    decodes: rows.map((r) => ({
      attestationUid: r.attestationUid,
      tokenMinted: r.tokenMinted.toString(),
      usdcCentsAttested: r.usdcCentsAttested.toString(),
      timestamp: r.timestamp,
      txHash: r.txHash,
      blockNumber: r.blockNumber.toString(),
    })),
  });
});

export default app;

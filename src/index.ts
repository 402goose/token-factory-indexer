/** Event handlers — one row per emitted event, keyed by (txHash:logIndex). */

import { ponder } from "ponder:registry";
import {
  decoded,
  deposited,
  withdrawn,
  slashed,
  slashedByProof,
  rosterChange,
} from "ponder:schema";

const rowId = (event: { transaction: { hash: string }; log: { logIndex: number } }) =>
  `${event.transaction.hash}:${event.log.logIndex}`;

ponder.on("Decoder:Decoded", async ({ event, context }) => {
  await context.db.insert(decoded).values({
    id: rowId(event),
    attestationUid: event.args.attestationUid,
    recipient: event.args.recipient,
    usdcCentsAttested: event.args.usdcCentsAttested,
    tokenMinted: event.args.tokenMinted,
    feeCentsRouted: event.args.feeCentsRouted,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

ponder.on("AttestorRegistry:Deposited", async ({ event, context }) => {
  await context.db.insert(deposited).values({
    id: rowId(event),
    attestor: event.args.attestor,
    asset: event.args.asset,
    amount: event.args.amount,
    sharesMinted: event.args.sharesMinted,
    navAddedUsd18: event.args.navAddedUsd18,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

ponder.on("AttestorRegistry:WithdrawExecuted", async ({ event, context }) => {
  await context.db.insert(withdrawn).values({
    id: rowId(event),
    attestor: event.args.attestor,
    sharesBurned: event.args.sharesBurned,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

ponder.on("AttestorRegistry:Slashed", async ({ event, context }) => {
  await context.db.insert(slashed).values({
    id: rowId(event),
    attestor: event.args.attestor,
    sharesBurned: event.args.sharesBurned,
    usdValueRoutedTeam: event.args.usdValueRoutedTeam,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

ponder.on("AttestorRegistry:SlashedByProof", async ({ event, context }) => {
  await context.db.insert(slashedByProof).values({
    id: rowId(event),
    attestor: event.args.attestor,
    slasher: event.args.slasher,
    sharesBurned: event.args.sharesBurned,
    slashedUsd18: event.args.slashedUsd18,
    reason: event.args.reason,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

ponder.on("AttestorRegistry:AttestorPromoted", async ({ event, context }) => {
  await context.db.insert(rosterChange).values({
    id: rowId(event),
    attestor: event.args.attestor,
    promoted: true,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

ponder.on("AttestorRegistry:AttestorDemoted", async ({ event, context }) => {
  await context.db.insert(rosterChange).values({
    id: rowId(event),
    attestor: event.args.attestor,
    promoted: false,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

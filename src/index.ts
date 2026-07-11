/** Event handlers — one row per emitted event, keyed by (txHash:logIndex). */

import { ponder } from "ponder:registry";
import { decodeAbiParameters } from "viem";
import { EasAbi } from "../abis/EAS.js";
import { EAS_ADDRESS } from "../ponder.config.js";
import {
  attestation,
  verification,
  decoded,
  deposited,
  withdrawn,
  slashed,
  slashedByProof,
  rosterChange,
  yieldReward,
} from "ponder:schema";

const rowId = (event: { transaction: { hash: string }; log: { logIndex: number } }) =>
  `${event.transaction.hash}:${event.log.logIndex}`;

// EAS Attested (ai-infer-v1 schema only — filtered in ponder.config). The event
// carries just the UID; read getAttestation to recover the encoded payload.
// EAS_ADDRESS comes from ponder.config so the handler always reads the same
// contract the config indexes (env-configurable — no predeploy on Robinhood).
ponder.on("EAS:Attested", async ({ event, context }) => {
  const uid = event.args.uid;
  const att = await context.client.readContract({
    abi: EasAbi,
    address: EAS_ADDRESS,
    functionName: "getAttestation",
    args: [uid],
  });
  if (!att || att.data === "0x") return; // unreadable / empty payload
  let decodedArgs: readonly [`0x${string}`, bigint, `0x${string}`, `0x${string}`, bigint];
  try {
    decodedArgs = decodeAbiParameters(
      [
        { name: "recipient", type: "address" },
        { name: "usdcCents", type: "uint64" },
        { name: "provider", type: "bytes32" },
        { name: "receiptId", type: "bytes32" },
        { name: "ts", type: "uint64" },
      ],
      att.data,
    ) as readonly [`0x${string}`, bigint, `0x${string}`, `0x${string}`, bigint];
  } catch {
    return; // non-conforming payload — skip
  }
  const [recipient, usdcCents, provider, receiptId, ts] = decodedArgs;
  await context.db
    .insert(attestation)
    .values({
      id: uid,
      uid,
      attester: event.args.attester,
      recipient,
      usdcCents,
      provider,
      receiptId,
      ts,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
      txHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// EAS Attested for the verified-account schema — recipient → verification UID,
// so the keeper resolves a recipient's verification from our own index.
ponder.on("EASVerified:Attested", async ({ event, context }) => {
  await context.db
    .insert(verification)
    .values({
      id: event.args.recipient.toLowerCase(),
      recipient: event.args.recipient,
      uid: event.args.uid,
      attester: event.args.attester,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    })
    .onConflictDoUpdate(() => ({
      uid: event.args.uid,
      attester: event.args.attester,
      blockNumber: event.block.number,
      timestamp: Number(event.block.timestamp),
    }));
});

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

ponder.on("YieldVault:RewardNotified", async ({ event, context }) => {
  await context.db.insert(yieldReward).values({
    id: rowId(event),
    from: event.args.from,
    amount: event.args.amount,
    rewardPerTokenAcc: event.args.rewardPerTokenAcc,
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

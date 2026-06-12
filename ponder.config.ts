/** token-factory indexer — Ponder config.
 *
 *  Indexes the protocol's permanent on-chain history so the CLI + app can
 *  query leaderboards, history, and slashing telemetry without paying for
 *  rolling RPC scans on every read. Schema in ponder.schema.ts; handlers
 *  in src/index.ts.
 *
 *  Start blocks below are the deploy blocks of the current Sepolia contracts
 *  (rounded down). For mainnet, bump network + start blocks + addresses. */

import { createConfig } from "ponder";
import { DecoderAbi } from "./abis/Decoder.js";
import { AttestorRegistryAbi } from "./abis/AttestorRegistry.js";
import { EasAbi } from "./abis/EAS.js";

// EAS schema UIDs on Base Sepolia — we index attestations on these two only.
const AI_INFER_SCHEMA = "0x3a2e897b0f3ee6cdddb349e297efa12ea14a32a4634a7953af97312771a4a3a2";
const VERIFIED_ACCOUNT_SCHEMA = "0xbda8dd64efa4c537514cfe4c96ab5d5f14a8ec0c9105b799b47a010e89c0c72d";
const EAS_PREDEPLOY = "0x4200000000000000000000000000000000000021";

export default createConfig({
  chains: {
    baseSepolia: {
      id: 84532,
      rpc: process.env.PONDER_RPC_URL_84532 ?? "https://sepolia.base.org",
    },
  },
  contracts: {
    // EAS: index Attested events for ONLY our ai-infer-v1 schema (filter on the
    // indexed schemaUID), then read getAttestation in the handler to decode the
    // payload. startBlock matches the rest of the current stack.
    EAS: {
      chain: "baseSepolia",
      abi: EasAbi,
      address: EAS_PREDEPLOY,
      // v3 stack (security-hardened core, 2026-06-11). Aligns ai-infer indexing with
      // the new Decoder so pre-v3 attestations (decoded by the retired Decoder) don't
      // surface as "undecoded" to the keeper.
      startBlock: 42735720,
      filter: { event: "Attested", args: { schemaUID: AI_INFER_SCHEMA } },
    },
    // Same EAS address, different schema — index verified-account attestations so
    // the keeper can resolve a recipient's verification without an external
    // GraphQL dependency (EASScan lags on Sepolia).
    EASVerified: {
      chain: "baseSepolia",
      abi: EasAbi,
      address: EAS_PREDEPLOY,
      startBlock: 42_670_000,
      filter: { event: "Attested", args: { schemaUID: VERIFIED_ACCOUNT_SCHEMA } },
    },
    // startBlock chosen as ~head − 200k for the spike so a cold sync finishes
    // in minutes against the public RPC. Production deploy backfills to the
    // actual deploy block.
    // v3 stack — security-hardened core (cap fails closed, slashing reaches pending
    // shares). Redeployed 2026-06-11; addresses + startBlock updated together.
    Decoder: {
      chain: "baseSepolia",
      abi: DecoderAbi,
      address: "0xa8cB0275e496a3Db932A9F0e4Be1bace01E6DE27",
      startBlock: 42735720,
    },
    AttestorRegistry: {
      chain: "baseSepolia",
      abi: AttestorRegistryAbi,
      address: "0xC510BD369Fb5977370F7fB121e728178bdAb04F4",
      startBlock: 42735720,
    },
  },
});

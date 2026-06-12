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

// ai-infer-v1 schema UID on Base Sepolia — we index only EAS attestations on it.
const AI_INFER_SCHEMA = "0x3a2e897b0f3ee6cdddb349e297efa12ea14a32a4634a7953af97312771a4a3a2";
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
      startBlock: 42_670_000,
      filter: { event: "Attested", args: { schemaUID: AI_INFER_SCHEMA } },
    },
    // startBlock chosen as ~head − 200k for the spike so a cold sync finishes
    // in minutes against the public RPC. Production deploy backfills to the
    // actual deploy block.
    Decoder: {
      chain: "baseSepolia",
      abi: DecoderAbi,
      address: "0xCB9E8f3877b5797386fF28bF6d584B6a1dfaD50D",
      startBlock: 42_670_000,
    },
    AttestorRegistry: {
      chain: "baseSepolia",
      abi: AttestorRegistryAbi,
      address: "0x60e77cF48feC08F07c0C55939E71c169C65C3E18",
      startBlock: 42673873,
    },
  },
});

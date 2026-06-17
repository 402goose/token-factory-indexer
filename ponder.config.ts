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
import { YieldVaultAbi } from "./abis/YieldVault.js";

// EAS schema UIDs on Base Sepolia — we index attestations on these two only.
const AI_INFER_SCHEMA = "0x3a2e897b0f3ee6cdddb349e297efa12ea14a32a4634a7953af97312771a4a3a2";
const VERIFIED_ACCOUNT_SCHEMA = "0xbda8dd64efa4c537514cfe4c96ab5d5f14a8ec0c9105b799b47a010e89c0c72d";
const EAS_PREDEPLOY = "0x4200000000000000000000000000000000000021";

// Contract addresses + start block are env-overridable so the same config drives
// the live Sepolia stack (defaults) AND a local fork (e2e / a fresh deploy) without
// editing this file. On a fork, set PONDER_START_BLOCK to the fork block so Ponder
// doesn't backfill hundreds of thousands of blocks through anvil's upstream RPC.
type Hex40 = `0x${string}`;
const env = (k: string, fallback: string) => (process.env[k] || fallback) as Hex40;
const DECODER_ADDRESS = env("TF_DECODER_ADDRESS", "0xc611EEC865545412Aaf7d50eBFc3514BCC23ecc6");
const REGISTRY_ADDRESS = env("TF_REGISTRY_ADDRESS", "0x27c230eEF1D40a30080Ca38C36dE601C2Ec24EE0");
const YIELD_VAULT_ADDRESS = env("TF_YIELD_VAULT_ADDRESS", "0x20BF7c0B977b117e6a53c27e40ae12Ecd69667e8");
const START = process.env.PONDER_START_BLOCK ? Number(process.env.PONDER_START_BLOCK) : undefined;

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
      startBlock: START ?? 42816440,
      filter: { event: "Attested", args: { schemaUID: AI_INFER_SCHEMA } },
    },
    // Same EAS address, different schema — index verified-account attestations so
    // the keeper can resolve a recipient's verification without an external
    // GraphQL dependency (EASScan lags on Sepolia).
    EASVerified: {
      chain: "baseSepolia",
      abi: EasAbi,
      address: EAS_PREDEPLOY,
      startBlock: START ?? 42_670_000,
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
      address: DECODER_ADDRESS,
      startBlock: START ?? 42816440,
    },
    AttestorRegistry: {
      chain: "baseSepolia",
      abi: AttestorRegistryAbi,
      address: REGISTRY_ADDRESS,
      startBlock: START ?? 42816440,
    },
    // TokenYieldVault (demand-side sink). Index RewardNotified to total the USDC paid
    // to stakers and power the /yield APR. Standalone contract, deployed after v5 core.
    YieldVault: {
      chain: "baseSepolia",
      abi: YieldVaultAbi,
      address: YIELD_VAULT_ADDRESS,
      startBlock: START ?? 42816440,
    },
  },
});

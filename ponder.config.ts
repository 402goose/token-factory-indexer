/** token-factory indexer — Ponder config.
 *
 *  Indexes the protocol's permanent on-chain history so the CLI + app can
 *  query leaderboards, history, and slashing telemetry without paying for
 *  rolling RPC scans on every read. Schema in ponder.schema.ts; handlers
 *  in src/index.ts.
 *
 *  One deploy targets ONE chain (pick with PONDER_CHAIN or by setting that
 *  chain's PONDER_RPC_URL_<id>). Base Sepolia is the default and keeps the
 *  live-stack address/start-block defaults below. The Robinhood chains have
 *  no defaults — their contracts don't exist until launch day — so every
 *  address + start block must come from the deploy env (we fail fast if not). */

import { createConfig } from "ponder";
import { fallback, http } from "viem";
import { DecoderAbi } from "./abis/Decoder.js";
import { AttestorRegistryAbi } from "./abis/AttestorRegistry.js";
import { EasAbi } from "./abis/EAS.js";
import { YieldVaultAbi } from "./abis/YieldVault.js";

// ── Chain selection ─────────────────────────────────────────────────────────
// PONDER_CHAIN=baseSepolia|robinhood|robinhoodTestnet picks explicitly; otherwise
// the presence of a Robinhood RPC env var picks that chain (mainnet wins if both
// are somehow set), falling back to Base Sepolia — so existing deploys keep
// working with zero env changes.
const CHAINS = {
  baseSepolia: {
    id: 84532,
    rpcEnv: "PONDER_RPC_URL_84532",
    // Free best-effort defaults; see RPC resilience note below.
    defaultRpc: "https://base-sepolia.drpc.org,https://sepolia.base.org",
  },
  robinhood: {
    id: 4663,
    rpcEnv: "PONDER_RPC_URL_4663",
    defaultRpc: "https://rpc.mainnet.chain.robinhood.com",
  },
  robinhoodTestnet: {
    id: 46630,
    rpcEnv: "PONDER_RPC_URL_46630",
    defaultRpc: "https://rpc.testnet.chain.robinhood.com",
  },
} as const;
type ChainName = keyof typeof CHAINS;

const CHAIN_NAME: ChainName = (() => {
  const explicit = process.env.PONDER_CHAIN;
  if (explicit) {
    if (!(explicit in CHAINS)) {
      throw new Error(
        `PONDER_CHAIN=${explicit} is not a known chain (expected one of: ${Object.keys(CHAINS).join(", ")})`,
      );
    }
    return explicit as ChainName;
  }
  if (process.env.PONDER_RPC_URL_4663) return "robinhood";
  if (process.env.PONDER_RPC_URL_46630) return "robinhoodTestnet";
  return "baseSepolia";
})();
const CHAIN = CHAINS[CHAIN_NAME];
const IS_ROBINHOOD = CHAIN_NAME !== "baseSepolia";

// ── Contract addresses + start blocks ───────────────────────────────────────
// Env-overridable so the same config drives the live Sepolia stack (defaults),
// a local fork (e2e / a fresh deploy), AND the Robinhood chains without editing
// this file. On a fork, set PONDER_START_BLOCK to the fork block so Ponder
// doesn't backfill hundreds of thousands of blocks through anvil's upstream RPC.
type Hex40 = `0x${string}`;
// Base Sepolia has known defaults; Robinhood has none (greenfield launch-day
// deploy), so on Robinhood every value is required and we fail fast with the
// missing env name instead of silently indexing address(0).
const env = (k: string, baseSepoliaDefault: string) => {
  const v = process.env[k];
  if (v) return v as Hex40;
  if (IS_ROBINHOOD) {
    throw new Error(
      `${CHAIN_NAME}: missing required env ${k} — Robinhood contract addresses/start blocks do not exist until launch day and must be provided by the deploy env.`,
    );
  }
  return baseSepoliaDefault as Hex40;
};
const DECODER_ADDRESS = env("TF_DECODER_ADDRESS", "0xc611EEC865545412Aaf7d50eBFc3514BCC23ecc6");
const REGISTRY_ADDRESS = env("TF_REGISTRY_ADDRESS", "0x27c230eEF1D40a30080Ca38C36dE601C2Ec24EE0");
const YIELD_VAULT_ADDRESS = env("TF_YIELD_VAULT_ADDRESS", "0x20BF7c0B977b117e6a53c27e40ae12Ecd69667e8");

// EAS: on Base Sepolia it's the OP-stack predeploy; on Robinhood there is no
// predeploy — we self-deploy EAS v1.4.0 at launch, so the address comes from env.
// Exported so src/index.ts reads getAttestation from the SAME resolved address
// (single source of truth — never re-derive this in handlers).
export const EAS_ADDRESS = env("TF_EAS_ADDRESS", "0x4200000000000000000000000000000000000021");

// EAS schema UIDs — we index attestations on these two only. UIDs are
// keccak(schema, resolver, revocable), so re-registering the identical schema on
// Robinhood yields the same UID — the defaults hold on every chain; env overrides
// cover the case where a schema is ever registered with a different string/resolver.
const optEnv = (k: string, def: string) => (process.env[k] || def) as Hex40;
const AI_INFER_SCHEMA = optEnv(
  "TF_AI_INFER_SCHEMA",
  "0x3a2e897b0f3ee6cdddb349e297efa12ea14a32a4634a7953af97312771a4a3a2",
);
const VERIFIED_ACCOUNT_SCHEMA = optEnv(
  "TF_VERIFIED_ACCOUNT_SCHEMA",
  "0xbda8dd64efa4c537514cfe4c96ab5d5f14a8ec0c9105b799b47a010e89c0c72d",
);

// Start block: required on Robinhood (set to the launch-day deploy block);
// optional override on Base Sepolia (defaults below match the live stack).
const START = process.env.PONDER_START_BLOCK
  ? Number(process.env.PONDER_START_BLOCK)
  : undefined;
if (IS_ROBINHOOD && START === undefined) {
  throw new Error(
    `${CHAIN_NAME}: missing required env PONDER_START_BLOCK — set it to the launch-day deploy block (Robinhood blocks are ~0.1s, so an unbounded backfill from genesis is not an option).`,
  );
}

// ── RPC resilience ──────────────────────────────────────────────────────────
// Free best-effort endpoints each flake on their own — e.g. on Base Sepolia,
// drpc handles the archive backfill but times out on realtime block polling;
// sepolia.base.org rate-limits big backfills but is fine for realtime/incremental.
// So use a viem fallback() across a comma-separated list: Ponder tries the first
// and falls through on timeout/error. PONDER_RPC_URL_<chain id> overrides
// (comma-separated for multiple; a single dedicated keyed RPC is still the real
// fix — see indexer issue #1).
const RPC_URLS = (process.env[CHAIN.rpcEnv] ?? CHAIN.defaultRpc)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default createConfig({
  chains: {
    [CHAIN_NAME]: {
      id: CHAIN.id,
      rpc: fallback(RPC_URLS.map((u) => http(u, { timeout: 20_000 }))),
    },
  },
  contracts: {
    // EAS: index Attested events for ONLY our ai-infer-v1 schema (filter on the
    // indexed schemaUID), then read getAttestation in the handler to decode the
    // payload. startBlock matches the rest of the current stack.
    EAS: {
      chain: CHAIN_NAME,
      abi: EasAbi,
      address: EAS_ADDRESS,
      startBlock: START ?? 42816440,
      filter: { event: "Attested", args: { schemaUID: AI_INFER_SCHEMA } },
    },
    // Same EAS address, different schema — index verified-account attestations so
    // the keeper can resolve a recipient's verification without an external
    // GraphQL dependency (EASScan lags on Sepolia).
    EASVerified: {
      chain: CHAIN_NAME,
      abi: EasAbi,
      address: EAS_ADDRESS,
      startBlock: START ?? 42_670_000,
      filter: { event: "Attested", args: { schemaUID: VERIFIED_ACCOUNT_SCHEMA } },
    },
    // startBlock chosen as ~head − 200k for the spike so a cold sync finishes
    // in minutes against the public RPC. Production deploy backfills to the
    // actual deploy block.
    // v3 stack — security-hardened core (cap fails closed, slashing reaches pending
    // shares). Redeployed 2026-06-11; addresses + startBlock updated together.
    Decoder: {
      chain: CHAIN_NAME,
      abi: DecoderAbi,
      address: DECODER_ADDRESS,
      startBlock: START ?? 42816440,
    },
    AttestorRegistry: {
      chain: CHAIN_NAME,
      abi: AttestorRegistryAbi,
      address: REGISTRY_ADDRESS,
      startBlock: START ?? 42816440,
    },
    // TokenYieldVault (demand-side sink). Index RewardNotified to total the USDC paid
    // to stakers and power the /yield APR. Standalone contract, deployed after v5 core.
    YieldVault: {
      chain: CHAIN_NAME,
      abi: YieldVaultAbi,
      address: YIELD_VAULT_ADDRESS,
      startBlock: START ?? 42816440,
    },
  },
});

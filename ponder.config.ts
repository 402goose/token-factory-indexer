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

export default createConfig({
  chains: {
    baseSepolia: {
      id: 84532,
      rpc: process.env.PONDER_RPC_URL_84532 ?? "https://sepolia.base.org",
    },
  },
  contracts: {
    // startBlock chosen as ~head − 200k for the spike so a cold sync finishes
    // in minutes against the public RPC. Production deploy backfills to the
    // actual deploy block.
    Decoder: {
      chain: "baseSepolia",
      abi: DecoderAbi,
      address: "0x1dd180A08f90EBcE291733fa8cbaFBf0eCDcd4b6",
      startBlock: 42_440_000,
    },
    AttestorRegistry: {
      chain: "baseSepolia",
      abi: AttestorRegistryAbi,
      address: "0xd00a4c88f2e5ad265be1497ab69491e00e7c2b1a",
      startBlock: 42_640_000,
    },
  },
});

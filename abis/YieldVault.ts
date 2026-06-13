/** Minimal TokenYieldVault ABI fragment — only the event the indexer reads. */
export const YieldVaultAbi = [
  {
    type: "event",
    name: "RewardNotified",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "rewardPerTokenAcc", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

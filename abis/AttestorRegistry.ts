/** Minimal AttestorRegistry ABI fragment — only events the indexer reads. */
export const AttestorRegistryAbi = [
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "attestor", type: "address", indexed: true },
      { name: "asset", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "sharesMinted", type: "uint256", indexed: false },
      { name: "navAddedUsd18", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WithdrawExecuted",
    inputs: [
      { name: "attestor", type: "address", indexed: true },
      { name: "sharesBurned", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Slashed",
    inputs: [
      { name: "attestor", type: "address", indexed: true },
      { name: "sharesBurned", type: "uint256", indexed: false },
      { name: "usdValueRoutedTeam", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SlashedByProof",
    inputs: [
      { name: "attestor", type: "address", indexed: true },
      { name: "slasher", type: "address", indexed: true },
      { name: "sharesBurned", type: "uint256", indexed: false },
      { name: "slashedUsd18", type: "uint256", indexed: false },
      { name: "reason", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AttestorPromoted",
    inputs: [{ name: "attestor", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "AttestorDemoted",
    inputs: [{ name: "attestor", type: "address", indexed: true }],
  },
] as const;

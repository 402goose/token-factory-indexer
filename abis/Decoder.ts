/** Minimal Decoder ABI fragment — only the events the indexer reads. */
export const DecoderAbi = [
  {
    type: "event",
    name: "Decoded",
    inputs: [
      { name: "attestationUid", type: "bytes32", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "usdcCentsAttested", type: "uint256", indexed: false },
      { name: "tokenMinted", type: "uint256", indexed: false },
      { name: "feeCentsRouted", type: "uint256", indexed: false },
    ],
  },
] as const;

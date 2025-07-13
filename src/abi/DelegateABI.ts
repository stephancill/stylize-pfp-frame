export const DelegateABI = [
  { inputs: [], name: "InvalidRoyalties", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      {
        indexed: true,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "ETHReceived",
    type: "event",
  },
  { anonymous: false, inputs: [], name: "Initialized", type: "event" },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          { internalType: "address", name: "receiver", type: "address" },
          { internalType: "string", name: "memo", type: "string" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          {
            components: [
              { internalType: "address", name: "receiver", type: "address" },
              { internalType: "uint256", name: "basisPoints", type: "uint256" },
            ],
            internalType: "struct Royalties[]",
            name: "royalties",
            type: "tuple[]",
          },
        ],
        indexed: false,
        internalType: "struct Payment",
        name: "payment",
        type: "tuple",
      },
    ],
    name: "PaymentReceived",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
  {
    inputs: [],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "memo", type: "string" },
      {
        components: [
          { internalType: "address", name: "receiver", type: "address" },
          { internalType: "uint256", name: "basisPoints", type: "uint256" },
        ],
        internalType: "struct Royalties[]",
        name: "royalties",
        type: "tuple[]",
      },
    ],
    name: "pay",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
] as const;

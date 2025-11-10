export const PACK_FACTORY_ABI = [
  {
    "type": "function",
    "name": "createCollection",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "components": [
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "owner", "type": "address" },
          { "name": "tokenURIs", "type": "string[6]" },
          { "name": "packPrice", "type": "uint256" },
          { "name": "maxPacks", "type": "uint256" },
          { "name": "royaltyBps", "type": "uint96" },
          { "name": "royaltyReceiver", "type": "address" },
          { "name": "marketplace", "type": "address" },
          { "name": "initialMintTo", "type": "address" },
          { "name": "initialMintAmount", "type": "uint256" }
        ]
      }
    ],
    "outputs": [{ "name": "col", "type": "address" }]
  },
  {
    "type": "function",
    "name": "setDefaults",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "_feeReceiver", "type": "address" },
      { "name": "_feeBps", "type": "uint96" },
      { "name": "_marketplace", "type": "address" }
    ],
    "outputs": []
  },
  {
    "type": "event",
    "name": "CollectionCreated",
    "inputs": [
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "collection", "type": "address", "indexed": true },
      { "name": "owner", "type": "address", "indexed": true }
    ],
    "anonymous": false
  }
] as const

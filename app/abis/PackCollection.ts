export const PACK_COLLECTION_ABI = [
    {"type":"function","name":"mintPacks","stateMutability":"payable","inputs":[{"name":"amount","type":"uint256"}],"outputs":[]},
    {"type":"function","name":"openPack","stateMutability":"nonpayable","inputs":[{"name":"amount","type":"uint256"}],"outputs":[]},
    {"type":"function","name":"uri","stateMutability":"view","inputs":[{"name":"id","type":"uint256"}],"outputs":[{"type":"string"}]},
    {"type":"function","name":"balanceOf","stateMutability":"view","inputs":[{"name":"account","type":"address"},{"name":"id","type":"uint256"}],"outputs":[{"type":"uint256"}]},
    {"type":"function","name":"packPrice","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
    {"type":"function","name":"maxPacks","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
    {"type":"function","name":"packsMinted","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
    {"type":"function","name":"name","stateMutability":"view","inputs":[],"outputs":[{"type":"string"}]},
    {"type":"function","name":"symbol","stateMutability":"view","inputs":[],"outputs":[{"type":"string"}]},
  ] as const
  
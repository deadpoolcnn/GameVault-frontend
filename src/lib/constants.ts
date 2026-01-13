export const CONTRACTS = {
  GAME_ITEM: "0x25b488359EE6e4B611915B94CDd3ef92eB2e211a" as `0x${string}`,
  MARKETPLACE: "0x8B50ef54eD818adE9D7628ab2248f48fe84e3AFC" as `0x${string}`,
} as const;

export const CHAIN_ID = 421614; // Arbitrum Sepolia

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

import { http, createConfig } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected({
      target: {
        id: "metamask",
        name: "MetaMask",
        provider: (window) => window?.ethereum,
      },
    }),
    injected({
      target: {
        id: "okx",
        name: "OKX Wallet",
        provider: (window) => window?.okxwallet,
      },
    }),
    injected({
      target: {
        id: "trust",
        name: "Trust Wallet",
        provider: (window) => window?.trustwallet,
      },
    }),
    walletConnect({
      projectId,
      showQrModal: true,
    }),
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

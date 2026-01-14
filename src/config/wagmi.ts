/* eslint-disable */
// @ts-nocheck
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";
import type { Wallet } from "@rainbow-me/rainbowkit";
import { injected } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Extend Window interface to include wallet providers
declare global {
  interface Window {
    okxwallet?: any;
    trustwallet?: any;
    ethereum?: any;
  }
}

// Custom OKX Wallet
const okxWallet = (): Wallet => ({
  id: "okx",
  name: "OKX Wallet",
  iconUrl: "https://static.okx.com/cdn/assets/imgs/247/58E63FEA47A2B7D7.png",
  iconBackground: "#000",
  downloadUrls: {
    chrome: "https://chrome.google.com/webstore/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge",
  },
  createConnector: () => {
    return injected({
      target: {
        id: "okx",
        name: "OKX Wallet",
        provider(window) {
          return window?.okxwallet || (window?.ethereum?.isOkxWallet ? window.ethereum : undefined);
        },
      },
    });
  },
});

// Custom Trust Wallet
const trustWallet = (): Wallet => ({
  id: "trust",
  name: "Trust Wallet",
  iconUrl: "https://trustwallet.com/assets/images/media/assets/TWT.png",
  iconBackground: "#fff",
  downloadUrls: {
    chrome: "https://chrome.google.com/webstore/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph",
  },
  createConnector: () => {
    return injected({
      target: {
        id: "trust",
        name: "Trust Wallet",
        provider(window) {
          return window?.trustwallet || (window?.ethereum?.isTrust ? window.ethereum : undefined);
        },
      },
    });
  },
});

export const config = getDefaultConfig({
  appName: "GameVault",
  projectId,
  chains: [arbitrumSepolia],
  ssr: true,
  wallets: [
    {
      groupName: "Popular",
      wallets: [okxWallet, trustWallet],
    },
  ],
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

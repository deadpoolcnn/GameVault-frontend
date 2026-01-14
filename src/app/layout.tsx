import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/web3-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { NFTDataProvider } from "@/providers/nft-data-provider";
import { Header } from "@/components/header";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GameVault - NFT Marketplace",
  description: "Trade gaming NFTs on the blockchain",
  icons: {
    icon: '/placeholder-nft.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Web3Provider>
            <NFTDataProvider>
              <div className="min-h-screen bg-gradient-main">
                <Header />
                <main className="container mx-auto px-4 py-8">
                  {children}
                </main>
              </div>
              <Toaster position="bottom-right" richColors />
            </NFTDataProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}

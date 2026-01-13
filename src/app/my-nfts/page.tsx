"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { ListNFTModal } from "@/components/list-nft-modal";
import { useMarketplace, useNFTBalance } from "@/hooks/use-marketplace";
import { Listing } from "@/types/nft";
import { Wallet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [myNFTs, setMyNFTs] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listModal, setListModal] = useState<{
    isOpen: boolean;
    tokenId: bigint;
    nftName?: string;
  }>({
    isOpen: false,
    tokenId: BigInt(0),
  });

  const { balance } = useNFTBalance(address);
  const { cancelListing } = useMarketplace();

  // Fetch user's NFTs
  useEffect(() => {
    async function fetchMyNFTs() {
      if (!address || !balance) {
        setIsLoading(false);
        return;
      }

      try {
        // In production, you'd enumerate through the user's tokens
        // For now, this is a placeholder
        const nfts: Listing[] = [];
        
        // Example: If user has tokens, create placeholder listings
        // You'd need to implement actual token enumeration based on your contract
        
        setMyNFTs(nfts);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyNFTs();
  }, [address, balance]);

  const handleList = (tokenId: bigint) => {
    const nft = myNFTs.find((n) => n.tokenId === tokenId);
    setListModal({
      isOpen: true,
      tokenId,
      nftName: nft?.nft?.metadata.name,
    });
  };

  const handleCancel = async (tokenId: bigint) => {
    await cancelListing(tokenId);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="neu-card p-6">
          <Wallet className="h-16 w-16 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please connect your wallet to view your NFT collection
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">My NFTs</h1>
        <p className="text-muted-foreground">
          Manage your NFT collection and listings
        </p>
      </div>

      {/* Balance Info */}
      {balance !== undefined && (
        <div className="glass-card p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <span className="text-sm">
            You own <strong>{balance.toString()}</strong> NFT{balance !== BigInt(1) ? "s" : ""}
          </span>
        </div>
      )}

      {/* NFTs Grid */}
      <div>
        {isLoading ? (
          <NFTGridSkeleton count={6} />
        ) : (
          <NFTGrid
            listings={myNFTs}
            onList={handleList}
            onCancel={handleCancel}
            emptyMessage="You don't own any NFTs yet"
          />
        )}
      </div>

      {/* List Modal */}
      <ListNFTModal
        isOpen={listModal.isOpen}
        onClose={() => setListModal({ ...listModal, isOpen: false })}
        tokenId={listModal.tokenId}
        nftName={listModal.nftName}
      />
    </div>
  );
}

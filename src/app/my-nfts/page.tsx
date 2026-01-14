"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { ListNFTModal } from "@/components/list-nft-modal";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useNFTData } from "@/providers/nft-data-provider";
import { Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [listModal, setListModal] = useState<{
    isOpen: boolean;
    tokenId: bigint;
    nftName?: string;
  }>({
    isOpen: false,
    tokenId: BigInt(0),
  });

  const { cancelListing } = useMarketplace();
  const { 
    userNFTs,
    isLoadingUserNFTs,
    refreshUserNFTs,
    refreshMarketplace,
    activeListings,
    optimisticRemoveListing
  } = useNFTData();

  const myNFTs = address ? userNFTs.get(address.toLowerCase()) || [] : [];

  // Load user NFTs on mount or when address changes
  useEffect(() => {
    if (address) {
      refreshUserNFTs(address.toLowerCase());
    }
  }, [address]);

  const handleList = (tokenId: bigint) => {
    const nft = myNFTs.find((n) => n.tokenId === tokenId);
    setListModal({
      isOpen: true,
      tokenId,
      nftName: nft?.nft?.metadata.name,
    });
  };

  const handleCancel = async (tokenId: bigint) => {
    const listingId = activeListings.get(tokenId.toString());
    if (!listingId) {
      console.error("No listing ID found for tokenId:", tokenId);
      return;
    }
    console.log(`🗑️ Canceling listing ${listingId} for token ${tokenId}`);
    
    // Optimistic update with user address
    optimisticRemoveListing(listingId, address);
    
    // Execute transaction
    await cancelListing(listingId);
  };

  const handleRefresh = () => {
    if (address) {
      refreshUserNFTs(address.toLowerCase());
    }
  };

  const handleListSuccess = async () => {
    // 乐观更新已经在list-nft-modal中完成，这里只需要静默刷新确保最终一致性
    // 不需要轮询，后台会自动同步
    console.log("✅ List success callback triggered, optimistic update already applied");
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
          Please connect your wallet to view your NFTs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My NFTs</h1>
          <p className="text-muted-foreground">
            {myNFTs.length} NFT{myNFTs.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoadingUserNFTs}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUserNFTs ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* NFT Grid */}
      {isLoadingUserNFTs ? (
        <NFTGridSkeleton count={6} />
      ) : myNFTs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="neu-card p-6">
            <AlertCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No NFTs Found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You don't own any NFTs yet. Visit the marketplace to buy some!
          </p>
        </div>
      ) : (
        <NFTGrid
          listings={myNFTs}
          onList={handleList}
          onCancel={handleCancel}
          showOwnerActions={true}
          emptyMessage="No NFTs found in your wallet"
        />
      )}

      {/* List Modal */}
      <ListNFTModal
        isOpen={listModal.isOpen}
        onClose={() => setListModal({ ...listModal, isOpen: false })}
        tokenId={listModal.tokenId}
        nftName={listModal.nftName}
        onSuccess={handleListSuccess}
      />
    </div>
  );
}

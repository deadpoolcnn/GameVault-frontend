"use client";

import { useEffect, useState } from "react";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { BuyNFTModal } from "@/components/buy-nft-modal";
import { useNFTData } from "@/providers/nft-data-provider";
import { Listing } from "@/types/nft";
import { Store, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [buyModal, setBuyModal] = useState<{
    isOpen: boolean;
    listingId: bigint;
    tokenId: bigint;
    price: bigint;
    nftName?: string;
    nftImage?: string;
  }>({
    isOpen: false,
    listingId: BigInt(0),
    tokenId: BigInt(0),
    price: BigInt(0),
  });

  const { 
    marketplaceListings, 
    isLoadingMarketplace, 
    refreshMarketplace 
  } = useNFTData();

  // Load marketplace data on mount
  useEffect(() => {
    refreshMarketplace();
  }, []);

  const handleBuy = (listing: Listing) => {
    setBuyModal({
      isOpen: true,
      listingId: listing.listingId,
      tokenId: listing.tokenId,
      price: listing.price,
      nftName: listing?.nft?.metadata.name,
      nftImage: listing?.nft?.metadata.image,
    });
  };

  const handleRefresh = () => {
    refreshMarketplace();
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <div className="flex items-center justify-center mb-4">
          <div className="neu-card p-4">
            <Store className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          NFT Marketplace
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover, collect, and trade unique gaming NFTs on Arbitrum Sepolia
        </p>
      </div>

      {/* Listings Grid */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Available NFTs</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingMarketplace}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMarketplace ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {isLoadingMarketplace ? (
          <NFTGridSkeleton count={6} />
        ) : (
          <NFTGrid
            listings={marketplaceListings}
            onBuy={handleBuy}
            emptyMessage="No NFTs listed yet. Be the first to list!"
          />
        )}
      </div>

      {/* Buy Modal */}
      <BuyNFTModal
        isOpen={buyModal.isOpen}
        onClose={() => setBuyModal({ ...buyModal, isOpen: false })}
        listingId={buyModal.listingId}
        tokenId={buyModal.tokenId}
        price={buyModal.price}
        nftName={buyModal.nftName}
        nftImage={buyModal.nftImage}
      />
    </div>
  );
}

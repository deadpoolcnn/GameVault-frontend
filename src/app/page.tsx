"use client";

import { useEffect, useState } from "react";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { BuyNFTModal } from "@/components/buy-nft-modal";
import { useGetListings } from "@/hooks/use-marketplace";
import { Listing, NFTMetadata } from "@/types/nft";
import { CONTRACTS } from "@/lib/constants";
import { useReadContract } from "wagmi";
import { GAME_ITEM_ABI } from "@/contracts/abis";
import { resolveIPFS } from "@/lib/utils";
import { Store } from "lucide-react";

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyModal, setBuyModal] = useState<{
    isOpen: boolean;
    tokenId: bigint;
    price: bigint;
    nftName?: string;
    nftImage?: string;
  }>({
    isOpen: false,
    tokenId: BigInt(0),
    price: BigInt(0),
  });

  const { tokenIds } = useGetListings();

  // Fetch listings data
  useEffect(() => {
    async function fetchListings() {
      if (!tokenIds || tokenIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const listingsData: Listing[] = [];

        for (const tokenId of tokenIds) {
          // This is a simplified version - in production, you'd batch these calls
          // or use a subgraph/indexer for better performance
          listingsData.push({
            tokenId,
            seller: "0x0000000000000000000000000000000000000000", // Placeholder
            price: BigInt(0), // Placeholder
            isActive: true,
          });
        }

        setListings(listingsData);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchListings();
  }, [tokenIds]);

  const handleBuy = (tokenId: bigint, price: bigint) => {
    const listing = listings.find((l) => l.tokenId === tokenId);
    setBuyModal({
      isOpen: true,
      tokenId,
      price,
      nftName: listing?.nft?.metadata.name,
      nftImage: listing?.nft?.metadata.image,
    });
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
        <h2 className="text-2xl font-bold mb-6">Available NFTs</h2>
        {isLoading ? (
          <NFTGridSkeleton count={6} />
        ) : (
          <NFTGrid
            listings={listings}
            onBuy={handleBuy}
            emptyMessage="No NFTs listed yet. Be the first to list!"
          />
        )}
      </div>

      {/* Buy Modal */}
      <BuyNFTModal
        isOpen={buyModal.isOpen}
        onClose={() => setBuyModal({ ...buyModal, isOpen: false })}
        tokenId={buyModal.tokenId}
        price={buyModal.price}
        nftName={buyModal.nftName}
        nftImage={buyModal.nftImage}
      />
    </div>
  );
}

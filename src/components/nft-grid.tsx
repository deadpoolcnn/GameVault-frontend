"use client";

import { NFTCard } from "./nft-card";
import { Listing } from "@/types/nft";
import { Loader2 } from "lucide-react";

interface NFTGridProps {
  listings: Listing[];
  isLoading?: boolean;
  onBuy?: (tokenId: bigint, price: bigint) => void;
  onList?: (tokenId: bigint) => void;
  onCancel?: (tokenId: bigint) => void;
  emptyMessage?: string;
}

export function NFTGrid({
  listings,
  isLoading = false,
  onBuy,
  onList,
  onCancel,
  emptyMessage = "No NFTs found",
}: NFTGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="swiss-grid">
      {listings.map((listing) => (
        <NFTCard
          key={listing.tokenId.toString()}
          listing={listing}
          onBuy={onBuy}
          onList={onList}
          onCancel={onCancel}
          isListed={listing.isActive}
        />
      ))}
    </div>
  );
}

// Loading skeleton component
export function NFTGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="swiss-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="neu-card overflow-hidden">
          <div className="aspect-square skeleton" />
          <div className="p-4 space-y-3">
            <div className="h-6 skeleton w-3/4" />
            <div className="h-4 skeleton w-full" />
            <div className="h-4 skeleton w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

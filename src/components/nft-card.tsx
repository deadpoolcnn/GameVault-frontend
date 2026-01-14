"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Listing } from "@/types/nft";
import { formatPrice, shortenText } from "@/lib/utils";
import { ShoppingCart, Tag, X } from "lucide-react";
import Image from "next/image";
import { useAccount } from "wagmi";

interface NFTCardProps {
  listing: Listing;
  onBuy?: (listing: Listing) => void;
  onList?: (tokenId: bigint) => void;
  onCancel?: (tokenId: bigint) => void;
  isOwned?: boolean;
  isListed?: boolean;
}

export function NFTCard({
  listing,
  onBuy,
  onList,
  onCancel,
  isOwned = false,
  isListed = false,
}: NFTCardProps) {
  const { address } = useAccount();
  const isOwnListing = address?.toLowerCase() === listing.seller.toLowerCase();

  const handleBuy = () => {
    if (onBuy) {
      onBuy(listing);
    }
  };

  return (
    <Card variant="neu" className="overflow-hidden hover-lift group">
      {/* NFT Image */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={listing.nft?.metadata.image || "/placeholder-nft.png"}
          alt={listing.nft?.metadata.name || `NFT #${listing.tokenId}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {isListed && (
          <div className="absolute top-2 right-2 glass-card px-2 py-1 text-xs font-medium">
            Listed
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* NFT Name */}
        <h3 className="text-lg font-semibold mb-1">
          {listing.nft?.metadata.name || `NFT #${listing.tokenId}`}
        </h3>
        
        {/* NFT Description */}
        {listing.nft?.metadata.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {shortenText(listing.nft.metadata.description, 60)}
          </p>
        )}

        {/* Price */}
        {listing.isActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(listing.price)} ETH
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        {/* Buy Button */}
        {listing.isActive && !isOwnListing && onBuy && (
          <Button
            variant="default"
            className="flex-1"
            onClick={handleBuy}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy Now
          </Button>
        )}

        {/* List Button */}
        {isOwned && !isListed && onList && (
          <Button
            variant="default"
            className="flex-1"
            onClick={() => onList(listing.tokenId)}
          >
            <Tag className="h-4 w-4 mr-2" />
            List NFT
          </Button>
        )}

        {/* Cancel Listing Button */}
        {isListed && isOwnListing && onCancel && (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onCancel(listing.tokenId)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel Listing
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

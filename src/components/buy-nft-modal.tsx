"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useNFTData } from "@/providers/nft-data-provider";
import { formatPrice } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { toast } from "sonner";

interface BuyNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: bigint;
  tokenId: bigint;
  price: bigint;
  nftName?: string;
  nftImage?: string;
}

export function BuyNFTModal({
  isOpen,
  onClose,
  listingId,
  tokenId,
  price,
  nftName,
  nftImage,
}: BuyNFTModalProps) {
  const { address } = useAccount();
  const { buyNFT, isPending } = useMarketplace();
  const { optimisticUpdateOwner, optimisticRemoveListing } = useNFTData();

  const handleBuy = async () => {
    if (!address) return;
    
    // Optimistic update with seller address
    optimisticRemoveListing(listingId, seller);
    optimisticUpdateOwner(tokenId, address, seller);
    
    // Execute transaction
    await buyNFT(listingId, price);
    toast.success("NFT purchased successfully! 🎉");
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase NFT</DialogTitle>
          <DialogDescription>
            Confirm your purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {nftImage && (
            <div className="aspect-square relative rounded-xl overflow-hidden">
              <img
                src={nftImage}
                alt={nftName || "NFT"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">NFT</span>
              <span className="font-medium">{nftName || `#${tokenId}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(price)} ETH
              </span>
            </div>
          </div>

          <div className="glass-card p-3 text-sm text-muted-foreground">
            This transaction will transfer the NFT to your wallet
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleBuy} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Purchasing...
              </>
            ) : (
              "Confirm Purchase"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

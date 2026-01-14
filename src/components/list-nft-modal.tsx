"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMarketplace, useIsApproved } from "@/hooks/use-marketplace";
import { useNFTData } from "@/providers/nft-data-provider";
import { parsePrice } from "@/lib/utils";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: bigint;
  nftName?: string;
  onSuccess?: () => void;
}

export function ListNFTModal({
  isOpen,
  onClose,
  tokenId,
  nftName,
  onSuccess,
}: ListNFTModalProps) {
  const [price, setPrice] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);
  const { address } = useAccount();
  const { isApproved } = useIsApproved(address);
  const { listNFT, approveMarketplace, isPending, isSuccess } = useMarketplace();
  const { optimisticAddListing } = useNFTData();

  // Update approval status
  useEffect(() => {
    setNeedsApproval(!isApproved);
  }, [isApproved]);

  // Handle successful approval - automatically list NFT
  useEffect(() => {
    if (isSuccess && needsApproval && price) {
      console.log("✅ Approval successful, now listing NFT...");
      setNeedsApproval(false);
      // Wait a bit for the blockchain state to update
      setTimeout(() => {
        handleListNFT();
      }, 1000);
    }
  }, [isSuccess, needsApproval, price]);

  // Handle successful listing
  useEffect(() => {
    if (isSuccess && !needsApproval && price) {
      console.log("✅ Listing successful!");
      toast.success("NFT listed successfully! 🎉");
      
      // Optimistic update
      optimisticAddListing(tokenId, parsePrice(price));
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      setPrice("");
    }
  }, [isSuccess, needsApproval, tokenId, price, optimisticAddListing, onSuccess, onClose]);

  const handleListNFT = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      console.log("📝 Listing NFT", tokenId.toString(), "for", price, "ETH");
      await listNFT(tokenId, price);
    } catch (error) {
      console.error("❌ Error in handleListNFT:", error);
      toast.error("Failed to list NFT: " + (error as Error).message);
    }
  };

  const handleApprove = async () => {
    try {
      console.log("🔐 Approving marketplace...");
      await approveMarketplace();
    } catch (error) {
      console.error("❌ Error in handleApprove:", error);
      toast.error("Failed to approve: " + (error as Error).message);
    }
  };

  const handleSubmit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (needsApproval) {
      await handleApprove();
    } else {
      await handleListNFT();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List NFT for Sale</DialogTitle>
          <DialogDescription>
            {nftName || `NFT #${tokenId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price (ETH)
            </label>
            <Input
              id="price"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isPending}
            />
          </div>

          {needsApproval && (
            <div className="glass-card p-3 text-sm">
              <p className="font-medium mb-1">⚠️ Approval Required</p>
              <p className="text-muted-foreground text-xs">
                You need to approve the marketplace contract first. This is a one-time action.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !price || parseFloat(price) <= 0}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {needsApproval ? "Approving..." : "Listing..."}
              </>
            ) : (
              <>{needsApproval ? "Approve & List" : "List NFT"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

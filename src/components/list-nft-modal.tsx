"use client";

import { useState } from "react";
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
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: bigint;
  nftName?: string;
}

export function ListNFTModal({
  isOpen,
  onClose,
  tokenId,
  nftName,
}: ListNFTModalProps) {
  const [price, setPrice] = useState("");
  const { address } = useAccount();
  const { isApproved } = useIsApproved(address);
  const { listNFT, approveMarketplace, isPending } = useMarketplace();

  const handleList = async () => {
    if (!price || parseFloat(price) <= 0) {
      return;
    }

    if (!isApproved) {
      await approveMarketplace();
      return;
    }

    await listNFT(tokenId, price);
    onClose();
    setPrice("");
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

          {!isApproved && (
            <div className="glass-card p-3 text-sm text-muted-foreground">
              You need to approve the marketplace contract first
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleList}
            disabled={isPending || !price || parseFloat(price) <= 0}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isApproved ? "Listing..." : "Approving..."}
              </>
            ) : (
              <>{isApproved ? "List NFT" : "Approve & List"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

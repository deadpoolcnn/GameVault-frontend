import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/lib/constants";
import { MARKETPLACE_ABI, GAME_ITEM_ABI } from "@/contracts/abis";
import { parsePrice } from "@/lib/utils";
import { toast } from "sonner";

export function useMarketplace() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // List NFT
  const listNFT = async (tokenId: bigint, price: string) => {
    try {
      const priceInWei = parsePrice(price);
      
      writeContract({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: "listNFT",
        args: [tokenId, priceInWei],
      });
      
      toast.success("Listing NFT...");
    } catch (error) {
      console.error("Error listing NFT:", error);
      toast.error("Failed to list NFT");
    }
  };

  // Buy NFT
  const buyNFT = async (tokenId: bigint, price: bigint) => {
    try {
      writeContract({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: "buyNFT",
        args: [tokenId],
        value: price,
      });
      
      toast.success("Purchasing NFT...");
    } catch (error) {
      console.error("Error buying NFT:", error);
      toast.error("Failed to purchase NFT");
    }
  };

  // Cancel listing
  const cancelListing = async (tokenId: bigint) => {
    try {
      writeContract({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: "cancelListing",
        args: [tokenId],
      });
      
      toast.success("Canceling listing...");
    } catch (error) {
      console.error("Error canceling listing:", error);
      toast.error("Failed to cancel listing");
    }
  };

  // Approve marketplace
  const approveMarketplace = async () => {
    try {
      writeContract({
        address: CONTRACTS.GAME_ITEM,
        abi: GAME_ITEM_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.MARKETPLACE, true],
      });
      
      toast.success("Approving marketplace...");
    } catch (error) {
      console.error("Error approving marketplace:", error);
      toast.error("Failed to approve marketplace");
    }
  };

  return {
    listNFT,
    buyNFT,
    cancelListing,
    approveMarketplace,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
  };
}

// Hook to get all listings
export function useGetListings() {
  const { data: tokenIds } = useReadContract({
    address: CONTRACTS.MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "getAllListings",
  });

  return { tokenIds: tokenIds as bigint[] | undefined };
}

// Hook to get a specific listing
export function useGetListing(tokenId: bigint) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "getListing",
    args: [tokenId],
  });

  return { listing: data, isLoading };
}

// Hook to check if marketplace is approved
export function useIsApproved(owner: string | undefined) {
  const { data: isApproved } = useReadContract({
    address: CONTRACTS.GAME_ITEM,
    abi: GAME_ITEM_ABI,
    functionName: "isApprovedForAll",
    args: owner ? [owner as `0x${string}`, CONTRACTS.MARKETPLACE] : undefined,
  });

  return { isApproved: isApproved as boolean | undefined };
}

// Hook to get NFT balance
export function useNFTBalance(owner: string | undefined) {
  const { data: balance } = useReadContract({
    address: CONTRACTS.GAME_ITEM,
    abi: GAME_ITEM_ABI,
    functionName: "balanceOf",
    args: owner ? [owner as `0x${string}`] : undefined,
  });

  return { balance: balance as bigint | undefined };
}

// Hook to get token URI
export function useTokenURI(tokenId: bigint) {
  const { data: tokenURI } = useReadContract({
    address: CONTRACTS.GAME_ITEM,
    abi: GAME_ITEM_ABI,
    functionName: "tokenURI",
    args: [tokenId],
  });

  return { tokenURI: tokenURI as string | undefined };
}

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/lib/constants";
import { MARKETPLACE_ABI, GAME_ITEM_ABI } from "@/contracts/abis";
import { parsePrice } from "@/lib/utils";
import { toast } from "sonner";

export function useMarketplace() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // List NFT
  const listNFT = async (tokenId: bigint, price: string) => {
    try {
      const priceInWei = parsePrice(price);
      
      console.log("🚀 Calling writeContractAsync for listItem...");
      console.log("📋 Parameters:", {
        nftContract: CONTRACTS.GAME_ITEM,
        tokenId: tokenId.toString(),
        price: priceInWei.toString()
      });
      
      const txHash = await writeContractAsync({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: "listItem",
        args: [CONTRACTS.GAME_ITEM, tokenId, priceInWei],
      });
      
      console.log("📝 Transaction sent:", txHash);
      toast.success("Listing NFT...");
    } catch (error) {
      console.error("Error listing NFT:", error);
      toast.error("Failed to list NFT");
      throw error;
    }
  };

  // Buy NFT
  const buyNFT = async (listingId: bigint, price: bigint) => {
    try {
      console.log("🚀 Calling writeContractAsync for buyItem...");
      console.log("📋 Parameters:", {
        listingId: listingId.toString(),
        value: price.toString()
      });
      
      const txHash = await writeContractAsync({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: "buyItem",
        args: [listingId],
        value: price,
      });
      
      console.log("💰 Transaction sent:", txHash);
      toast.success("Purchasing NFT...");
    } catch (error) {
      console.error("Error buying NFT:", error);
      toast.error("Failed to purchase NFT");
      throw error;
    }
  };

  // Cancel listing
  const cancelListing = async (listingId: bigint) => {
    try {
      console.log("🚀 Calling writeContractAsync for cancelListing...");
      console.log("📋 Parameters:", { listingId: listingId.toString() });
      
      const txHash = await writeContractAsync({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: "cancelListing",
        args: [listingId],
      });
      
      console.log("❌ Transaction sent:", txHash);
      toast.success("Canceling listing...");
    } catch (error) {
      console.error("Error canceling listing:", error);
      toast.error("Failed to cancel listing");
      throw error;
    }
  };

  // Approve marketplace
  const approveMarketplace = async () => {
    try {
      console.log("🚀 Calling writeContractAsync for approval...");
      const txHash = await writeContractAsync({
        address: CONTRACTS.GAME_ITEM,
        abi: GAME_ITEM_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.MARKETPLACE, true],
      });
      
      console.log("🔐 Approval transaction sent:", txHash);
      toast.success("Approving marketplace...");
    } catch (error) {
      console.error("Error approving marketplace:", error);
      toast.error("Failed to approve marketplace");
      throw error;
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
    functionName: "getActiveListings",
  });

  console.log("🔍 Active listings:", tokenIds);
  return { tokenIds: tokenIds as bigint[] | undefined };
}

// Hook to get a specific listing
export function useGetListing(listingId: bigint) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "getListing",
    args: [listingId],
  });

  console.log(`🔍 useGetListing(${listingId}):`, data);
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

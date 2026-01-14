"use client";

import { useEffect, useState } from "react";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { BuyNFTModal } from "@/components/buy-nft-modal";
import { useGetListings } from "@/hooks/use-marketplace";
import { Listing, NFTMetadata } from "@/types/nft";
import { CONTRACTS } from "@/lib/constants";
import { usePublicClient } from "wagmi";
import { GAME_ITEM_ABI, MARKETPLACE_ABI } from "@/contracts/abis";
import { resolveIPFS } from "@/lib/utils";
import { Store } from "lucide-react";

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const { tokenIds: listingIds } = useGetListings();
  const publicClient = usePublicClient();

  // Fetch listings data using wagmi's publicClient
  useEffect(() => {
    async function fetchListings() {
      if (!listingIds || listingIds.length === 0 || !publicClient) {
        console.log("No listing IDs from marketplace or no publicClient");
        setListings([]);
        setIsLoading(false);
        return;
      }

      console.log("📋 Fetching marketplace listings for IDs:", listingIds);
      setIsLoading(true);

      try {
        const listingsData: Listing[] = [];

        for (const listingId of listingIds) {
          try {
            console.log(`\n🔍 Fetching listing ${listingId} using publicClient...`);
            
            // Use wagmi's publicClient to read contract data - this handles ABI encoding correctly
            const listingData = await publicClient.readContract({
              address: CONTRACTS.MARKETPLACE,
              abi: MARKETPLACE_ABI,
              functionName: 'getListing',
              args: [listingId],
            }) as any;

            console.log(`📦 Listing ${listingId} raw data:`, listingData);

            // listingData is an object with named properties, not an array
            if (!listingData) {
              console.log(`❌ Invalid listing data for ${listingId}`);
              continue;
            }

            const seller = listingData.seller;
            const nftContract = listingData.nftContract;
            const tokenId = listingData.tokenId;
            const price = listingData.price;
            const isActive = listingData.active;

            console.log(`📋 Decoded listing ${listingId}:`, {
              seller,
              nftContract,
              tokenId: tokenId.toString(),
              price: price.toString(),
              isActive
            });

            if (!isActive || price === BigInt(0)) {
              console.log(`⚠️ Listing ${listingId} inactive or price 0`);
              continue;
            }

            // Get token URI using publicClient
            const tokenURI = await publicClient.readContract({
              address: nftContract as `0x${string}`,
              abi: GAME_ITEM_ABI,
              functionName: 'tokenURI',
              args: [tokenId],
            }) as string;

            console.log(`📝 Token URI for ${tokenId}:`, tokenURI);

            // Fetch metadata
            let metadata: NFTMetadata = {
              name: `Game Item #${tokenId}`,
              description: "NFT Game Item",
              image: "",
            };

            if (tokenURI) {
              try {
                const metadataUrl = resolveIPFS(tokenURI);
                const metadataResponse = await fetch(metadataUrl);
                if (metadataResponse.ok) {
                  metadata = await metadataResponse.json();
                  if (metadata.image) {
                    metadata.image = resolveIPFS(metadata.image);
                  }
                }
              } catch (e) {
                console.log("Failed to fetch metadata for token", tokenId);
              }
            }

            listingsData.push({
              listingId,
              tokenId,
              seller: seller as string,
              price,
              isActive: true,
              nft: {
                id: tokenId,
                owner: seller as string,
                tokenURI: tokenURI || "",
                metadata,
              },
            });

            console.log(`✅ Successfully loaded listing ${listingId}`);
          } catch (error) {
            console.error(`❌ Error fetching listing ${listingId}:`, error);
          }
        }

        console.log(`\n📊 Marketplace listings loaded: ${listingsData.length} items`, listingsData);
        setListings(listingsData);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchListings();
  }, [listingIds, publicClient]);

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
        listingId={buyModal.listingId}
        tokenId={buyModal.tokenId}
        price={buyModal.price}
        nftName={buyModal.nftName}
        nftImage={buyModal.nftImage}
      />
    </div>
  );
}

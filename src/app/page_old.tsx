"use client";

import { useEffect, useState } from "react";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { BuyNFTModal } from "@/components/buy-nft-modal";
import { useGetListings, useGetListing } from "@/hooks/use-marketplace";
import { Listing, NFTMetadata } from "@/types/nft";
import { CONTRACTS } from "@/lib/constants";
import { useReadContract } from "wagmi";
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

  // Fetch listings data using wagmi
  useEffect(() => {
    async function fetchListings() {
      if (!listingIds || listingIds.length === 0) {
        console.log("No listing IDs from marketplace");
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
            console.log(`\n🔍 Fetching listing ${listingId} using wagmi...`);
            
            // Use fetch with proper eth_call to get listing data
            // We need to do this in the useEffect, not in a hook
            const response = await fetch('https://sepolia-rollup.arbitrum.io/rpc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                  to: CONTRACTS.MARKETPLACE.toLowerCase(),
                  data: MARKETPLACE_ABI.find((item: any) => item.name === 'getListing' && item.type === 'function')
                    ? encodeFunctionData(listingId)
                    : '0x'
                }, 'latest'],
                id: 1
              })
            });

            const result = await response.json();
            console.log(`📦 Listing ${listingId} response:`, result);
            // Get listing details from marketplace
            const listingResult = await fetch(`https://sepolia-rollup.arbitrum.io/rpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: `listing-${listingId}`,
                method: 'eth_call',
                params: [{
                  to: CONTRACTS.MARKETPLACE,
                  data: `0x7365c0e6${listingId.toString(16).padStart(64, '0')}` // getListing(listingId)
                }, 'latest']
              })
            });

            const listingData = await listingResult.json();
            console.log(`📦 Raw listing data for ${listingId}:`, listingData);
            
            if (!listingData.result || listingData.result === '0x') {
              console.log(`❌ No data for listing ${listingId}`);
              continue;
            }

            // Decode listing: (address seller, address nftContract, uint256 tokenId, uint256 price, bool active)
            const hexData = listingData.result.slice(2);
            console.log(`🔍 Hex data length: ${hexData.length}, first 320 chars:`, hexData.slice(0, 320));
            
            const seller = '0x' + hexData.slice(24, 64);
            const nftContract = '0x' + hexData.slice(88, 128);
            const tokenId = BigInt('0x' + hexData.slice(128, 192));
            const price = BigInt('0x' + hexData.slice(192, 256));
            const isActive = parseInt(hexData.slice(256, 320), 16) === 1;

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

            console.log(`✅ Listing ${listingId}: tokenId=${tokenId}, seller=${seller}, price=${price}, active=${isActive}`);

            // Get token URI and metadata
            const uriResult = await fetch(`https://sepolia-rollup.arbitrum.io/rpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: `uri-${tokenId}`,
                method: 'eth_call',
                params: [{
                  to: nftContract,
                  data: `0xc87b56dd${tokenId.toString(16).padStart(64, '0')}` // tokenURI(tokenId)
                }, 'latest']
              })
            });

            const uriData = await uriResult.json();
            let uri = "";
            
            if (uriData.result && uriData.result !== '0x') {
              try {
                const hexString = uriData.result.slice(2);
                const offset = parseInt(hexString.slice(0, 64), 16);
                const length = parseInt(hexString.slice(64, 128), 16);
                const dataStart = 128;
                const dataEnd = dataStart + (length * 2);
                const uriHex = hexString.slice(dataStart, dataEnd);
                
                if (uriHex) {
                  uri = Buffer.from(uriHex, 'hex').toString('utf8');
                }
              } catch (e) {
                console.error(`Failed to decode URI for token ${tokenId}`);
              }
            }

            // Fetch metadata
            let metadata: NFTMetadata = {
              name: `Game Item #${tokenId}`,
              description: "NFT Game Item",
              image: "",
            };

            if (uri) {
              try {
                const metadataUrl = resolveIPFS(uri);
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
              seller,
              price,
              isActive: true,
              nft: {
                id: tokenId,
                owner: seller,
                tokenURI: uri,
                metadata,
              },
            });
          } catch (error) {
            console.error(`Error fetching listing ${listingId}:`, error);
          }
        }

        console.log("Marketplace listings loaded:", listingsData);
        setListings(listingsData);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchListings();
  }, [listingIds]);

  const handleBuy = (tokenId: bigint, price: bigint) => {
    const listing = listings.find((l) => l.tokenId === tokenId);
    if (!listing) {
      console.error("Listing not found for tokenId:", tokenId);
      return;
    }
    setBuyModal({
      isOpen: true,
      listingId: listing.listingId,
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
        listingId={buyModal.listingId}
        tokenId={buyModal.tokenId}
        price={buyModal.price}
        nftName={buyModal.nftName}
        nftImage={buyModal.nftImage}
      />
    </div>
  );
}

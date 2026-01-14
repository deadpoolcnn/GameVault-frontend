"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { NFTGrid, NFTGridSkeleton } from "@/components/nft-grid";
import { ListNFTModal } from "@/components/list-nft-modal";
import { useMarketplace, useNFTBalance, useGetListings } from "@/hooks/use-marketplace";
import { Listing, NFT, NFTMetadata } from "@/types/nft";
import { Wallet, AlertCircle } from "lucide-react";
import { CONTRACTS } from "@/lib/constants";
import { GAME_ITEM_ABI, MARKETPLACE_ABI } from "@/contracts/abis";
import { resolveIPFS } from "@/lib/utils";

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [myNFTs, setMyNFTs] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeListedTokenIds, setActiveListedTokenIds] = useState<Set<string>>(new Set());
  const [tokenIdToListingId, setTokenIdToListingId] = useState<Map<string, bigint>>(new Map());
  const [listModal, setListModal] = useState<{
    isOpen: boolean;
    tokenId: bigint;
    nftName?: string;
  }>({
    isOpen: false,
    tokenId: BigInt(0),
  });

  const { balance } = useNFTBalance(address);
  const { cancelListing } = useMarketplace();
  const { tokenIds: listingIds } = useGetListings();
  const publicClient = usePublicClient();
  
  // Get total supply to know how many NFTs exist
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.GAME_ITEM,
    abi: GAME_ITEM_ABI,
    functionName: "totalSupply",
  });

  // Check which tokenIds are already listed in the marketplace
  useEffect(() => {
    async function checkListedNFTs() {
      if (!listingIds || listingIds.length === 0 || !publicClient) {
        setActiveListedTokenIds(new Set());
        setTokenIdToListingId(new Map());
        return;
      }

      try {
        const listedTokenIds = new Set<string>();
        const mapping = new Map<string, bigint>();
        
        for (const listingId of listingIds) {
          try {
            const listingData = await publicClient.readContract({
              address: CONTRACTS.MARKETPLACE,
              abi: MARKETPLACE_ABI,
              functionName: 'getListing',
              args: [listingId],
            }) as any;

            if (listingData && listingData.active) {
              const tokenIdStr = listingData.tokenId.toString();
              listedTokenIds.add(tokenIdStr);
              mapping.set(tokenIdStr, listingId);
            }
          } catch (error) {
            console.error(`Error checking listing ${listingId}:`, error);
          }
        }

        console.log("🔍 Already listed tokenIds:", Array.from(listedTokenIds));
        console.log("🗺️ TokenId to ListingId mapping:", Array.from(mapping.entries()));
        setActiveListedTokenIds(listedTokenIds);
        setTokenIdToListingId(mapping);
      } catch (error) {
        console.error("Error checking listed NFTs:", error);
      }
    }

    checkListedNFTs();
  }, [listingIds, publicClient]);

  // Fetch user's NFTs
  useEffect(() => {
    async function fetchMyNFTs() {
      if (!address || !totalSupply || totalSupply === BigInt(0)) {
        setIsLoading(false);
        setMyNFTs([]);
        return;
      }

      setIsLoading(true);
      console.log("Fetching NFTs for", address, "total supply:", totalSupply.toString());

      try {
        const nfts: Listing[] = [];
        const total = Number(totalSupply);
        console.log(`Checking ${total} tokens (IDs 1 to ${total})`);
        
        // Check each tokenId to see if user owns it
        // Note: tokenId starts from 1, not 0
        for (let i = 1; i <= total; i++) {
          console.log(`Checking token ${i}...`);
          try {
            // Use wagmi to read owner directly from contract
            const ownerResult = await fetch(`https://sepolia-rollup.arbitrum.io/rpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: i,
                method: 'eth_call',
                params: [{
                  to: CONTRACTS.GAME_ITEM,
                  data: `0x6352211e${i.toString(16).padStart(64, '0')}` // ownerOf(tokenId)
                }, 'latest']
              })
            });

            const ownerData = await ownerResult.json();
            console.log(`Token ${i} owner response:`, ownerData);
            
            if (!ownerData.result || ownerData.result === '0x') {
              console.log(`Token ${i} has no owner or invalid result`);
              continue;
            }

            const owner = '0x' + ownerData.result.slice(-40);
            console.log(`Token ${i} owner: ${owner}, user: ${address}`);
            
            if (owner.toLowerCase() !== address.toLowerCase()) {
              console.log(`Token ${i} not owned by user`);
              continue;
            }

            console.log(`Token ${i} is owned by user`);

            // Get token URI
            const uriResult = await fetch(`https://sepolia-rollup.arbitrum.io/rpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: `uri-${i}`,
                method: 'eth_call',
                params: [{
                  to: CONTRACTS.GAME_ITEM,
                  data: `0xc87b56dd${i.toString(16).padStart(64, '0')}` // tokenURI(tokenId)
                }, 'latest']
              })
            });

            const uriData = await uriResult.json();
            let uri = "";
            
            if (uriData.result && uriData.result !== '0x') {
              try {
                // Decode ABI-encoded string
                const hexString = uriData.result.slice(2);
                
                // ABI encoding: first 32 bytes = offset, next 32 bytes = length, then data
                const offset = parseInt(hexString.slice(0, 64), 16);
                const length = parseInt(hexString.slice(64, 128), 16);
                const dataStart = 128;
                const dataEnd = dataStart + (length * 2);
                const uriHex = hexString.slice(dataStart, dataEnd);
                
                if (uriHex) {
                  uri = Buffer.from(uriHex, 'hex').toString('utf8');
                  console.log(`Token ${i} URI decoded:`, uri);
                }
              } catch (decodeError) {
                console.error(`Failed to decode URI for token ${i}:`, decodeError);
                // Try simple decode as fallback
                try {
                  const hexString = uriData.result.slice(2);
                  const decoded = Buffer.from(hexString, 'hex').toString('utf8');
                  const match = decoded.match(/(https?:\/\/[^\s\0]+|ipfs:\/\/[^\s\0]+|data:application\/json[^\0]*)/);
                  if (match) {
                    uri = match[0];
                    console.log(`Token ${i} URI fallback:`, uri);
                  }
                } catch (e) {
                  console.error(`Fallback decode also failed for token ${i}`);
                }
              }
            }

            console.log(`Token ${i} URI:`, uri);

            // Fetch metadata
            let metadata: NFTMetadata = {
              name: `Game Item #${i}`,
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
                console.log("Failed to fetch metadata for token", i, e);
              }
            }

            nfts.push({
              listingId: tokenIdToListingId.get(i.toString()) || BigInt(0),
              tokenId: BigInt(i),
              seller: address,
              price: BigInt(0),
              isActive: activeListedTokenIds.has(i.toString()), // Check if already listed
              nft: {
                id: BigInt(i),
                owner: address,
                tokenURI: uri,
                metadata,
              },
            });
          } catch (error) {
            console.error(`Error fetching token ${i}:`, error);
            // Don't skip - continue to next token
          }
        }
        
        console.log(`Finished checking all tokens. Found ${nfts.length} NFTs owned by user`);
        setMyNFTs(nfts);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyNFTs();
  }, [address, totalSupply, activeListedTokenIds, tokenIdToListingId]);

  const handleList = (tokenId: bigint) => {
    const nft = myNFTs.find((n) => n.tokenId === tokenId);
    setListModal({
      isOpen: true,
      tokenId,
      nftName: nft?.nft?.metadata.name,
    });
  };

  const handleCancel = async (tokenId: bigint) => {
    const listingId = tokenIdToListingId.get(tokenId.toString());
    if (!listingId) {
      console.error("No listing ID found for tokenId:", tokenId);
      return;
    }
    console.log(`🗑️ Canceling listing ${listingId} for token ${tokenId}`);
    await cancelListing(listingId);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="neu-card p-6">
          <Wallet className="h-16 w-16 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please connect your wallet to view your NFT collection
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">My NFTs</h1>
        <p className="text-muted-foreground">
          Manage your NFT collection and listings
        </p>
      </div>

      {/* Balance Info */}
      {balance !== undefined && (
        <div className="glass-card p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <span className="text-sm">
            You own <strong>{balance.toString()}</strong> NFT{balance !== BigInt(1) ? "s" : ""}
          </span>
        </div>
      )}

      {/* NFTs Grid */}
      <div>
        {isLoading ? (
          <NFTGridSkeleton count={6} />
        ) : (
          <NFTGrid
            listings={myNFTs}
            onList={handleList}
            onCancel={handleCancel}
            showOwnerActions={true}
            emptyMessage="You don't own any NFTs yet"
          />
        )}
      </div>

      {/* List Modal */}
      <ListNFTModal
        isOpen={listModal.isOpen}
        onClose={() => setListModal({ ...listModal, isOpen: false })}
        tokenId={listModal.tokenId}
        nftName={listModal.nftName}
      />
    </div>
  );
}

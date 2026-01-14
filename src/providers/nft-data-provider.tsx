"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACTS } from "@/lib/constants";
import { GAME_ITEM_ABI, MARKETPLACE_ABI } from "@/contracts/abis";
import { Listing, NFTMetadata } from "@/types/nft";
import { resolveIPFS } from "@/lib/utils";

interface NFTDataContextType {
  // Marketplace data
  marketplaceListings: Listing[];
  isLoadingMarketplace: boolean;
  refreshMarketplace: () => Promise<void>;
  
  // User NFTs data
  userNFTs: Map<string, Listing[]>; // address -> NFTs
  isLoadingUserNFTs: boolean;
  refreshUserNFTs: (address: string) => Promise<void>;
  
  // Active listings mapping
  activeListings: Map<string, bigint>; // tokenId -> listingId
  refreshActiveListings: () => Promise<void>;
  
  // Update functions for optimistic updates
  optimisticAddListing: (tokenId: bigint, price: bigint) => void;
  optimisticRemoveListing: (listingId: bigint) => void;
  optimisticUpdateOwner: (tokenId: bigint, newOwner: string) => void;
}

const NFTDataContext = createContext<NFTDataContextType | undefined>(undefined);

export function NFTDataProvider({ children }: { children: React.ReactNode }) {
  const [marketplaceListings, setMarketplaceListings] = useState<Listing[]>([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  const [userNFTs, setUserNFTs] = useState<Map<string, Listing[]>>(new Map());
  const [isLoadingUserNFTs, setIsLoadingUserNFTs] = useState(false);
  const [activeListings, setActiveListings] = useState<Map<string, bigint>>(new Map());
  const [lastMarketplaceRefresh, setLastMarketplaceRefresh] = useState<number>(0);
  const [lastUserNFTsRefresh, setLastUserNFTsRefresh] = useState<Map<string, number>>(new Map());
  
  // 元数据缓存：避免重复请求 IPFS
  const metadataCache = useRef<Map<string, NFTMetadata>>(new Map());
  
  const publicClient = usePublicClient();

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30000;

  // 带缓存和超时的元数据获取
  const fetchMetadataWithCache = useCallback(async (tokenURI: string, tokenId: number): Promise<NFTMetadata> => {
    // 检查缓存
    if (metadataCache.current.has(tokenURI)) {
      console.log(`📦 Using cached metadata for token ${tokenId}`);
      return metadataCache.current.get(tokenURI)!;
    }

    const defaultMetadata: NFTMetadata = {
      name: `Game Item #${tokenId}`,
      description: "NFT Game Item",
      image: "",
    };

    if (!tokenURI) return defaultMetadata;

    try {
      const metadataUrl = resolveIPFS(tokenURI);
      
      // 设置 3 秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const metadataResponse = await fetch(metadataUrl, {
        signal: controller.signal,
        cache: 'force-cache' // 浏览器缓存
      });
      
      clearTimeout(timeoutId);
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        if (metadata.image) {
          metadata.image = resolveIPFS(metadata.image);
        }
        // 缓存成功的元数据
        metadataCache.current.set(tokenURI, metadata);
        return metadata;
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.log(`⏱️ Metadata fetch timeout for token ${tokenId}`);
      } else {
        console.log(`❌ Failed to fetch metadata for token ${tokenId}`);
      }
    }
    
    return defaultMetadata;
  }, []);

  // Refresh active listings
  const refreshActiveListings = useCallback(async () => {
    if (!publicClient) return;

    try {
      const listingIds = await publicClient.readContract({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'getActiveListings',
      }) as bigint[];

      if (!listingIds || listingIds.length === 0) {
        setActiveListings(new Map());
        return;
      }

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
            mapping.set(listingData.tokenId.toString(), listingId);
          }
        } catch (error) {
          console.error(`Error fetching listing ${listingId}:`, error);
        }
      }

      setActiveListings(mapping);
    } catch (error) {
      console.error("Error refreshing active listings:", error);
    }
  }, [publicClient]);

  // Refresh marketplace listings
  const refreshMarketplace = useCallback(async (force: boolean = false) => {
    const now = Date.now();
    if (!force && now - lastMarketplaceRefresh < CACHE_DURATION) {
      console.log("📦 Using cached marketplace data");
      return;
    }

    if (!publicClient || isLoadingMarketplace) return;

    setIsLoadingMarketplace(true);
    console.log("🔄 Refreshing marketplace listings...");

    try {
      const listingIds = await publicClient.readContract({
        address: CONTRACTS.MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'getActiveListings',
      }) as bigint[];

      if (!listingIds || listingIds.length === 0) {
        setMarketplaceListings([]);
        setIsLoadingMarketplace(false);
        setLastMarketplaceRefresh(now);
        return;
      }

      console.log(`📊 Processing ${listingIds.length} listings...`);
      const mapping = new Map<string, bigint>();

      // 第一步：并行获取所有 listing 数据和 tokenURI
      const listingDataPromises = listingIds.map(async (listingId) => {
        try {
          const listingData = await publicClient.readContract({
            address: CONTRACTS.MARKETPLACE,
            abi: MARKETPLACE_ABI,
            functionName: 'getListing',
            args: [listingId],
          }) as any;

          if (!listingData || !listingData.active) return null;

          const { seller, nftContract, tokenId, price } = listingData;
          mapping.set(tokenId.toString(), listingId);

          const tokenURI = await publicClient.readContract({
            address: nftContract as `0x${string}`,
            abi: GAME_ITEM_ABI,
            functionName: 'tokenURI',
            args: [tokenId],
          }) as string;

          return { listingId, seller, nftContract, tokenId, price, tokenURI };
        } catch (error) {
          console.error(`Error fetching listing ${listingId}:`, error);
          return null;
        }
      });

      const listingsBasicData = (await Promise.all(listingDataPromises)).filter(Boolean);

      // 第二步：并行获取元数据（使用缓存）
      console.log(`🌐 Fetching metadata for ${listingsBasicData.length} listings...`);
      const listingsWithMetadata = await Promise.all(
        listingsBasicData.map(async (listing) => {
          if (!listing) return null;

          const metadata = await fetchMetadataWithCache(listing.tokenURI || '', Number(listing.tokenId));

          const listingData: Listing = {
            listingId: listing.listingId,
            tokenId: listing.tokenId,
            seller: listing.seller as string,
            price: listing.price,
            isActive: true,
            nft: {
              tokenId: listing.tokenId,
              owner: listing.seller as string,
              tokenURI: listing.tokenURI || "",
              metadata,
            },
          };
          return listingData;
        })
      );

      const listingsData = listingsWithMetadata.filter((l) => l !== null) as Listing[];

      setMarketplaceListings(listingsData);
      setActiveListings(mapping);
      setLastMarketplaceRefresh(now);
      console.log(`✅ Marketplace refreshed: ${listingsData.length} listings`);
    } catch (error) {
      console.error("Error refreshing marketplace:", error);
    } finally {
      setIsLoadingMarketplace(false);
    }
  }, [publicClient, isLoadingMarketplace, lastMarketplaceRefresh, fetchMetadataWithCache]);

  // Refresh user NFTs
  const refreshUserNFTs = useCallback(async (address: string, force: boolean = false) => {
    const now = Date.now();
    const lastRefresh = lastUserNFTsRefresh.get(address) || 0;
    
    if (!force && now - lastRefresh < CACHE_DURATION) {
      console.log("📦 Using cached user NFTs data");
      return;
    }

    if (!publicClient || isLoadingUserNFTs) return;

    setIsLoadingUserNFTs(true);
    console.log(`🔄 Refreshing NFTs for ${address}...`);

    try {
      const totalSupply = await publicClient.readContract({
        address: CONTRACTS.GAME_ITEM,
        abi: GAME_ITEM_ABI,
        functionName: "totalSupply",
      }) as bigint;

      if (!totalSupply || totalSupply === BigInt(0)) {
        setUserNFTs(prev => new Map(prev).set(address, []));
        setIsLoadingUserNFTs(false);
        return;
      }

      const total = Number(totalSupply);

      // 第一步：快速获取用户拥有的 tokenIds（链上调用）
      console.log(`📊 Checking ${total} tokens for ownership...`);
      const ownershipPromises = [];
      for (let i = 1; i <= total; i++) {
        ownershipPromises.push(
          publicClient.readContract({
            address: CONTRACTS.GAME_ITEM,
            abi: GAME_ITEM_ABI,
            functionName: 'ownerOf',
            args: [BigInt(i)],
          }).then(owner => ({ tokenId: i, owner: owner as string }))
          .catch(() => ({ tokenId: i, owner: null }))
        );
      }

      const ownerships = await Promise.all(ownershipPromises);
      const userTokenIds = ownerships
        .filter(({ owner }) => owner?.toLowerCase() === address.toLowerCase())
        .map(({ tokenId }) => tokenId);

      console.log(`✅ User owns ${userTokenIds.length} NFTs`);

      if (userTokenIds.length === 0) {
        setUserNFTs(prev => new Map(prev).set(address, []));
        setIsLoadingUserNFTs(false);
        setLastUserNFTsRefresh(prev => new Map(prev).set(address, Date.now()));
        return;
      }

      // 第二步：并行获取 tokenURI（链上调用）
      const tokenURIPromises = userTokenIds.map(tokenId =>
        publicClient.readContract({
          address: CONTRACTS.GAME_ITEM,
          abi: GAME_ITEM_ABI,
          functionName: 'tokenURI',
          args: [BigInt(tokenId)],
        }).then(uri => ({ tokenId, tokenURI: uri as string }))
        .catch(() => ({ tokenId, tokenURI: '' }))
      );

      const tokenURIs = await Promise.all(tokenURIPromises);
      
      // 第三步：并行获取元数据（IPFS 调用，有缓存）
      console.log(`🌐 Fetching metadata for ${tokenURIs.length} NFTs...`);
      
      const metadataPromises = tokenURIs.map(async ({ tokenId, tokenURI }) => {
        const metadata = await fetchMetadataWithCache(tokenURI, tokenId);
        
        const listingId = activeListings.get(tokenId.toString()) || BigInt(0);
        const isListed = activeListings.has(tokenId.toString());

        // 如果已上架，获取真实价格
        let price = BigInt(0);
        if (isListed && listingId) {
          try {
            const listingData = await publicClient.readContract({
              address: CONTRACTS.MARKETPLACE,
              abi: MARKETPLACE_ABI,
              functionName: 'getListing',
              args: [listingId],
            }) as any;
            
            if (listingData && listingData.active) {
              price = listingData.price;
            }
          } catch (error) {
            console.error(`Error fetching listing price for token ${tokenId}:`, error);
          }
        }

        return {
          listingId,
          tokenId: BigInt(tokenId),
          seller: address,
          price,
          isActive: isListed,
          nft: {
            tokenId: BigInt(tokenId),
            owner: address,
            tokenURI: tokenURI || "",
            metadata,
          },
        };
      });

      const nfts = await Promise.all(metadataPromises);

      setUserNFTs(prev => new Map(prev).set(address, nfts));
      setLastUserNFTsRefresh(prev => new Map(prev).set(address, now));
      console.log(`✅ User NFTs refreshed: ${nfts.length} NFTs`);
    } catch (error) {
      console.error("Error refreshing user NFTs:", error);
    } finally {
      setIsLoadingUserNFTs(false);
    }
  }, [publicClient, isLoadingUserNFTs, activeListings, lastUserNFTsRefresh, fetchMetadataWithCache]);

  // Optimistic updates
  const optimisticAddListing = useCallback((tokenId: bigint, price: bigint) => {
    console.log("⚡ Optimistic: Adding listing for token", tokenId.toString());
    // Update active listings
    setActiveListings(prev => {
      const newMap = new Map(prev);
      // We don't know the listingId yet, so we'll refresh soon
      return newMap;
    });
    
    // Schedule a refresh after a short delay
    setTimeout(() => {
      refreshMarketplace(true);
      refreshActiveListings();
    }, 2000);
  }, [refreshMarketplace, refreshActiveListings]);

  const optimisticRemoveListing = useCallback((listingId: bigint) => {
    console.log("⚡ Optimistic: Removing listing", listingId.toString());
    
    // Remove from marketplace
    setMarketplaceListings(prev => 
      prev.filter(listing => listing.listingId !== listingId)
    );
    
    // Update active listings
    setActiveListings(prev => {
      const newMap = new Map(prev);
      for (const [tokenId, lId] of newMap.entries()) {
        if (lId === listingId) {
          newMap.delete(tokenId);
          break;
        }
      }
      return newMap;
    });
    
    // Schedule a refresh
    setTimeout(() => {
      refreshActiveListings();
    }, 2000);
  }, [refreshActiveListings]);

  const optimisticUpdateOwner = useCallback((tokenId: bigint, newOwner: string) => {
    console.log("⚡ Optimistic: Updating owner for token", tokenId.toString(), "to", newOwner);
    
    // Remove from marketplace (item was purchased)
    setMarketplaceListings(prev => 
      prev.filter(listing => listing.tokenId !== tokenId)
    );
    
    // Schedule a full refresh
    setTimeout(() => {
      refreshMarketplace(true);
      refreshActiveListings();
    }, 2000);
  }, [refreshMarketplace, refreshActiveListings]);

  // Auto-refresh active listings when publicClient is ready
  useEffect(() => {
    if (publicClient) {
      refreshActiveListings();
    }
  }, [publicClient, refreshActiveListings]);

  const value: NFTDataContextType = {
    marketplaceListings,
    isLoadingMarketplace,
    refreshMarketplace: () => refreshMarketplace(true),
    userNFTs,
    isLoadingUserNFTs,
    refreshUserNFTs: (address: string) => refreshUserNFTs(address, true),
    activeListings,
    refreshActiveListings,
    optimisticAddListing,
    optimisticRemoveListing,
    optimisticUpdateOwner,
  };

  return (
    <NFTDataContext.Provider value={value}>
      {children}
    </NFTDataContext.Provider>
  );
}

export function useNFTData() {
  const context = useContext(NFTDataContext);
  if (!context) {
    throw new Error("useNFTData must be used within NFTDataProvider");
  }
  return context;
}

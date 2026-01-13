import { create } from "zustand";
import { NFT, Listing } from "@/types/nft";

interface NFTStore {
  listings: Listing[];
  myNFTs: NFT[];
  isLoading: boolean;
  error: string | null;
  setListings: (listings: Listing[]) => void;
  setMyNFTs: (nfts: NFT[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addListing: (listing: Listing) => void;
  removeListing: (tokenId: bigint) => void;
  updateListing: (tokenId: bigint, updates: Partial<Listing>) => void;
}

export const useNFTStore = create<NFTStore>((set) => ({
  listings: [],
  myNFTs: [],
  isLoading: false,
  error: null,
  setListings: (listings) => set({ listings }),
  setMyNFTs: (nfts) => set({ myNFTs: nfts }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addListing: (listing) =>
    set((state) => ({ listings: [...state.listings, listing] })),
  removeListing: (tokenId) =>
    set((state) => ({
      listings: state.listings.filter((l) => l.tokenId !== tokenId),
    })),
  updateListing: (tokenId, updates) =>
    set((state) => ({
      listings: state.listings.map((l) =>
        l.tokenId === tokenId ? { ...l, ...updates } : l
      ),
    })),
}));

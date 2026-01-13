export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface NFT {
  tokenId: bigint;
  owner: string;
  metadata: NFTMetadata;
  tokenURI: string;
}

export interface Listing {
  tokenId: bigint;
  seller: string;
  price: bigint;
  isActive: boolean;
  nft?: NFT;
}

export interface MarketplaceStats {
  totalListings: number;
  totalVolume: bigint;
  floorPrice: bigint;
}

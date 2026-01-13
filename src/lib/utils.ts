import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatPrice(price: bigint, decimals: number = 18): string {
  const value = Number(price) / Math.pow(10, decimals);
  return value.toFixed(4);
}

export function parsePrice(price: string, decimals: number = 18): bigint {
  const value = parseFloat(price);
  return BigInt(Math.floor(value * Math.pow(10, decimals)));
}

export function resolveIPFS(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

export function shortenText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

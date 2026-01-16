"use client";

import { useEffect, useState, useRef } from "react";
import { usePublicClient } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CONTRACTS } from "@/lib/constants";
import { MARKETPLACE_ABI, GAME_ITEM_ABI } from "@/contracts/abis";
import { formatPrice, shortenAddress } from "@/lib/utils";
import { Clock, ShoppingBag, Tag, X, TrendingUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: "listed" | "purchased" | "cancelled";
  listingId?: bigint;
  tokenId: bigint;
  price?: bigint;
  seller?: string;
  buyer?: string;
  blockNumber: bigint;
  timestamp: number;
  txHash: string;
  nftName?: string;
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedBlock, setLastScannedBlock] = useState<bigint>(BigInt(0));
  const [mounted, setMounted] = useState(false);
  const publicClient = usePublicClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 在客户端加载缓存的数据
  useEffect(() => {
    setMounted(true);
    
    // 从localStorage加载永久保存的交易历史
    const cached = localStorage.getItem('transaction-history-permanent');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // 将BigInt字符串转换回BigInt
        const cachedTransactions = parsed.map((tx: any) => ({
          ...tx,
          listingId: tx.listingId ? BigInt(tx.listingId) : undefined,
          tokenId: BigInt(tx.tokenId),
          price: tx.price ? BigInt(tx.price) : undefined,
          blockNumber: BigInt(tx.blockNumber),
        }));
        setTransactions(cachedTransactions);
      } catch (e) {
        console.error('Failed to parse cached transactions:', e);
      }
    }
    
    // 加载上次扫描的区块号
    const saved = localStorage.getItem('last-scanned-block');
    if (saved) {
      try {
        setLastScannedBlock(BigInt(saved));
      } catch (e) {
        console.error('Failed to parse last scanned block:', e);
      }
    }
  }, []);

  // 获取历史交易（增量扫描模式）
  const fetchTransactions = async (forceFullScan: boolean = false) => {
    if (!publicClient) return;

    setIsLoading(true);
    console.log("🔄 Fetching transaction history...");

    try {
      // 获取当前区块
      const currentBlock = await publicClient.getBlockNumber();
      
      let fromBlock: bigint;
      
      if (forceFullScan || lastScannedBlock === BigInt(0)) {
        // 首次加载或强制全扫描：扫描最近500000个区块
        fromBlock = currentBlock > BigInt(500000) ? currentBlock - BigInt(500000) : BigInt(0);
        console.log(`📊 Full scan: blocks ${fromBlock.toString()} to ${currentBlock.toString()}`);
      } else {
        // 增量扫描：只扫描新区块
        fromBlock = lastScannedBlock + BigInt(1);
        console.log(`📊 Incremental scan: blocks ${fromBlock.toString()} to ${currentBlock.toString()}`);
      }
      
      // 如果没有新区块，直接返回
      if (fromBlock > currentBlock) {
        console.log("✅ Already up to date, no new blocks to scan");
        setIsLoading(false);
        return;
      }
      
      console.log(`📊 Scanning approximately ${(Number(currentBlock - fromBlock) / 1000).toFixed(1)}k blocks`);

      const newTransactions: Transaction[] = [];

      // 使用parseAbiItem来正确解析事件
      const itemListedEvent = {
        type: 'event',
        name: 'ItemListed',
        inputs: [
          { type: 'uint256', name: 'listingId', indexed: true },
          { type: 'address', name: 'seller', indexed: true },
          { type: 'address', name: 'nftContract', indexed: true },
          { type: 'uint256', name: 'tokenId' },
          { type: 'uint256', name: 'price' },
        ],
      } as const;

      const itemSoldEvent = {
        type: 'event',
        name: 'ItemSold',
        inputs: [
          { type: 'uint256', name: 'listingId', indexed: true },
          { type: 'address', name: 'buyer', indexed: true },
          { type: 'address', name: 'seller', indexed: true },
          { type: 'uint256', name: 'price' },
        ],
      } as const;

      const listingCancelledEvent = {
        type: 'event',
        name: 'ListingCancelled',
        inputs: [
          { type: 'uint256', name: 'listingId', indexed: true },
          { type: 'address', name: 'seller', indexed: true },
        ],
      } as const;

      // 获取 ItemListed 事件
      console.log("📝 Fetching ItemListed events...");
      const listedLogs = await publicClient.getLogs({
        address: CONTRACTS.MARKETPLACE,
        event: itemListedEvent,
        fromBlock,
        toBlock: currentBlock,
      });

      console.log(`Found ${listedLogs.length} ItemListed events`);
      for (const log of listedLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          
          // 获取NFT名称
          let nftName = `NFT #${log.args.tokenId!.toString()}`;
          try {
            const tokenURI = await publicClient.readContract({
              address: CONTRACTS.GAME_ITEM,
              abi: GAME_ITEM_ABI,
              functionName: 'tokenURI',
              args: [log.args.tokenId!],
            }) as string;
            
            if (tokenURI) {
              const metadataUrl = tokenURI.startsWith('ipfs://') 
                ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
                : tokenURI;
              const response = await fetch(metadataUrl);
              if (response.ok) {
                const metadata = await response.json();
                nftName = metadata.name || nftName;
              }
            }
          } catch (e) {
            // 使用默认名称
          }
          
          newTransactions.push({
            id: `listed-${log.transactionHash}-${log.logIndex}`,
            type: "listed",
            listingId: log.args.listingId!,
            tokenId: log.args.tokenId!,
            price: log.args.price!,
            seller: log.args.seller!,
            blockNumber: log.blockNumber,
            timestamp: Number(block.timestamp) * 1000,
            txHash: log.transactionHash,
            nftName,
          });
        } catch (error) {
          console.error("Error processing listed log:", error);
        }
      }

      // 获取 ItemSold 事件
      console.log("📝 Fetching ItemSold events...");
      const soldLogs = await publicClient.getLogs({
        address: CONTRACTS.MARKETPLACE,
        event: itemSoldEvent,
        fromBlock,
        toBlock: currentBlock,
      });

      console.log(`Found ${soldLogs.length} ItemSold events`);
      for (const log of soldLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          
          // 通过listingId获取listing信息来得到tokenId
          let tokenId = BigInt(0);
          let nftName = "NFT";
          try {
            const listing = await publicClient.readContract({
              address: CONTRACTS.MARKETPLACE,
              abi: MARKETPLACE_ABI,
              functionName: 'getListing',
              args: [log.args.listingId!],
            }) as any;
            
            tokenId = listing.tokenId;
            nftName = `NFT #${tokenId.toString()}`;
            
            // 获取NFT名称
            const tokenURI = await publicClient.readContract({
              address: CONTRACTS.GAME_ITEM,
              abi: GAME_ITEM_ABI,
              functionName: 'tokenURI',
              args: [tokenId],
            }) as string;
            
            if (tokenURI) {
              const metadataUrl = tokenURI.startsWith('ipfs://') 
                ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
                : tokenURI;
              const response = await fetch(metadataUrl);
              if (response.ok) {
                const metadata = await response.json();
                nftName = metadata.name || nftName;
              }
            }
          } catch (e) {
            console.error("Error fetching NFT name for sold item:", e);
          }
          
          newTransactions.push({
            id: `sold-${log.transactionHash}-${log.logIndex}`,
            type: "purchased",
            listingId: log.args.listingId!,
            tokenId,
            price: log.args.price!,
            buyer: log.args.buyer!,
            seller: log.args.seller!,
            blockNumber: log.blockNumber,
            timestamp: Number(block.timestamp) * 1000,
            txHash: log.transactionHash,
            nftName,
          });
        } catch (error) {
          console.error("Error processing sold log:", error);
        }
      }

      // 获取 ListingCancelled 事件
      console.log("📝 Fetching ListingCancelled events...");
      const cancelledLogs = await publicClient.getLogs({
        address: CONTRACTS.MARKETPLACE,
        event: listingCancelledEvent,
        fromBlock,
        toBlock: currentBlock,
      });

      console.log(`Found ${cancelledLogs.length} ListingCancelled events`);
      for (const log of cancelledLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          
          // 通过listingId获取listing信息来得到tokenId
          let tokenId = BigInt(0);
          let nftName = "NFT";
          try {
            const listing = await publicClient.readContract({
              address: CONTRACTS.MARKETPLACE,
              abi: MARKETPLACE_ABI,
              functionName: 'getListing',
              args: [log.args.listingId!],
            }) as any;
            
            tokenId = listing.tokenId;
            nftName = `NFT #${tokenId.toString()}`;
            
            // 获取NFT名称
            const tokenURI = await publicClient.readContract({
              address: CONTRACTS.GAME_ITEM,
              abi: GAME_ITEM_ABI,
              functionName: 'tokenURI',
              args: [tokenId],
            }) as string;
            
            if (tokenURI) {
              const metadataUrl = tokenURI.startsWith('ipfs://') 
                ? tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
                : tokenURI;
              const response = await fetch(metadataUrl);
              if (response.ok) {
                const metadata = await response.json();
                nftName = metadata.name || nftName;
              }
            }
          } catch (e) {
            console.error("Error fetching NFT name for cancelled item:", e);
          }
          
          newTransactions.push({
            id: `cancelled-${log.transactionHash}-${log.logIndex}`,
            type: "cancelled",
            listingId: log.args.listingId!,
            tokenId,
            seller: log.args.seller!,
            blockNumber: log.blockNumber,
            timestamp: Number(block.timestamp) * 1000,
            txHash: log.transactionHash,
            nftName,
          });
        } catch (error) {
          console.error("Error processing cancelled log:", error);
        }
      }

      console.log(`✅ Found ${newTransactions.length} new transactions`);
      
      // 合并新旧交易，去重（使用id作为唯一标识）
      const existingIds = new Set(transactions.map(tx => tx.id));
      const uniqueNewTransactions = newTransactions.filter(tx => !existingIds.has(tx.id));
      
      const allTransactions = [...transactions, ...uniqueNewTransactions];
      
      // 按时间戳倒序排序（最新的在前面）
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);

      setTransactions(allTransactions);
      setLastScannedBlock(currentBlock);
      setError(null);
      console.log(`✅ Total transactions: ${allTransactions.length} (${uniqueNewTransactions.length} new)`);
      
      // 永久保存到localStorage（将BigInt转换为字符串）
      try {
        const toCache = allTransactions.map(tx => ({
          ...tx,
          listingId: tx.listingId?.toString(),
          tokenId: tx.tokenId.toString(),
          price: tx.price?.toString(),
          blockNumber: tx.blockNumber.toString(),
        }));
        localStorage.setItem('transaction-history-permanent', JSON.stringify(toCache));
        localStorage.setItem('last-scanned-block', currentBlock.toString());
        localStorage.setItem('transaction-history-timestamp', Date.now().toString());
        console.log(`💾 Saved ${allTransactions.length} transactions to permanent storage`);
      } catch (e) {
        console.error('Failed to save transactions:', e);
      }

      // 滚动到顶部显示最新交易
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      }, 100);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError(error instanceof Error ? error.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // 清除缓存并重新全量扫描
  const resetAndRescan = async () => {
    localStorage.removeItem('transaction-history-permanent');
    localStorage.removeItem('last-scanned-block');
    localStorage.removeItem('transaction-history-timestamp');
    setTransactions([]);
    setLastScannedBlock(BigInt(0));
    await fetchTransactions(true);
  };

  // 初始加载 - 只在客户端挂载后且有 publicClient 时执行
  useEffect(() => {
    if (mounted && publicClient) {
      // 如果有缓存数据，不强制全扫描；如果没有，则全扫描
      fetchTransactions(transactions.length === 0 && lastScannedBlock === BigInt(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, publicClient]);

  // 每10分钟自动刷新
  useEffect(() => {
    if (!mounted || !publicClient) return;
    
    const interval = setInterval(() => {
      console.log("⏰ Auto-refreshing transaction history...");
      fetchTransactions(false);
    }, 10 * 60 * 1000); // 10分钟

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, publicClient]);

  const getTypeLabel = (type: Transaction["type"]) => {
    switch (type) {
      case "listed":
        return <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 text-xs font-medium">Listed</span>;
      case "purchased":
        return <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-xs font-medium">Purchased</span>;
      case "cancelled":
        return <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-xs font-medium">Cancelled</span>;
    }
  };

  return (
    <Card variant="neu">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Transaction History
          </div>
          <span className="text-xs font-normal text-muted-foreground">
            {transactions.length} transactions stored
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTransactions(false)}
              disabled={isLoading}
              title="Fetch new transactions"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAndRescan}
              disabled={isLoading}
              title="Clear cache and rescan"
              className="text-xs"
            >
              Reset
            </Button>
          </div>
        </CardTitle>
        {error && (
          <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded">
            ⚠️ {error}
          </div>
        )}
        {lastScannedBlock > BigInt(0) && (
          <div className="text-xs text-muted-foreground mt-2">
            📍 Last scanned block: {lastScannedBlock.toString()}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div 
              ref={scrollRef}
              className="max-h-[600px] overflow-y-auto scrollbar-thin"
            >
              <table className="w-full text-sm">
                <thead className="border-b border-border sticky top-0 bg-background z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">NFT</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Buyer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Seller</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {format(tx.timestamp, 'MMM dd, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(tx.timestamp, 'HH:mm:ss')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getTypeLabel(tx.type)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{tx.nftName || `NFT #${tx.tokenId.toString()}`}</span>
                          <a
                            href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View Tx →
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {tx.price ? (
                          <span className="font-bold text-primary">
                            {formatPrice(tx.price)} ETH
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {tx.buyer ? (
                          <a
                            href={`https://sepolia.arbiscan.io/address/${tx.buyer}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs hover:text-primary transition-colors"
                          >
                            {shortenAddress(tx.buyer)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {tx.seller ? (
                          <a
                            href={`https://sepolia.arbiscan.io/address/${tx.seller}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs hover:text-primary transition-colors"
                          >
                            {shortenAddress(tx.seller)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t space-y-1">
          <div>💾 All transactions are permanently stored locally</div>
          <div>🔄 New transactions are automatically fetched incrementally</div>
          <div>Auto-refreshes every 10 minutes • Click &quot;Reset&quot; to clear cache and rescan</div>
          {mounted && (() => {
            const cachedTime = localStorage.getItem('transaction-history-timestamp');
            if (cachedTime) {
              const diff = Date.now() - parseInt(cachedTime);
              const minutes = Math.floor(diff / 60000);
              if (minutes < 60) {
                return <div className="text-xs">Last updated: {minutes} minute{minutes !== 1 ? 's' : ''} ago</div>;
              } else {
                const hours = Math.floor(diff / 3600000);
                return <div className="text-xs">Last updated: {hours} hour{hours !== 1 ? 's' : ''} ago</div>;
              }
            }
            return null;
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

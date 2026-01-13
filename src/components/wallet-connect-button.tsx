"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="glass-card px-4 py-2 text-sm font-medium">
          {formatAddress(address)}
        </div>
        <Button
          variant="glass"
          size="icon"
          onClick={() => disconnect()}
          className="hover-lift"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="glass"
        onClick={() => setShowConnectors(!showConnectors)}
        className="hover-lift gap-2"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
        <ChevronDown className={cn("h-4 w-4 transition-transform", showConnectors && "rotate-180")} />
      </Button>
      
      {showConnectors && (
        <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[200px] z-50">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setShowConnectors(false);
              }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

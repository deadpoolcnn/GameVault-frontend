"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CONTRACTS } from "@/lib/constants";
import { GAME_ITEM_ABI } from "@/contracts/abis";
import { toast } from "sonner";
import { BsStars } from "react-icons/bs";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [tokenURI, setTokenURI] = useState("");
  const [mintTo, setMintTo] = useState("");
  
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Show success message when transaction is confirmed
  useEffect(() => {
    if (isSuccess) {
      toast.success("NFT minted successfully! 🎉");
      setTokenURI("");
      setMintTo("");
    }
  }, [isSuccess]);

  // Show error if write fails
  useEffect(() => {
    if (writeError) {
      console.error("Write error:", writeError);
      toast.error(writeError.message || "Failed to mint NFT");
    }
  }, [writeError]);

  const handleMint = async (itemName?: string) => {
    console.log("handleMint called with:", { tokenURI, address, mintTo, itemName });
    
    if (!tokenURI) {
      toast.error("Please enter a token URI");
      return;
    }

    const recipient = mintTo || address;
    if (!recipient) {
      toast.error("No recipient address");
      return;
    }

    try {
      // Using mintItem function with to, uri, itemName, category, rarity
      const name = itemName || "Game Item #" + Date.now();
      const category = 2; // GameCategory enum: 0=Weapon, 1=Armor, 2=Accessory
      const rarity = BigInt(3); // Rarity: 1=Common, 2=Rare, 3=Epic, 4=Legendary
      
      console.log("Calling writeContract with:", {
        address: CONTRACTS.GAME_ITEM,
        functionName: "mintItem",
        args: [recipient, tokenURI, name, category, rarity.toString()],
      });
      
      writeContract({
        address: CONTRACTS.GAME_ITEM,
        abi: GAME_ITEM_ABI,
        functionName: "mintItem",
        args: [recipient as `0x${string}`, tokenURI, name, category, rarity],
      });
      
      toast.info("Preparing transaction...");
    } catch (error) {
      console.error("Error minting NFT:", error);
      toast.error("Failed to mint NFT: " + (error as Error).message);
    }
  };

  // Quick mint with sample data
  const quickMint = (name: string, image: string, description: string) => {
    const metadata = {
      name,
      description,
      image,
      attributes: [
        { trait_type: "Rarity", value: "Legendary" },
        { trait_type: "Type", value: "Game Item" }
      ]
    };
    
    // In production, you'd upload this to IPFS
    // For demo, we'll use a data URI
    const dataURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
    console.log("Quick mint:", name, "URI:", dataURI);
    setTokenURI(dataURI);
    
    // Automatically trigger mint after setting URI
    setTimeout(() => handleMint(name), 100);
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Connect Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to access the admin panel
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="neu-card p-4">
            <BsStars className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Mint NFTs for your marketplace</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Quick Mint Options */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Quick Mint (Sample NFTs)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => quickMint(
                "Epic Sword",
                "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=400",
                "A legendary sword with mystical powers"
              )}
            >
              <span className="text-4xl">⚔️</span>
              <span>Epic Sword</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => quickMint(
                "Magic Shield",
                "https://images.unsplash.com/photo-1579869847514-7c1a19d2d2ad?w=400",
                "An indestructible shield blessed by ancient magic"
              )}
            >
              <span className="text-4xl">🛡️</span>
              <span>Magic Shield</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => quickMint(
                "Golden Crown",
                "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400",
                "A crown worn by the greatest warriors"
              )}
            >
              <span className="text-4xl">👑</span>
              <span>Golden Crown</span>
            </Button>
          </div>
        </Card>

        {/* Custom Mint Form */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Mint Custom NFT</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Token URI (JSON metadata)
              </label>
              <Input
                placeholder="ipfs://... or data:application/json..."
                value={tokenURI}
                onChange={(e) => setTokenURI(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mint to Address (optional, defaults to your address)
              </label>
              <Input
                placeholder="0x..."
                value={mintTo}
                onChange={(e) => setMintTo(e.target.value)}
              />
            </div>

            <Button
              onClick={handleMint}
              disabled={isPending || isConfirming || !tokenURI}
              className="w-full"
            >
              {isPending ? "Waiting for approval..." : isConfirming ? "Confirming..." : "Mint NFT"}
            </Button>

            {hash && (
              <div className="text-sm text-muted-foreground">
                Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 space-y-4 bg-primary/5">
          <h2 className="text-xl font-bold">Next Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Mint some NFTs using the buttons above</li>
            <li>Go to "My NFTs" page to see your minted NFTs</li>
            <li>Click "List for Sale" to put them on the marketplace</li>
            <li>Your NFTs will appear on the home page for others to buy</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

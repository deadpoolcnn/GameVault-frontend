"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnectButton } from "./wallet-connect-button";
import { ThemeToggle } from "./theme-toggle";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/", label: "Market" },
    { href: "/my-nfts", label: "My NFTs" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover-lift">
            <div className="neu-card p-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              GameVault
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                  pathname === item.href
                    ? "glass-button"
                    : "hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {mounted && <ThemeToggle />}
            <WalletConnectButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 text-center px-4 py-2 rounded-lg font-medium transition-all duration-200",
                pathname === item.href
                  ? "glass-button"
                  : "hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

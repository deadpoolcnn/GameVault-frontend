"use client";

import { BsSun, BsMoonStars } from "react-icons/bs";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="glass"
      size="icon"
      onClick={() => {
        console.log("Theme toggle clicked, current theme:", theme);
        toggleTheme();
      }}
      className="relative flex items-center justify-center"
      aria-label="Toggle theme"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{ padding: 0 }}
    >
      {theme === "dark" ? (
        <BsSun className="w-5 h-5" style={{ color: '#facc15', display: 'block' }} />
      ) : (
        <BsMoonStars className="w-5 h-5" style={{ color: '#60a5fa', display: 'block' }} />
      )}
    </Button>
  );
}

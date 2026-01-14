"use client";

import { Button } from "@/components/ui/button";
import { Gamepad2, Crosshair, Sword, Sparkles } from "lucide-react";

export type GameCategory = "ALL" | "MOBA" | "RPG" | "FPS" | "CARD";

interface CategoryFilterProps {
  selected: GameCategory;
  onChange: (category: GameCategory) => void;
}

const categories = [
  { value: "ALL" as GameCategory, label: "All Games", icon: Sparkles },
  { value: "MOBA" as GameCategory, label: "MOBA", icon: Gamepad2 },
  { value: "RPG" as GameCategory, label: "RPG", icon: Sword },
  { value: "FPS" as GameCategory, label: "FPS", icon: Crosshair },
  { value: "CARD" as GameCategory, label: "Card", icon: Gamepad2 },
];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 glass-card">
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selected === category.value;
        
        return (
          <Button
            key={category.value}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(category.value)}
            className={`gap-2 transition-all ${
              isSelected 
                ? "shadow-lg scale-105" 
                : "hover:scale-105"
            }`}
          >
            <Icon className="h-4 w-4" />
            {category.label}
          </Button>
        );
      })}
    </div>
  );
}

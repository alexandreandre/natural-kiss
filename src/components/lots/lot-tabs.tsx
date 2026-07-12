"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface LotTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Onglets de la fiche lot 360°. Les contenus sont rendus côté serveur puis
 * passés en props ; l'onglet inactif reste monté (masqué) pour conserver l'état
 * et éviter tout aller-retour réseau au changement d'onglet.
 */
export function LotTabs({ tabs }: { tabs: LotTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="border-border flex gap-1 overflow-x-auto border-b"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={tab.id !== active}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

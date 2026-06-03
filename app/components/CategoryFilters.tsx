"use client";

import type { MenuCategory } from "@/lib/types";

const filters: { id: MenuCategory; label: string; emoji?: string }[] = [
  { id: "all", label: "All" },
  { id: "starters", label: "Starters", emoji: "🥗" },
  { id: "mains", label: "Mains", emoji: "🍗" },
  { id: "drinks", label: "Drinks", emoji: "🥤" },
  { id: "desserts", label: "Desserts", emoji: "🍰" },
];

interface CategoryFiltersProps {
  active: MenuCategory;
  onChange: (category: MenuCategory) => void;
}

export function CategoryFilters({ active, onChange }: CategoryFiltersProps) {
  return (
    <div className="category-filters-bleed min-w-0">
      <nav
        aria-label="Menu categories"
        className="scrollbar-hide flex w-max min-w-full gap-3 px-margin-mobile py-4 md:w-full md:gap-4 md:px-0"
      >
      {filters.map((filter) => {
        const isActive = active === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            className={`flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold leading-snug shadow-sm transition-colors sm:min-h-12 sm:px-6 sm:text-base md:text-[17px] ${
              isActive
                ? "bg-primary text-on-primary"
                : "border border-surface-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline-variant hover:bg-surface-container"
            }`}
          >
            {filter.emoji && (
              <span className="text-xl leading-none sm:text-2xl" aria-hidden>
                {filter.emoji}
              </span>
            )}
            <span>{filter.label}</span>
          </button>
        );
      })}
      </nav>
    </div>
  );
}

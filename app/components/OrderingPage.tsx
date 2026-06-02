"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { CategoryFilters } from "@/app/components/CategoryFilters";
import { FoodCard } from "@/app/components/FoodCard";
import { fetchMenu } from "@/lib/api";
import type { MenuCategory, MenuItem } from "@/lib/types";

export function OrderingPage() {
  const [category, setCategory] = useState<MenuCategory>("all");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMenu = useCallback(async (cat: MenuCategory) => {
    setLoading(true);
    setLoadError(null);
    try {
      const menu = await fetchMenu(cat);
      setItems(menu);
    } catch {
      setLoadError("Could not load menu. Run npm run dev and try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu(category);
  }, [category, loadMenu]);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <Header showQrLink />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-margin-mobile pb-xl pt-[calc(var(--header-height)+20px)] md:px-margin-desktop lg:px-8">
        <section className="flex min-h-[calc(100dvh-var(--header-height)-36px)] flex-col">
          <CategoryFilters active={category} onChange={setCategory} />

          {loadError && (
            <p className="mt-lg rounded-lg border border-error bg-error-container px-md py-sm text-error">
              {loadError}
            </p>
          )}

          {loading ? (
            <p className="mt-lg text-on-surface-variant">Loading menu…</p>
          ) : (
            <div className="mt-lg grid grid-cols-2 gap-gutter content-start sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <FoodCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

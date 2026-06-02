"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { CategoryFilters } from "@/app/components/CategoryFilters";
import { FoodCard } from "@/app/components/FoodCard";
import { CartPanel } from "@/app/components/CartPanel";
import { fetchMenu } from "@/lib/api";
import type { MenuCategory, MenuItem } from "@/lib/types";

export function OrderingPage() {
  const [category, setCategory] = useState<MenuCategory>("all");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

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
      <Header onOpenMobileCart={() => setMobileCartOpen(true)} />

      <main className="flex w-full flex-1 gap-xl px-margin-mobile pb-lg pt-[calc(var(--header-height)+20px)] md:px-margin-desktop lg:gap-8">
        <section className="flex min-h-[calc(100dvh-var(--header-height)-36px)] min-w-0 flex-1 flex-col">
          <CategoryFilters active={category} onChange={setCategory} />

          {loadError && (
            <p className="mt-lg rounded-lg border border-error bg-error-container px-md py-sm text-error">
              {loadError}
            </p>
          )}

          {loading ? (
            <p className="mt-lg text-on-surface-variant">Loading menu…</p>
          ) : (
            <div className="mt-lg grid flex-1 grid-cols-2 gap-gutter content-start sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <FoodCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <aside className="hidden w-[400px] max-w-[32vw] shrink-0 lg:block">
          <div className="sticky top-[calc(var(--header-height)+20px)] h-[calc(100dvh-var(--header-height)-40px)]">
            <CartPanel className="h-full min-h-0" />
          </div>
        </aside>
      </main>

      {mobileCartOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 bg-primary/40"
            onClick={() => setMobileCartOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] p-margin-mobile">
            <CartPanel
              className="max-h-[85vh]"
              onClose={() => setMobileCartOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

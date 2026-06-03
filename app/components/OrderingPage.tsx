"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { CategoryFilters } from "@/app/components/CategoryFilters";
import { FoodCard } from "@/app/components/FoodCard";
import { ActiveOrderBanner } from "@/app/components/ActiveOrderBanner";
import { MenuCartPanel } from "@/app/components/MenuCartPanel";
import { MenuCheckoutBar } from "@/app/components/MenuCheckoutBar";
import { TableSessionBanner } from "@/app/components/TableSessionBanner";
import { useCart } from "@/app/context/CartContext";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
import { PageEnter } from "@/app/components/ui/PageEnter";
import { fetchMenu } from "@/lib/api";
import type { MenuCategory, MenuItem } from "@/lib/types";

export function OrderingPage() {
  const { itemCount } = useCart();
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
    <div className="flex min-h-dvh w-full max-w-full flex-col overflow-x-clip bg-background">
      <Header showTableBadge showOrderStatus />

      <main
        className={`page-main mx-auto flex w-full min-w-0 max-w-full flex-1 flex-col gap-xl overflow-x-clip px-margin-mobile pt-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] md:max-w-[1400px] md:px-margin-desktop lg:flex-row lg:gap-8 lg:px-8 ${
          itemCount > 0 ? "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0" : ""
        }`}
      >
        <section className="flex min-h-[calc(100dvh-var(--header-height)-36px)] min-w-0 flex-1 flex-col overflow-x-clip">
          <PageEnter className="flex flex-col">
            <TableSessionBanner />
            <ActiveOrderBanner />
            <CategoryFilters active={category} onChange={setCategory} />

            {loadError && (
              <p className="mt-lg rounded-lg border border-error bg-error-container px-md py-sm text-error">
                {loadError}
              </p>
            )}

            {loading ? (
              <LoadingBlock className="mt-xl py-xl" message="Loading menu…" />
            ) : (
              <div className="menu-grid-enter mt-lg grid min-w-0 grid-cols-2 gap-2 content-start sm:gap-gutter sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </PageEnter>
        </section>

        <aside className="hidden w-[var(--spacing-cart-width)] max-w-[32vw] shrink-0 lg:block">
          <div className="sticky top-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top,0px)-24px)]">
            <MenuCartPanel className="h-full min-h-0" />
          </div>
        </aside>
      </main>

      <MenuCheckoutBar />
    </div>
  );
}

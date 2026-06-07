"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CategoryFilters } from "@/components/CategoryFilters";
import { FoodCard } from "@/components/FoodCard";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import { MenuCheckoutBar } from "@/components/MenuCheckoutBar";
import { TableSessionBanner } from "@/components/TableSessionBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageEnter } from "@/components/ui/PageEnter";
import { fetchMenu } from "@/lib/client/api";
import type { MenuCategory, MenuItem } from "@/types";

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
    <div className="menu-page customer-page-shell flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-background">
      <Header showTableBadge showOrderStatus />

      <div className="menu-page-body flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <main className="menu-page-main customer-page-scroll page-main mx-auto flex w-full min-w-0 max-w-full flex-1 min-h-0 flex-col gap-xl px-margin-mobile pt-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] md:max-w-[1400px] md:px-margin-desktop lg:px-8">
          <section className="flex min-w-0 flex-1 flex-col">
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
                <div className="menu-grid menu-grid-enter mt-lg grid min-w-0 grid-cols-2 gap-2 content-start sm:gap-gutter sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </PageEnter>
          </section>
        </main>

        <MenuCheckoutBar />
      </div>
    </div>
  );
}

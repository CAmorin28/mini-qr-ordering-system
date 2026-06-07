import type { MenuCategory, MenuItem } from "@/types";

export const menuItems: MenuItem[] = [
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    price: 12,
    category: "starters",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAB8lyLU1zpvvTcsDkvGknCcyjyKGG93FZ80pvh6QLL6wzEYIxUHZpWGwstiitRy2ZDmYC-GzUeo8jjQUgcixGbsGRhR-I9gwQZbxWKvo_4BFqvnWT4Scl0ZcS4e0fVNbydhn8O4AMEMH88TvKv48x6P0__FWJVt90xFX2y2egC-wZTmVJFTlHKx5u6CSGG0eEHSjDAAiMrLJrGS5d0elmRZSwqOqAyQPAYk58Do6N0HE2U052yBn9g_jfDH34-lrJDgFKG7EnQtxk",
    emoji: null,
  },
  {
    id: "grilled-ribs",
    name: "Grilled Ribs",
    price: 35,
    category: "mains",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDuHw4XNHR9BNOFNQVdhA34r7DhEDBy0-0DtLbTiJ-NBNeUfw41U6yCqL3KksgHD_tp3P67TOlQDLtpUzwQOvFFTm5ncJE-GZ2KMtPfFavoqj7CxukL6R5G3MJge4CZDS8bNZxQ2xOpXWLhe33FPaq0wj6_Ud2p3DpBcXlmlQjeS8wrvugDta0IWsiSeT3vHWK9smBdzokf4IoYDEVBkr06BN0P3dz5jpdav8p0-uuQNl6usdclomN0SYs-NsM9SEnBfbbckx40PSY",
    emoji: null,
  },
  {
    id: "ramen-bowl",
    name: "Ramen Bowl",
    price: 22,
    category: "mains",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC14WIi9zFycO5TlAwGstf-Y15T8cC2hLu1loa9kILr3ty96DvNdxtSpQ2PhagnZUD5GCTqJC6Elu6WD-GE2ZmMZupnE37Kquq5Xcx-NR4uDGB4MyfDkLTF9susACcb04B7wVwnrLon_m8YXOXPouvQASpyT3xmWpMlJ-y86gV_eRaTlTkFuv6baFLaoVwzcYkrRSk7tySb5SljCl7D_MOij-n3rrUeWclWklbzeoQcaXC_zgi-ksGqNGwEuHH8wEyiRqc0zkW4B6I",
    emoji: null,
  },
  {
    id: "lemon-iced-tea",
    name: "Lemon Iced Tea",
    price: 6,
    category: "drinks",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDhYcBWOQkENz6ikkkBkkM235K29Dx5aGfyxRloBoE9tFVsiKHDkf_mm-nbm3x3g-_hDLC3zGim2gJF3TkalCp20sLR2AS3BZ8VZq5g_uL2pop5HMrBqEgrsg8qBPainxbNbKpWFqAmjWRbJC_i4roxrZ-9V9FOXcmDC8FKiPvWIMnfeNUiauLhITY7TFuSyUKxTuBN-t4tJr--QNQH0uJdmyBcwhNsUd5GXp1qlMFzxDMwSxOCykqPfz_U-BCuceXJ2XqGyQ-dick",
    emoji: null,
  },
  {
    id: "classic-burger",
    name: "Classic Burger",
    price: 18,
    category: "mains",
    imageUrl: null,
    emoji: "🍔",
  },
  {
    id: "french-fries",
    name: "French Fries",
    price: 9,
    category: "starters",
    imageUrl: null,
    emoji: "🍟",
  },
  {
    id: "chocolate-cake",
    name: "Chocolate Cake",
    price: 14,
    category: "desserts",
    imageUrl: null,
    emoji: "🍰",
  },
];

export const categoryLabels: Record<
  Exclude<MenuCategory, "all">,
  { label: string; emoji: string }
> = {
  starters: { label: "Starters", emoji: "🥗" },
  mains: { label: "Mains", emoji: "🍗" },
  drinks: { label: "Drinks", emoji: "🥤" },
  desserts: { label: "Desserts", emoji: "🍰" },
};

export function getMenuByCategory(category: MenuCategory = "all") {
  if (category === "all") return menuItems;
  return menuItems.filter((item) => item.category === category);
}

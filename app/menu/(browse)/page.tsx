import { OrderingPage } from "@/components/OrderingPage";
import { enforceGuestQrAccess } from "@/lib/server/guest-session-guard";

interface MenuPageProps {
  searchParams: Promise<{ table?: string }>;
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const params = await searchParams;
  await enforceGuestQrAccess({
    tableLetter: params.table,
    redirectIfMissing: true,
    bindTableToMenuUrl: true,
  });

  return <OrderingPage />;
}

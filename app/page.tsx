import { redirect } from "next/navigation";
import { MENU_PAGE_PATH } from "@/lib/menu-url";

/** QR codes and bookmarks should land on the menu directly. */
export default function Home() {
  redirect(MENU_PAGE_PATH);
}

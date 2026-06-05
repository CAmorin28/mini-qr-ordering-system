import { redirect } from "next/navigation";
import { TABLE_ENTER_PAGE_PATH } from "@/lib/menu-url";

/** Landing route — guests must scan a table QR to reach the menu. */
export default function Home() {
  redirect(TABLE_ENTER_PAGE_PATH);
}

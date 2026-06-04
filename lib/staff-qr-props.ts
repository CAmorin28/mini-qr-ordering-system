import QRCode from "qrcode";
import { menuUrlFromOrigin } from "@/lib/menu-url";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";
import { getSiteOrigin } from "@/lib/site-url";
import { normalizeTableLetter } from "@/lib/table-session";

export interface StaffQrPanelServerProps {
  initialTableLetter: string;
  serverMenuUrl: string;
  initialSvg: string;
}

/** Server-side props for the staff table QR panel. */
export async function loadStaffQrPanelProps(
  tableParam?: string | null,
): Promise<StaffQrPanelServerProps> {
  const tableLetter = normalizeTableLetter(tableParam) || "A";
  const origin = await getSiteOrigin();
  const menuUrl = menuUrlFromOrigin(origin, tableLetter);
  const initialSvg = await QRCode.toString(menuUrl, {
    type: "svg",
    margin: MENU_QR_MARGIN,
    width: MENU_QR_DISPLAY_WIDTH,
    color: MENU_QR_COLORS,
    errorCorrectionLevel: "M",
  });

  return {
    initialTableLetter: tableLetter,
    serverMenuUrl: menuUrl,
    initialSvg,
  };
}

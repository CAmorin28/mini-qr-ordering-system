import QRCode from "qrcode";
import { menuUrlFromOrigin } from "@/lib/shared/menu-url";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/shared/qr-code";
import { resolveScannableOriginFromRequest } from "@/lib/server/qr-origin.server";
import { normalizeTableLetter } from "@/lib/shared/table-session";

export interface StaffQrPanelServerProps {
  initialTableLetter: string;
  serverMenuUrl: string;
  initialSvg: string;
  scannableOrigin: string;
}

/** Server-side props for the staff table QR panel. */
export async function loadStaffQrPanelProps(
  tableParam?: string | null,
): Promise<StaffQrPanelServerProps> {
  const tableLetter = normalizeTableLetter(tableParam) || "A";
  const scannableOrigin = await resolveScannableOriginFromRequest();
  const menuUrl = menuUrlFromOrigin(scannableOrigin, tableLetter);
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
    scannableOrigin,
  };
}

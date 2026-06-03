"use client";

/** Fixed layout width for capture — avoids mobile viewport tiling / seams */
const CAPTURE_WIDTH_PX = 640;

const RECEIPT_CAPTURE_OVERRIDES = `
.receipt-card.receipt-card--capturing {
  color: #1a1c19 !important;
  background-color: #ffffff !important;
  border-color: #e2e3de !important;
  box-shadow: none !important;
  overflow: visible !important;
}
.receipt-card.receipt-card--capturing [class*="text-on-surface-variant"] {
  color: #47464d !important;
}
.receipt-card.receipt-card--capturing [class*="text-on-surface"]:not([class*="variant"]) {
  color: #1a1c19 !important;
}
.receipt-card.receipt-card--capturing [class*="text-secondary"] {
  color: #9b4500 !important;
}
.receipt-card.receipt-card--capturing [class*="bg-secondary-container"] {
  background-color: #fc8a40 !important;
}
.receipt-card.receipt-card--capturing [class*="border-surface-variant"] {
  border-color: #e2e3de !important;
}
.receipt-card.receipt-card--capturing th,
.receipt-card.receipt-card--capturing td {
  color: inherit !important;
  border-color: #e2e3de !important;
}
.receipt-card.receipt-card--capturing .receipt-line-items {
  display: none !important;
}
.receipt-card.receipt-card--capturing .receipt-table-wrap {
  display: block !important;
  overflow: visible !important;
}
`;

function injectCaptureStyles(doc: Document): void {
  const style = doc.createElement("style");
  style.setAttribute("data-receipt-capture", "true");
  style.textContent = RECEIPT_CAPTURE_OVERRIDES;
  doc.head.appendChild(style);
}

/**
 * Clone receipt off-screen at a stable width so html2canvas does not tile the
 * mobile viewport (black seams / duplicated rows at slice boundaries).
 */
async function captureReceiptCanvas(source: HTMLElement): Promise<HTMLCanvasElement> {
  const captureId = "order-receipt-pdf-capture";
  const scrollY = window.scrollY;

  const wrapper = document.createElement("div");
  wrapper.id = "receipt-pdf-capture-root";
  wrapper.setAttribute("aria-hidden", "true");
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${CAPTURE_WIDTH_PX}px`,
    margin: "0",
    padding: "0",
    background: "#ffffff",
    zIndex: "-1",
    pointerEvents: "none",
    opacity: "0",
    overflow: "visible",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = captureId;
  clone.classList.add("receipt-card--capturing");
  clone.style.width = "100%";
  clone.style.maxWidth = "100%";
  clone.style.boxShadow = "none";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  try {
    const { default: html2canvas } = await import("html2canvas-pro");

    const width = Math.ceil(clone.scrollWidth) || CAPTURE_WIDTH_PX;
    const height = Math.ceil(clone.scrollHeight);
    const scale = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5));

    return await html2canvas(clone, {
      scale,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15_000,
      onclone: (doc) => {
        const cloned = doc.getElementById(captureId);
        if (cloned) {
          cloned.classList.add("receipt-card--capturing");
        }
        injectCaptureStyles(doc);
      },
    });
  } finally {
    wrapper.remove();
    window.scrollTo(0, scrollY);
  }
}

/** Fit receipt image on one A4 page (scale down if needed — no slice seams). */
function addReceiptImageToPdf(
  doc: import("jspdf").jsPDF,
  imgData: string,
  canvas: HTMLCanvasElement,
  margin: number,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const pageContentHeight = pageHeight - margin * 2;

  let drawWidth = contentWidth;
  let drawHeight = (canvas.height * drawWidth) / canvas.width;

  if (drawHeight > pageContentHeight) {
    const fit = pageContentHeight / drawHeight;
    drawWidth *= fit;
    drawHeight = pageContentHeight;
  }

  const x = margin + (contentWidth - drawWidth) / 2;
  doc.addImage(imgData, "JPEG", x, margin, drawWidth, drawHeight);
}

/**
 * Renders the on-screen OrderReceipt into a PDF (mobile + desktop).
 */
export async function downloadReceiptPdf(
  receiptElementId: string,
  filename: string,
): Promise<void> {
  const element = document.getElementById(receiptElementId);
  if (!element) {
    throw new Error("Receipt not found. Refresh the page and try again.");
  }

  element.classList.add("receipt-card--capturing");

  try {
    const canvas = await captureReceiptCanvas(element);
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

    addReceiptImageToPdf(doc, imgData, canvas, 40);
    doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    element.classList.remove("receipt-card--capturing");
  }
}

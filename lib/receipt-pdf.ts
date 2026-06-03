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
  height: auto !important;
  min-height: 0 !important;
  padding-bottom: 28px !important;
}
.receipt-card.receipt-card--capturing .receipt-brand-bar {
  margin: 0 0 12px 0 !important;
  border-radius: 12px !important;
  background-color: #05051b !important;
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
.receipt-card.receipt-card--capturing .receipt-footer {
  display: block !important;
}
#receipt-pdf-capture-root {
  overflow: visible !important;
  height: auto !important;
}
`;

function injectCaptureStyles(doc: Document): void {
  const style = doc.createElement("style");
  style.setAttribute("data-receipt-capture", "true");
  style.textContent = RECEIPT_CAPTURE_OVERRIDES;
  doc.head.appendChild(style);
}

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

function measureElementHeight(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  return Math.ceil(
    Math.max(el.scrollHeight, el.offsetHeight, rect.height, el.clientHeight),
  );
}

/**
 * Clone receipt off-screen at a stable width so html2canvas captures the full height.
 */
async function captureReceiptCanvas(source: HTMLElement): Promise<HTMLCanvasElement> {
  const captureId = "order-receipt-pdf-capture";
  const scrollY = window.scrollY;

  const wrapper = document.createElement("div");
  wrapper.id = "receipt-pdf-capture-root";
  wrapper.setAttribute("aria-hidden", "true");
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    width: `${CAPTURE_WIDTH_PX}px`,
    margin: "0",
    padding: "0",
    background: "#ffffff",
    zIndex: "2147483646",
    pointerEvents: "none",
    overflow: "visible",
    height: "auto",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = captureId;
  clone.classList.add("receipt-card--capturing");
  Object.assign(clone.style, {
    width: "100%",
    maxWidth: "100%",
    boxShadow: "none",
    overflow: "visible",
    height: "auto",
    minHeight: "0",
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  await waitForImages(clone);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 80));

  const captureHeight = measureElementHeight(clone) + 32;
  wrapper.style.height = `${captureHeight}px`;

  try {
    const { default: html2canvas } = await import("html2canvas-pro");

    const scale = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1.5));

    return await html2canvas(wrapper, {
      scale,
      width: CAPTURE_WIDTH_PX,
      windowWidth: CAPTURE_WIDTH_PX,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15_000,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        const cloned = doc.getElementById(captureId);
        if (cloned) {
          cloned.classList.add("receipt-card--capturing");
        }
        const clonedWrapper = doc.getElementById("receipt-pdf-capture-root");
        if (clonedWrapper) {
          (clonedWrapper as HTMLElement).style.overflow = "visible";
          (clonedWrapper as HTMLElement).style.height = "auto";
        }
        injectCaptureStyles(doc);
      },
    });
  } finally {
    wrapper.remove();
    window.scrollTo(0, scrollY);
  }
}

/** Add full receipt image across one or more A4 pages without cropping the capture. */
function addReceiptImageToPdf(
  doc: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  margin: number,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= contentHeight) {
    doc.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
    return;
  }

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < imgHeight - 0.5) {
    if (pageIndex > 0) {
      doc.addPage();
    }
    doc.addImage(imgData, "JPEG", margin, margin - offsetY, imgWidth, imgHeight);
    offsetY += contentHeight;
    pageIndex += 1;
  }
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
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

    addReceiptImageToPdf(doc, canvas, 36);
    doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    element.classList.remove("receipt-card--capturing");
  }
}

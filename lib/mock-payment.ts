/** Client-only mock payment — no real gateway or payment APIs. */

export type MockPaymentMode = "success" | "failure";

export type MockPaymentResult =
  | { success: true; message: string }
  | { success: false; message: string };

const MODE_STORAGE_KEY = "tablebite_mock_payment_mode";
const PROCESSING_MS_MIN = 2000;
const PROCESSING_MS_MAX = 3000;

function processingDelayMs(): number {
  return (
    PROCESSING_MS_MIN +
    Math.random() * (PROCESSING_MS_MAX - PROCESSING_MS_MIN)
  );
}

export function getMockPaymentMode(): MockPaymentMode {
  if (typeof window === "undefined") return "success";
  const stored = sessionStorage.getItem(MODE_STORAGE_KEY);
  if (stored === "success" || stored === "failure") {
    return stored;
  }
  return "success";
}

export function setMockPaymentMode(mode: MockPaymentMode): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MODE_STORAGE_KEY, mode);
}

/**
 * Simulates GCash payment processing for 2–3 seconds, then returns success or failure.
 * Outcome follows the selected demo mode. Not used for pay-at-counter.
 */
export async function simulateMockPayment(
  mode: MockPaymentMode = getMockPaymentMode(),
): Promise<MockPaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, processingDelayMs()));

  if (mode === "success") {
    return {
      success: true,
      message: "Payment successful. Your order has been sent to the kitchen.",
    };
  }

  return {
    success: false,
    message:
      "Payment failed. Your card or wallet could not be charged. Please try again.",
  };
}

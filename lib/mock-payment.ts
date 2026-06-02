/** Client-only mock payment — no real gateway or payment APIs. */

export type MockPaymentMode = "random" | "success" | "failure";

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
  if (typeof window === "undefined") return "random";
  const stored = sessionStorage.getItem(MODE_STORAGE_KEY);
  if (stored === "success" || stored === "failure" || stored === "random") {
    return stored;
  }
  return "random";
}

export function setMockPaymentMode(mode: MockPaymentMode): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MODE_STORAGE_KEY, mode);
}

function resolveOutcome(mode: MockPaymentMode): boolean {
  if (mode === "success") return true;
  if (mode === "failure") return false;
  return Math.random() < 0.7;
}

/**
 * Simulates GCash payment processing for 2–3 seconds, then returns success or failure.
 * Outcome follows `mode`, session override, or ~70% random success. Not used for COD.
 */
export async function simulateMockPayment(
  mode: MockPaymentMode = getMockPaymentMode(),
): Promise<MockPaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, processingDelayMs()));

  const success = resolveOutcome(mode);

  if (success) {
    return {
      success: true,
      message: "Payment successful. Your order is confirmed.",
    };
  }

  return {
    success: false,
    message:
      "Payment failed. Your card or wallet could not be charged. Please try again.",
  };
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DeliveryDetails, PaymentMethod } from "@/lib/types";

interface CheckoutContextValue {
  cutlery: boolean;
  delivery: DeliveryDetails | null;
  paymentMethod: PaymentMethod | null;
  setCutlery: (value: boolean) => void;
  setDelivery: (details: DeliveryDetails) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clearCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

const emptyDelivery: DeliveryDetails = {
  fullName: "",
  contactNumber: "",
  address: "",
  notes: "",
};

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [cutlery, setCutlery] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const clearCheckout = useCallback(() => {
    setCutlery(false);
    setDelivery(null);
    setPaymentMethod(null);
  }, []);

  const value = useMemo(
    () => ({
      cutlery,
      delivery,
      paymentMethod,
      setCutlery,
      setDelivery,
      setPaymentMethod,
      clearCheckout,
    }),
    [cutlery, delivery, paymentMethod, clearCheckout],
  );

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) {
    throw new Error("useCheckout must be used within CheckoutProvider");
  }
  return ctx;
}

export { emptyDelivery };

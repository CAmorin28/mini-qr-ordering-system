"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CustomerDetails, PaymentMethod } from "@/types";

interface CheckoutContextValue {
  cutlery: boolean;
  customer: CustomerDetails | null;
  paymentMethod: PaymentMethod | null;
  setCutlery: (value: boolean) => void;
  setCustomer: (details: CustomerDetails) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clearCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export const emptyCustomer: CustomerDetails = {
  fullName: "",
  contactNumber: "",
  notes: "",
  orderType: "dine_in",
  tableLetter: "",
};

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [cutlery, setCutlery] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const clearCheckout = useCallback(() => {
    setCutlery(false);
    setCustomer(null);
    setPaymentMethod(null);
  }, []);

  const value = useMemo(
    () => ({
      cutlery,
      customer,
      paymentMethod,
      setCutlery,
      setCustomer,
      setPaymentMethod,
      clearCheckout,
    }),
    [cutlery, customer, paymentMethod, clearCheckout],
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

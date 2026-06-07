import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Admin — TableBite",
  description: "Manage orders and payment status",
};

export default function AdminPage() {
  return <AdminApp />;
}

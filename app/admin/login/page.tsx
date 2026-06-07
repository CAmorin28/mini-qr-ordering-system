import type { Metadata } from "next";
import { AdminLoginPage } from "@/components/admin/AdminLoginPage";

export const metadata: Metadata = {
  title: "Admin sign in — TableBite",
  description: "Staff login for the TableBite admin dashboard",
};

export default function AdminLoginRoute() {
  return <AdminLoginPage />;
}

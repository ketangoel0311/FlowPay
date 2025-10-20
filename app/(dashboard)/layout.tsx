"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const computeTitle = (path: string) => {
    if (path === "/")                       return "Dashboard";
    if (path === "/accounts")               return "Accounts";
    if (path === "/transactions")           return "Transactions";
    if (path.startsWith("/transactions/"))  return "Transaction Details";
    if (path === "/transfer")               return "Transfer";
    if (path === "/connect-bank")           return "Connect Bank Accounts";
    return "Dashboard";
  };

  const title = computeTitle(pathname || "/");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-6">
          <Header title={title} />
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

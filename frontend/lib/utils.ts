import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function mapTransferLabel(type: string, category?: string) {
  if (category === "Transfer") {
    if (type === "income") return "Credit Received";
    if (type === "expense") return "Self Account Debit";
  }
  if (type === "income") return "Income";
  if (type === "expense") return "Expense";
  return "Transfer";
}

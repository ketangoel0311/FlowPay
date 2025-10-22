"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowLeftRight, ArrowDownLeft, Download, Share2, CheckCircle, Loader2, ArrowUpRight } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface Transaction {
  _id: string;
  description: string;
  category: string;
  recipientName: string;
  amount: number;
  type: string;
  status: string;
  reference?: string;
  createdAt: string;
}

const getDirectionIcon = (type: string) => {
  if (type === "income")  return { icon: ArrowDownLeft, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" };
  if (type === "expense") return { icon: ArrowUpRight,  iconBg: "bg-rose-100",    iconColor: "text-rose-600"    };
  return { icon: ArrowLeftRight, iconBg: "bg-violet-100", iconColor: "text-violet-600" };
};

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const data = await api.getTransaction(id);
        setTransaction(data);
      } catch (error) {
        setTransaction(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransaction();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/transactions" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Transactions
        </Link>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">Transaction not found.</CardContent>
        </Card>
      </div>
    );
  }

  const { icon: Icon, iconBg, iconColor } = getDirectionIcon(transaction.type);
  const isIncome = transaction.type === "income";
  const displayAmount = isIncome ? transaction.amount : Math.abs(transaction.amount);
  const dateStr = transaction.createdAt ? format(new Date(transaction.createdAt), "MMM d, yyyy") : "—";
  const timeStr = transaction.createdAt ? format(new Date(transaction.createdAt), "h:mm a") : "—";

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/transactions" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Transactions
      </Link>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className={cn("mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full", iconBg)}>
              <Icon className={cn("h-10 w-10", iconColor)} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">{transaction.description}</h2>
            <p className="text-muted-foreground">{transaction.recipientName || "—"}</p>
            <p className={cn("text-4xl font-bold mt-4", isIncome ? "text-emerald-500" : "text-foreground")}>
              {isIncome ? "+" : "-"}{formatINR(displayAmount)}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mb-8">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <span className="text-emerald-500 font-medium capitalize">{transaction.status || "Completed"}</span>
          </div>
          <div className="space-y-4 border-t pt-6">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Transaction Type</span>
              <span className="font-medium text-foreground capitalize">{transaction.type}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{dateStr}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium text-foreground">{timeStr}</span>
            </div>
            {transaction.reference && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Reference Number</span>
                <span className="font-medium text-foreground font-mono">{transaction.reference}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-8">
            <Button variant="outline" className="flex-1 gap-2 bg-transparent"><Download className="h-4 w-4" /> Download</Button>
            <Button variant="outline" className="flex-1 gap-2 bg-transparent"><Share2 className="h-4 w-4" /> Share</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

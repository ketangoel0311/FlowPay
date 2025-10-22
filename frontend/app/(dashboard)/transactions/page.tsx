"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatINR, mapTransferLabel } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  status?: "completed" | "pending" | "failed";
  transferId?: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await api.getTransactions({ limit: 10, page: 1 });
      setTransactions(data.transactions || []);
      const pages = data.pagination?.pages ?? 1;
      const currentPage = data.pagination?.page ?? 1;
      setHasMore(currentPage < pages);
      setPage(currentPage);
      setIsLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>All Transactions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No transactions yet. Your transfers will appear here.</div>
          ) : (
            <>
              <div className="space-y-2">
                {transactions.map((t) => {
                  const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
                  const isIncome = t.type === "income";
                  const isExpense = t.type === "expense";
                  const status = t.status === "pending" ? "Pending" : t.status === "failed" ? "Failed" : "Completed";
                  const shortRef = t.transferId ? t.transferId.slice(-8) : undefined;
                  return (
                    <div key={t._id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3 flex-1">
                        {isIncome ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /></div>
                        ) : isExpense ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100"><ArrowUpRight className="h-4 w-4 text-rose-600" /></div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{t.description || mapTransferLabel(t.type, (t as any).category)}</p>
                          <p className="text-xs text-muted-foreground">{status}{shortRef ? ` · Ref: ${shortRef}` : ""}</p>
                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={isIncome ? "text-emerald-600 font-semibold" : isExpense ? "text-rose-600 font-semibold" : "text-foreground font-semibold"}>
                          {sign}{formatINR(Math.abs(t.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="pt-2">
                  <Button variant="outline" className="w-full" onClick={async () => {
                    const next = page + 1;
                    const data = await api.getTransactions({ limit: 10, page: next });
                    const items: Transaction[] = data.transactions || [];
                    setTransactions((prev) => [...prev, ...items]);
                    const pages = data.pagination?.pages ?? next;
                    setHasMore(next < pages);
                    setPage(next);
                  }}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

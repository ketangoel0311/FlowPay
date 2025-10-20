"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatINR, mapTransferLabel } from "@/lib/utils";

const DoughnutChart = dynamic(() => import("../../components/dashboard/DoughnutChart"), { ssr: false });

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [displayBalance, setDisplayBalance] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [accRes, txRes, userRes] = await Promise.all([
          api.getAccounts(),
          api.getRecentTransactions(),
          api.getProfile(),
        ]);
        const accs: any[] = accRes?.accounts || [];
        setAccounts(accs);
        setTransactions(txRes || []);
        setName(userRes?.name || "");
        const sum = typeof accRes?.totalBalance === "number" ? accRes.totalBalance : accs.reduce((s, a) => s + (a.balance ?? a.currentBalance ?? 0), 0);
        setTotalBalance(sum);
      } catch (e) {
        setAccounts([]);
        setTransactions([]);
        setName("");
        setTotalBalance(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    let skipNextPoll = false;
    const startPolling = () => {
      if (interval) return;
      interval = window.setInterval(async () => {
        if (skipNextPoll) { skipNextPoll = false; return; }
        try {
          const accRes = await api.getAccounts();
          const accs: any[] = accRes?.accounts || [];
          setAccounts(accs);
          const sum = typeof accRes?.totalBalance === "number" ? accRes.totalBalance : accs.reduce((s, a) => s + (a.balance ?? a.currentBalance ?? 0), 0);
          setTotalBalance(sum);
        } catch {}
      }, 6000);
    };
    const stopPolling = () => { if (interval) { window.clearInterval(interval); interval = null; } };
    const handleVisibilityChange = () => { if (document.hidden) stopPolling(); else startPolling(); };
    const handleConfirmed = () => { skipNextPoll = true; };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("finance:transfer-confirmed", handleConfirmed as any);
    startPolling();
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("finance:transfer-confirmed", handleConfirmed as any);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const duration = 400;
    let start = 0;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplayBalance(totalBalance * progress);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loading, totalBalance]);

  return (
    <div className="space-y-5">
      {!!name && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-lg font-medium">Welcome, {name}</p>
            <p className="text-sm text-muted-foreground mt-1">Your money, all in one place</p>
          </CardContent>
        </Card>
      )}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Total Account Balance</CardTitle></CardHeader>
        <CardContent className="px-6 py-8">
          <div className="flex justify-center items-center">
            {loading ? (
              <div className="flex items-center gap-8">
                <div className="h-44 w-44 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts linked yet</p>
            ) : (
              <div className="flex items-center gap-8">
                <div className="relative h-44 w-44">
                  <DoughnutChart accounts={accounts.map((a) => ({ name: a.name, currentBalance: a.balance ?? a.currentBalance ?? 0 }))} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold">{formatINR(Math.round(displayBalance))}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Updated</p>
                  <p className="text-sm font-medium">{formatDistanceToNow(new Date(), { addSuffix: true })}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent transactions</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t: any) => {
                const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
                const isIncome = t.type === "income";
                const isExpense = t.type === "expense";
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
                        <p className="font-medium text-foreground">{t.description || mapTransferLabel(t)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}{" "}
                          {shortRef ? `· Ref: ${shortRef}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={isIncome ? "text-emerald-600 font-semibold" : isExpense ? "text-rose-600 font-semibold" : "text-foreground font-semibold"}>
                        {sign}{formatINR(Math.abs(t.amount))}
                      </p>
                      <Link href={`/transactions/${t._id}`} className="text-xs text-muted-foreground underline">View</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

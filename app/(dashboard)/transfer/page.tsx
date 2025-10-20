"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Account {
  _id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  balance: number;
  currentBalance?: number;
}

export default function TransferPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [receiverShareableId, setReceiverShareableId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.getAccounts().then((res) => setAccounts(res.accounts || []));
  }, []);

  const selectedAccount = accounts.find((a) => a._id === sourceAccountId);
  const availableBalance = selectedAccount?.balance ?? selectedAccount?.currentBalance ?? 0;
  const isAmountInvalid = !amount || Number(amount) <= 0 || Number(amount) > availableBalance;

  const resetTransferForm = () => {
    setAmount("");
    setSourceAccountId("");
    setReceiverShareableId("");
    setNote("");
    setLoading(false);
    setSuccess(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTransfer = async () => {
    const amt = Number(amount);
    if (!sourceAccountId || !receiverShareableId || !amount) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    if (isAmountInvalid) return;
    setLoading(true);
    try {
      await api.internalTransfer({ sourceAccountId, receiverShareableId, amount: amt, note: note || undefined });
      const updated = await api.getAccounts();
      setAccounts(updated.accounts || []);
      setSuccess(true);
      toast({ title: "Transfer successful" });
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6">
      {success && (
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><Check className="h-6 w-6 text-emerald-600" /></div>
              <div>
                <p className="font-medium">Transfer Completed</p>
                <p className="text-sm text-muted-foreground">Balances updated. You can make another transfer.</p>
              </div>
            </div>
            <Button variant="outline" onClick={resetTransferForm}>Make Another</Button>
          </CardContent>
        </Card>
      )}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-0"><CardTitle>Transfer Funds</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Account</label>
            <select className="w-full border rounded-md p-2.5 focus:ring-1 focus:ring-primary/40 focus:border-primary/40" value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)}>
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>{acc.bankName} {acc.accountType?.toUpperCase()} ••••{acc.accountNumber?.slice(-4)}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {sourceAccountId ? `Available balance: ${formatINR(accounts.find((a) => a._id === sourceAccountId)?.balance ?? 0)}` : "Choose an account to see available balance"}
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Account ID</label>
            <Input type="text" placeholder="plaid-account-id" value={receiverShareableId} onChange={(e) => setReceiverShareableId(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ask the recipient to share their account ID</p>
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-16 text-3xl font-bold text-center tracking-wide" />
            <p className="text-xs text-muted-foreground text-center">Amount in USD</p>
            {Number(amount) > availableBalance && <p className="text-sm text-muted-foreground mt-1">Amount exceeds available balance.</p>}
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (optional)</label>
            <Input type="text" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button className="w-full h-12 text-base font-semibold shadow-md" onClick={handleTransfer} disabled={isAmountInvalid || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Review & Send"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

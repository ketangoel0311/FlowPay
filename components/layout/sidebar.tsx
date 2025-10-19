"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Receipt, CreditCard, Landmark, LogOut, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { href: "/",             label: "Dashboard",             icon: LayoutDashboard },
  { href: "/transfer",     label: "Transfer",              icon: ArrowLeftRight  },
  { href: "/transactions", label: "Transaction",           icon: Receipt         },
  { href: "/connect-bank", label: "Connect Bank Accounts", icon: Landmark        },
  { href: "/accounts",     label: "Accounts",              icon: CreditCard      },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-primary text-primary-foreground flex flex-col">
      <div className="flex items-center gap-3 p-6 pb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/10">
          <Building2 className="h-7 w-7" />
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6 space-y-1">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-4 py-5 text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}

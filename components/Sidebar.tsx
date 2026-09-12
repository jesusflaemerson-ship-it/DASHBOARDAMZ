"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "./Logo";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/pedidos", label: "Pedidos", icon: "▤" },
  { href: "/financeiro", label: "Financeiro", icon: "$" },
  { href: "/reembolsos", label: "Reembolsos", icon: "↺" },
  { href: "/estoque", label: "Estoque", icon: "▣" },
  { href: "/ia", label: "IA", icon: "✦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-[220px] shrink-0 bg-elev border-r border-bordersoft p-3 flex flex-col gap-1 min-h-screen">
      <div className="flex items-center gap-2 px-2 pb-5 pt-2">
        <div className="w-[26px] h-[26px] rounded-md overflow-hidden">
          <Logo size={26} />
        </div>
        <div>
          <div className="font-semibold text-sm">Operacional</div>
          <div className="text-[11px] text-faint">Amazon · Shopee</div>
        </div>
      </div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13.5px] ${
            pathname === item.href ? "bg-accent/15 text-accent" : "text-dim hover:bg-elev2 hover:text-text"
          }`}
        >
          <span className="w-4 text-center">{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <div className="flex-1" />
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-faint hover:bg-elev2 hover:text-text"
      >
        <span className="w-4 text-center">⎋</span> Sair
      </button>
    </div>
  );
}

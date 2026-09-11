import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { calc, fmt } from "@/lib/calc";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("data", { ascending: false });

  const list = orders || [];
  const faturamento = list.reduce((a, o) => a + Number(o.venda_bruta), 0);
  const lucroTotal = list.reduce((a, o) => a + calc(o).lucroFinal, 0);
  const margem = faturamento ? (lucroTotal / faturamento) * 100 : 0;
  const totalRecebido = list.filter((o) => o.status === "Pago").reduce((a, o) => a + Number(o.venda_bruta), 0);
  const totalPendente = list.filter((o) => o.status === "Pendente").reduce((a, o) => a + Number(o.venda_bruta), 0);
  const taxaMedia = faturamento
    ? (list.reduce((a, o) => a + Number(o.taxas_amazon), 0) / faturamento) * 100
    : 0;
  const comPrejuizo = list.filter((o) => calc(o).lucroFinal < 0);

  type Tone = "good" | "bad" | "neutral";
  const kpis: { label: string; value: string; tone: Tone; trend?: "up" | "down" }[] = [
    { label: "Faturamento bruto", value: fmt(faturamento), tone: "neutral" },
    { label: "Lucro total", value: fmt(lucroTotal), tone: lucroTotal >= 0 ? "good" : "bad", trend: lucroTotal >= 0 ? "up" : "down" },
    { label: "Margem média", value: margem.toFixed(1) + "%", tone: margem >= 0 ? "good" : "bad", trend: margem >= 0 ? "up" : "down" },
    { label: "Total de pedidos", value: String(list.length), tone: "neutral" },
    { label: "Total recebido", value: fmt(totalRecebido), tone: "good" },
    { label: "Total pendente", value: fmt(totalPendente), tone: totalPendente > 0 ? "bad" : "neutral" },
    { label: "Taxa média Amazon", value: taxaMedia.toFixed(1) + "%", tone: "neutral" },
    { label: "Pedidos com prejuízo", value: String(comPrejuizo.length), tone: comPrejuizo.length > 0 ? "bad" : "good" },
  ];

  const toneClass: Record<Tone, string> = {
    good: "text-good",
    bad: "text-bad",
    neutral: "text-text",
  };

  const toneGlow: Record<Tone, string> = {
    good: "shadow-[0_0_0_1px_rgba(51,214,159,0.15)]",
    bad: "shadow-[0_0_0_1px_rgba(255,92,114,0.15)]",
    neutral: "",
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold mb-1">Dashboard</h1>
        <p className="text-dim text-sm mb-6">Visão geral da operação</p>

        <div className="grid grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={`card ${toneGlow[k.tone]} transition-shadow hover:shadow-[0_0_0_1px_rgba(109,91,255,0.25)]`}>

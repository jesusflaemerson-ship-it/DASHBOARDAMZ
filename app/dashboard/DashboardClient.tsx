"use client";

import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { calc, fmt, type Order } from "@/lib/calc";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type Period = "hoje" | "7" | "30" | "all";

const periodLabels: Record<Period, string> = {
  hoje: "Hoje",
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  all: "Tudo",
};

function filterByPeriod(orders: Order[], period: Period) {
  if (period === "all") return orders;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "hoje") {
    const todayStr = today.toISOString().slice(0, 10);
    return orders.filter((o) => o.data === todayStr);
  }
  const days = period === "7" ? 7 : 30;
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  return orders.filter((o) => new Date(o.data + "T00:00:00") >= cutoff);
}

export default function DashboardClient({ orders }: { orders: Order[] }) {
  const [period, setPeriod] = useState<Period>("30");
  const filtered = useMemo(() => filterByPeriod(orders, period), [orders, period]);

  const faturamento = filtered.reduce((a, o) => a + Number(o.venda_bruta), 0);
  const lucroTotal = filtered.reduce((a, o) => a + calc(o).lucroFinal, 0);
  const margem = faturamento ? (lucroTotal / faturamento) * 100 : 0;
  const totalRecebido = filtered.filter((o) => o.status === "Pago").reduce((a, o) => a + Number(o.venda_bruta), 0);
  const totalPendente = filtered.filter((o) => o.status === "Pendente").reduce((a, o) => a + Number(o.venda_bruta), 0);
  const taxaMedia = faturamento
    ? (filtered.reduce((a, o) => a + Number(o.taxas_amazon), 0) / faturamento) * 100
    : 0;
  const comPrejuizo = filtered.filter((o) => calc(o).lucroFinal < 0);

  type Tone = "good" | "bad" | "neutral";
  const kpis: { label: string; value: string; tone: Tone; trend?: "up" | "down" }[] = [
    { label: "Faturamento bruto", value: fmt(faturamento), tone: "neutral" },
    { label: "Lucro total", value: fmt(lucroTotal), tone: lucroTotal >= 0 ? "good" : "bad", trend: lucroTotal >= 0 ? "up" : "down" },
    { label: "Margem média", value: margem.toFixed(1) + "%", tone: margem >= 0 ? "good" : "bad", trend: margem >= 0 ? "up" : "down" },
    { label: "Total de pedidos", value: String(filtered.length), tone: "neutral" },
    { label: "Total recebido", value: fmt(totalRecebido), tone: "good" },
    { label: "Total pendente", value: fmt(totalPendente), tone: totalPendente > 0 ? "bad" : "neutral" },
    { label: "Taxa média Amazon", value: taxaMedia.toFixed(1) + "%", tone: "neutral" },
    { label: "Pedidos com prejuízo", value: String(comPrejuizo.length), tone: comPrejuizo.length > 0 ? "bad" : "good" },
  ];

  const toneClass: Record<Tone, string> = { good: "text-good", bad: "text-bad", neutral: "text-text" };
  const toneGlow: Record<Tone, string> = {
    good: "shadow-[0_0_0_1px_rgba(51,214,159,0.15)]",
    bad: "shadow-[0_0_0_1px_rgba(255,92,114,0.15)]",
    neutral: "",
  };

  // Dados do gráfico: lucro por dia, dentro do período filtrado
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    filtered.forEach((o) => {
      byDate[o.data] = (byDate[o.data] || 0) + calc(o).lucroFinal;
    });
    const dates = Object.keys(byDate).sort();
    return {
      labels: dates.map((d) => {
        const [, m, day] = d.split("-");
        return `${day}/${m}`;
      }),
      values: dates.map((d) => byDate[d]),
    };
  }, [filtered]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Dashboard</h1>
          <p className="text-dim text-sm">Visão geral da operação</p>
        </div>
        <select
          className="input w-auto"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <option key={p} value={p}>
              {periodLabels[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`card ${toneGlow[k.tone]} transition-shadow hover:shadow-[0_0_0_1px_rgba(109,91,255,0.25)]`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-dim">{k.label}</div>
              {k.trend && (
                <span className={`text-xs ${k.trend === "up" ? "text-good" : "text-bad"}`}>
                  {k.trend === "up" ? "▲" : "▼"}
                </span>
              )}
            </div>
            <div className={`text-3xl font-bold mono tracking-tight ${toneClass[k.tone]}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <div className="text-xs text-dim mb-3">Lucro por dia — {periodLabels[period]}</div>
        {chartData.labels.length === 0 ? (
          <div className="text-faint text-sm py-10 text-center">Sem dados nesse período.</div>
        ) : (
          <Line
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  data: chartData.values,
                  borderColor: "#6d5bff",
                  backgroundColor: "rgba(109,91,255,0.15)",
                  fill: true,
                  tension: 0.35,
                  pointRadius: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, ticks: { color: "#9498a6" } },
                y: { grid: { color: "#1a1d26" }, ticks: { color: "#9498a6" } },
              },
            }}
            height={80}
          />
        )}
      </div>

      <h2 className="text-sm font-semibold mt-8 mb-3">Pedidos com prejuízo</h2>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-elev2 text-faint text-xs uppercase">
            <tr>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Pedido</th>
              <th className="text-left p-3">Produto</th>
              <th className="text-left p-3">Venda</th>
              <th className="text-left p-3">Lucro Final</th>
            </tr>
          </thead>
          <tbody>
            {comPrejuizo.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-faint">
                  Nenhum pedido com prejuízo 🎉
                </td>
              </tr>
            )}
            {comPrejuizo.map((o) => (
              <tr key={o.id} className="border-t border-bordersoft">
                <td className="p-3">{o.data}</td>
                <td className="p-3 mono">{o.pedido}</td>
                <td className="p-3">{o.produto}</td>
                <td className="p-3 mono">{fmt(Number(o.venda_bruta))}</td>
                <td className="p-3 mono neg font-semibold">{fmt(calc(o).lucroFinal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

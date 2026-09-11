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

  const kpis = [
    { label: "Faturamento bruto", value: fmt(faturamento) },
    { label: "Lucro total", value: fmt(lucroTotal) },
    { label: "Margem média", value: margem.toFixed(1) + "%" },
    { label: "Total de pedidos", value: String(list.length) },
    { label: "Total recebido", value: fmt(totalRecebido) },
    { label: "Total pendente", value: fmt(totalPendente) },
    { label: "Taxa média Amazon", value: taxaMedia.toFixed(1) + "%" },
    { label: "Pedidos com prejuízo", value: String(comPrejuizo.length) },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold mb-1">Dashboard</h1>
        <p className="text-dim text-sm mb-6">Visão geral da operação</p>

        <div className="grid grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="card">
              <div className="text-xs text-dim mb-2">{k.label}</div>
              <div className="text-2xl font-semibold mono">{k.value}</div>
            </div>
          ))}
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
                <tr><td colSpan={5} className="p-6 text-center text-faint">Nenhum pedido com prejuízo 🎉</td></tr>
              )}
              {comPrejuizo.map((o) => (
                <tr key={o.id} className="border-t border-bordersoft">
                  <td className="p-3">{o.data}</td>
                  <td className="p-3 mono">{o.pedido}</td>
                  <td className="p-3">{o.produto}</td>
                  <td className="p-3 mono">{fmt(Number(o.venda_bruta))}</td>
                  <td className="p-3 mono neg">{fmt(calc(o).lucroFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { calc, fmt } from "@/lib/calc";

export default function FinanceiroPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), descricao: "", categoria: "Operacional", valor: "" });
  const [showModal, setShowModal] = useState(false);

  async function load() {
    const { data: o } = await supabase.from("orders").select("*");
    const { data: e } = await supabase.from("expenses").select("*").order("data", { ascending: false });
    setOrders(o || []);
    setExpenses(e || []);
  }

  useEffect(() => { load(); }, []);

  const lucroLiquido = orders.reduce((a, o) => a + calc(o).lucroFinal, 0);
  const despesas = expenses.reduce((a, e) => a + Number(e.valor), 0);
  const caixaAcumulado = lucroLiquido - despesas;
  const faturamento = orders.reduce((a, o) => a + Number(o.venda_bruta), 0);
  const custoTotal = orders.reduce((a, o) => a + Number(o.custo), 0);
  const roi = custoTotal ? (lucroLiquido / custoTotal) * 100 : 0;
  const margem = faturamento ? (lucroLiquido / faturamento) * 100 : 0;

  const kpis = [
    { label: "Lucro líquido", value: fmt(lucroLiquido) },
    { label: "Caixa acumulado", value: fmt(caixaAcumulado) },
    { label: "Despesas totais", value: fmt(despesas) },
    { label: "ROI", value: roi.toFixed(1) + "%" },
    { label: "Margem", value: margem.toFixed(1) + "%" },
    { label: "Faturamento bruto", value: fmt(faturamento) },
    { label: "Custo total", value: fmt(custoTotal) },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("expenses").insert({
      data: form.data,
      descricao: form.descricao,
      categoria: form.categoria,
      valor: parseFloat(form.valor) || 0,
      user_id: userData.user?.id,
    });
    setShowModal(false);
    setForm({ data: new Date().toISOString().slice(0, 10), descricao: "", categoria: "Operacional", valor: "" });
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold">Financeiro</h1>
            <p className="text-dim text-sm">Caixa, despesas e resultado</p>
          </div>
          <button className="btn" onClick={() => setShowModal(true)}>+ Nova despesa</button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {kpis.map((k) => (
            <div key={k.label} className="card">
              <div className="text-xs text-dim mb-2">{k.label}</div>
              <div className="text-2xl font-semibold mono">{k.value}</div>
            </div>
          ))}
        </div>

        <h2 className="text-sm font-semibold mb-3">Despesas</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elev2 text-faint text-xs uppercase">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Descrição</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-left p-3">Valor</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-faint">Nenhuma despesa registrada.</td></tr>}
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-bordersoft">
                  <td className="p-3">{e.data}</td>
                  <td className="p-3">{e.descricao}</td>
                  <td className="p-3">{e.categoria}</td>
                  <td className="p-3 mono neg">{fmt(Number(e.valor))}</td>
                  <td className="p-3"><button className="text-faint hover:text-text" onClick={() => handleDelete(e.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <form className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3 className="font-semibold mb-2">Nova despesa</h3>
            <input className="input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            <input className="input" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
            <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              <option>Operacional</option><option>Marketing</option><option>Frete</option><option>Ferramentas</option><option>Outros</option>
            </select>
            <input className="input" type="number" step="0.01" placeholder="Valor (R$)" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 rounded-lg text-sm bg-elev2 border border-border" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
